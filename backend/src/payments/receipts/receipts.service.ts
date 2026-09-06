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
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Generate receipt from payment
   */
  async create(data: {
    paymentId: string;
    customerId: string;
    invoiceId?: string;
    amount: number;
    notes?: string;
    userId: string;
  }) {
    // Validate payment exists
    const payment = await this.db.payment.findUnique({
      where: { id: data.paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${data.paymentId} not found`);
    }

    // Validate customer
    const customer = await this.db.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${data.customerId} not found`);
    }

    if (data.amount <= 0) {
      throw new BadRequestException('Receipt amount must be greater than 0');
    }

    // Get next receipt number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'RECEIPT' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const receiptNumber = `RCP-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create receipt
    const receipt = await this.db.receipt.create({
      data: {
        receiptNumber,
        paymentId: data.paymentId,
        customerId: data.customerId,
        invoiceId: data.invoiceId,
        amount: new Prisma.Decimal(data.amount),
        receiptDate: new Date(),
        notes: data.notes,
        createdById: data.userId,
      },
      include: {
        payment: true,
        customer: true,
        invoice: true,
      },
    });

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'RECEIPT' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`Receipt generated: ${receiptNumber}`);
    return receipt;
  }

  /**
   * Get all receipts
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [receipts, total] = await Promise.all([
      this.db.receipt.findMany({
        skip,
        take,
        include: {
          payment: true,
          customer: true,
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.receipt.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      receipts,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get receipt by ID
   */
  async findById(id: string) {
    const receipt = await this.db.receipt.findUnique({
      where: { id },
      include: {
        payment: true,
        customer: true,
        invoice: true,
      },
    });

    if (!receipt) {
      throw new NotFoundException(`Receipt ${id} not found`);
    }

    return receipt;
  }

  /**
   * Get customer receipts
   */
  async getCustomerReceipts(customerId: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [receipts, total] = await Promise.all([
      this.db.receipt.findMany({
        where: { customerId },
        skip,
        take,
        include: {
          payment: true,
          invoice: true,
        },
        orderBy: { receiptDate: 'desc' },
      }),
      this.db.receipt.count({ where: { customerId } }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      receipts,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }
}