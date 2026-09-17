import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';
import { Prisma } from '@prisma/client';
import { ApprovalsService } from '../../approvals/approvals.service.js';
import { AuditLogService } from '../../audit/audit-log.service.js';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
    private approvalsService: ApprovalsService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * Create refund
   * Refunds are separate transactions (not reversals)
   * Allows complete audit trail
   */
  async create(data: {
    customerId: string;
    paymentId: string;
    refundAmount: number;
    paymentMethodId: string;
    reason?: string;
    notes?: string;
    userId: string;
  }) {
    // Validate customer
    const customer = await this.db.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${data.customerId} not found`);
    }

    // Validate original payment
    const originalPayment = await this.db.payment.findUnique({
      where: { id: data.paymentId },
    });

    if (!originalPayment) {
      throw new NotFoundException(`Original payment ${data.paymentId} not found`);
    }

    if (data.refundAmount <= 0 || data.refundAmount > originalPayment.amount.toNumber()) {
      throw new BadRequestException(
        `Refund amount must be between 0 and ${originalPayment.amount.toNumber()}`,
      );
    }

    // Create refund as a separate payment with negative amount
    const [seq, latestRefund] = await Promise.all([
      this.db.documentSequence.findUnique({
        where: { documentType: 'REFUND' },
      }),
      this.db.payment.findFirst({
        where: { paymentNumber: { startsWith: 'RFD-' } },
        orderBy: { paymentDate: 'desc' },
        select: { paymentNumber: true },
      }),
    ]);

    const latestRefundNumber = latestRefund?.paymentNumber.match(/(\d+)$/)?.[1];
    const nextNumber = Math.max(Number(seq?.currentNumber || 0), Number(latestRefundNumber || 0)) + 1;
    const refundNumber = `RFD-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create refund record
    const refund = await this.db.payment.create({
      data: {
        paymentNumber: refundNumber,
        customerId: data.customerId,
        invoiceId: originalPayment.invoiceId,
        amount: new Prisma.Decimal(-data.refundAmount), // Negative = refund
        paymentMethodId: data.paymentMethodId,
        transactionReference: `REFUND-${data.paymentId}`,
        paymentDate: new Date(),
        notes: `${data.reason || 'Customer refund'}. ${data.notes || ''}`,
        status: 'PENDING',
        createdById: data.userId,
      },
      include: {
        customer: true,
        paymentMethod: true,
        invoice: true,
      },
    });

    // Update document sequence
    await this.db.documentSequence.upsert({
      where: { documentType: 'REFUND' },
      create: { documentType: 'REFUND', prefix: 'RFD', currentNumber: nextNumber },
      update: { currentNumber: nextNumber },
    });

    await this.auditLogService.logAction({
      entityType: 'REFUND', entityId: refund.id, action: 'CREATE',
      afterData: { paymentNumber: refundNumber, amount: data.refundAmount, status: 'PENDING' }, userId: data.userId,
    });

    this.logger.log(`Refund created: ${refundNumber}`);
    return refund;
  }

  async submitForApproval(data: { refundId: string; approverIds: string[]; notes?: string; userId: string }) {
    const refund = await this.findById(data.refundId);
    if (refund.status !== 'PENDING') throw new BadRequestException('Only pending refunds can be submitted for approval');
    return this.approvalsService.submitForApproval({ documentType: 'REFUND', documentId: data.refundId, approverIds: data.approverIds, notes: data.notes, userId: data.userId });
  }

  async approve(refundId: string, approverId: string, comments?: string) {
    const refund = await this.findById(refundId);
    if (refund.status !== 'PENDING') throw new BadRequestException('Only pending refunds can be approved');
    const pending = await this.db.approval.findMany({ where: { documentType: 'REFUND', documentId: refundId, approvalDecision: 'PENDING' }, orderBy: { approvalStep: 'asc' } });
    if (pending.length === 0) throw new BadRequestException('No pending approvals found for this refund');
    const result = await this.approvalsService.approve({ documentType: 'REFUND', documentId: refundId, approvalStep: pending[0].approvalStep, approverId, comments });
    const approvals = await this.db.approval.findMany({ where: { documentType: 'REFUND', documentId: refundId } });
    if (approvals.every((entry) => entry.approvalDecision === 'APPROVED')) await this.db.payment.update({ where: { id: refundId }, data: { status: 'RECORDED' } });
    return result;
  }

  async reject(refundId: string, approverId: string, rejectionReason: string) {
    const refund = await this.findById(refundId);
    if (refund.status !== 'PENDING') throw new BadRequestException('Only pending refunds can be rejected');
    const pending = await this.db.approval.findMany({ where: { documentType: 'REFUND', documentId: refundId, approvalDecision: 'PENDING' }, orderBy: { approvalStep: 'asc' } });
    if (pending.length === 0) throw new BadRequestException('No pending approvals found for this refund');
    const result = await this.approvalsService.reject({ documentType: 'REFUND', documentId: refundId, approvalStep: pending[0].approvalStep, approverId, rejectionReason });
    await this.db.payment.update({ where: { id: refundId }, data: { status: 'CANCELLED' } });
    return result;
  }

  /**
   * Get all refunds
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [refunds, total] = await Promise.all([
      this.db.payment.findMany({
        where: {
          paymentNumber: { startsWith: 'RFD-' },
        },
        skip,
        take,
        include: {
          customer: true,
          paymentMethod: true,
          invoice: true,
        },
        orderBy: { paymentDate: 'desc' },
      }),
      this.db.payment.count({
        where: {
          paymentNumber: { startsWith: 'RFD-' },
        },
      }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      refunds,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get refund by ID
   */
  async findById(id: string) {
    const refund = await this.db.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        paymentMethod: true,
        invoice: true,
      },
    });

    if (!refund || !refund.paymentNumber.startsWith('RFD-')) {
      throw new NotFoundException(`Refund ${id} not found`);
    }

    return refund;
  }

  /**
   * Get customer refunds
   */
  async getCustomerRefunds(customerId: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [refunds, total] = await Promise.all([
      this.db.payment.findMany({
        where: {
          customerId,
          paymentNumber: { startsWith: 'RFD-' },
        },
        skip,
        take,
        include: {
          paymentMethod: true,
          invoice: true,
        },
        orderBy: { paymentDate: 'desc' },
      }),
      this.db.payment.count({
        where: {
          customerId,
          paymentNumber: { startsWith: 'RFD-' },
        },
      }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      refunds,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }
}