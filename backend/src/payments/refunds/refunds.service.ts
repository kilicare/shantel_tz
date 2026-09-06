import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
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
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'REFUND' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
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
        status: 'RECORDED',
        createdById: data.userId,
      },
      include: {
        customer: true,
        paymentMethod: true,
        invoice: true,
      },
    });

    // If invoice exists, update its balance
    if (originalPayment.invoiceId) {
      const invoice = await this.db.invoice.findUnique({
        where: { id: originalPayment.invoiceId },
      });

      if (invoice) {
        const newAmountPaid = invoice.amountPaid.toNumber() - data.refundAmount;
        const newBalance = invoice.totalAmount.toNumber() - newAmountPaid;
        const newStatus =
          newBalance <= 0
            ? 'PAID'
            : newBalance < invoice.totalAmount.toNumber()
              ? 'PARTIALLY_PAID'
              : 'ISSUED';

        await this.db.invoice.update({
          where: { id: originalPayment.invoiceId },
          data: {
            amountPaid: new Prisma.Decimal(newAmountPaid),
            balance: new Prisma.Decimal(newBalance),
            status: newStatus,
          },
        });
      }
    }

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'REFUND' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`Refund created: ${refundNumber}`);
    return refund;
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