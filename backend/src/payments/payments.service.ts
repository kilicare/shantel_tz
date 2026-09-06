import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PaginationService, PaginationParams } from '../shared/services/pagination.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
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

    // If invoice specified, validate it
    if (data.invoiceId) {
      const invoice = await this.db.invoice.findUnique({
        where: { id: data.invoiceId },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice ${data.invoiceId} not found`);
      }

      if (invoice.status === 'DRAFT') {
        throw new BadRequestException(`Cannot record payment for DRAFT invoice`);
      }
    }

    // Get next payment number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'PAYMENT' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const paymentNumber = `PAY-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create payment (RECORDED status)
    const payment = await this.db.payment.create({
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
      include: {
        customer: true,
        paymentMethod: true,
      },
    });

    // If invoice specified, update its balance
    if (data.invoiceId) {
      const invoice = await this.db.invoice.findUnique({
        where: { id: data.invoiceId },
      });

      if (invoice) {
        const newAmountPaid = invoice.amountPaid.toNumber() + data.amount;
        const newBalance = invoice.totalAmount.toNumber() - newAmountPaid;
        const newStatus =
          newBalance <= 0
            ? 'PAID'
            : newBalance < invoice.totalAmount.toNumber()
              ? 'PARTIALLY_PAID'
              : 'ISSUED';

        await this.db.invoice.update({
          where: { id: data.invoiceId },
          data: {
            amountPaid: new Prisma.Decimal(newAmountPaid),
            balance: new Prisma.Decimal(Math.max(0, newBalance)),
            status: newStatus,
          },
        });
      }
    }

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'PAYMENT' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`Payment recorded: ${paymentNumber}`);
    return payment;
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

    return this.db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'POSTED',
        postedById: userId,
        postedAt: new Date(),
      },
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