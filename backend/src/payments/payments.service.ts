import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PaginationService, PaginationParams } from '../shared/services/pagination.service.js';
import { Prisma } from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * Record customer payment (for invoice)
   * Supports partial, full, and advance payments
   */
  async recordCustomerPayment(data: {
    customerId: string;
    invoiceId?: string;
    amount: number;
    paymentMethodId: string;
    transactionReference?: string;
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

    if (data.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Validate payment method
    const paymentMethod = await this.db.paymentMethod.findUnique({
      where: { id: data.paymentMethodId },
    });

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method ${data.paymentMethodId} not found`);
    }

    return this.db.$transaction(async (tx) => {
      let invoice: { id: string; totalAmount: Prisma.Decimal; status: string } | null = null;
      let netAmountPaid = 0;

      if (data.invoiceId) {
        invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
        if (!invoice) throw new NotFoundException(`Invoice ${data.invoiceId} not found`);
        if (invoice.status === 'DRAFT') throw new BadRequestException(`Cannot record payment for DRAFT invoice`);

        const paymentLedger = await tx.payment.findMany({
          where: { invoiceId: data.invoiceId, status: { not: 'CANCELLED' } },
          select: { amount: true },
        });
        netAmountPaid = paymentLedger.reduce((sum, entry) => sum + entry.amount.toNumber(), 0);
        const currentBalance = invoice.totalAmount.toNumber() - netAmountPaid;
        if (data.amount > currentBalance) {
          throw new BadRequestException(`Payment amount cannot exceed the invoice balance of ${currentBalance}`);
        }
      }

      const seq = await tx.documentSequence.findUnique({ where: { documentType: 'PAYMENT' } });
      const latestPayment = await tx.payment.findFirst({ orderBy: { paymentNumber: 'desc' }, select: { paymentNumber: true } });
      const latestNumber = Number(latestPayment?.paymentNumber.split('-').pop() || 0);
      const nextNumber = Math.max(Number(seq?.currentNumber || 0), latestNumber) + 1;
      const paymentNumber = `PAY-2026-${String(nextNumber).padStart(6, '0')}`;

      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          customerId: data.customerId,
          invoiceId: data.invoiceId,
          amount: new Prisma.Decimal(data.amount),
          paymentMethodId: data.paymentMethodId,
          transactionReference: data.transactionReference,
          paymentDate: new Date(),
          notes: data.notes,
          status: 'RECORDED',
          createdById: data.userId,
        },
        include: { customer: true, paymentMethod: true },
      });

      if (invoice && data.invoiceId) {
        const newNetAmountPaid = netAmountPaid + data.amount;
        const newBalance = invoice.totalAmount.toNumber() - newNetAmountPaid;
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: {
            amountPaid: new Prisma.Decimal(newNetAmountPaid),
            balance: new Prisma.Decimal(newBalance),
            status: newBalance <= 0 ? 'PAID' : newBalance < invoice.totalAmount.toNumber() ? 'PARTIALLY_PAID' : 'ISSUED',
          },
        });
      }

      await tx.documentSequence.upsert({
        where: { documentType: 'PAYMENT' },
        update: { currentNumber: nextNumber },
        create: { documentType: 'PAYMENT', prefix: 'PAY', currentNumber: nextNumber, padding: 6, year: 2026, status: 'ACTIVE' },
      });

      await this.auditLogService.logAction({
        entityType: 'PAYMENT', entityId: payment.id, action: 'CREATE',
        afterData: { paymentNumber, amount: data.amount, invoiceId: data.invoiceId }, userId: data.userId,
      });

      this.logger.log(`Payment recorded: ${paymentNumber}`);
      return payment;
    });
  }

  /**
   * Record supplier payment
   */
  async recordSupplierPayment(data: {
    supplierId: string;
    poId?: string;
    amount: number;
    paymentMethodId: string;
    transactionReference?: string;
    notes?: string;
    userId: string;
  }) {
    // Validate supplier
    const supplier = await this.db.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier ${data.supplierId} not found`);
    }

    if (data.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Get next payment number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'SUPPLIER_PAYMENT' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const paymentNumber = `SP-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create supplier payment
    const payment = await this.db.payment.create({
      data: {
        paymentNumber,
        customerId: data.supplierId, // Using customerId field for supplier temporarily
        amount: new Prisma.Decimal(data.amount),
        paymentMethodId: data.paymentMethodId,
        transactionReference: data.transactionReference,
        paymentDate: new Date(),
        notes: data.notes,
        status: 'RECORDED',
        createdById: data.userId,
      },
    });

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'SUPPLIER_PAYMENT' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`Supplier payment recorded: ${paymentNumber}`);
    return payment;
  }

  /**
   * Post payment (official recording)
   */
  async post(paymentId: string, userId: string) {
    const payment = await this.db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== 'RECORDED') {
      throw new BadRequestException(`Only RECORDED payments can be posted`);
    }

    return this.db.$transaction(async (tx) => {
      const postedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'POSTED', postedById: userId, postedAt: new Date() },
      });

      await this.auditLogService.logAction({
        entityType: postedPayment.amount.isNegative() ? 'REFUND' : 'PAYMENT', entityId: paymentId, action: 'POST',
        beforeData: { status: payment.status }, afterData: { status: 'POSTED' }, userId,
      });

      if (postedPayment.amount.isNegative() && postedPayment.invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: postedPayment.invoiceId } });
        if (invoice) {
          const paymentLedger = await tx.payment.findMany({
            where: { invoiceId: postedPayment.invoiceId, status: { not: 'CANCELLED' } },
            select: { amount: true },
          });
          const netAmountPaid = paymentLedger.reduce((sum, entry) => sum + entry.amount.toNumber(), 0);
          const balance = Math.max(0, invoice.totalAmount.toNumber() - netAmountPaid);
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: new Prisma.Decimal(netAmountPaid),
              balance: new Prisma.Decimal(balance),
              status: balance <= 0 ? 'PAID' : balance < invoice.totalAmount.toNumber() ? 'PARTIALLY_PAID' : 'ISSUED',
            },
          });
        }
      }

      return postedPayment;
    });
  }

  /**
   * Get all payments
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [payments, total] = await Promise.all([
      this.db.payment.findMany({
        skip,
        take,
        include: {
          customer: true,
          paymentMethod: true,
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.payment.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      payments,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get payment by ID
   */
  async findById(id: string) {
    const payment = await this.db.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        paymentMethod: true,
        invoice: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return payment;
  }

  /**
   * Get customer payments
   */
  async getCustomerPayments(customerId: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [payments, total] = await Promise.all([
      this.db.payment.findMany({
        where: { customerId },
        skip,
        take,
        include: {
          paymentMethod: true,
          invoice: true,
        },
        orderBy: { paymentDate: 'desc' },
      }),
      this.db.payment.count({ where: { customerId } }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      payments,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }
}