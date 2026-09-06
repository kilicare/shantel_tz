import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create quotation
   * Optional document for new customers
   */
  async create(data: {
    customerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
    }>;
    discountPercent?: number;
    validUntil?: Date;
    notes?: string;
    userId: string;
  }) {
    // Validate customer exists
    const customer = await this.db.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${data.customerId} not found`);
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Quotation must have at least one item');
    }

    // Validate all products and calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const quotationItems = await Promise.all(
      data.items.map(async (item) => {
        const product = await this.db.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        if (item.quantity <= 0 || item.unitPrice <= 0) {
          throw new BadRequestException('Quantity and price must be greater than 0');
        }

        const lineTotal = item.quantity * item.unitPrice;
        const discount = lineTotal * ((item.discountPercent || 0) / 100);
        const taxableAmount = lineTotal - discount;
        const lineTax = taxableAmount * 0.18;

        subtotal += lineTotal;
        taxAmount += lineTax;

        return {
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          discountPercent: new Prisma.Decimal(item.discountPercent || 0),
          discountAmount: new Prisma.Decimal(discount),
          taxAmount: new Prisma.Decimal(lineTax),
          lineTotal: new Prisma.Decimal(lineTotal - discount + lineTax),
        };
      }),
    );

    const discountAmount = subtotal * ((data.discountPercent || 0) / 100);
    const totalAmount = subtotal - discountAmount + taxAmount;

    // Get next quotation number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'QUOTATION' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const quotationNumber = `QT-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create quotation
    const quotation = await this.db.quotation.create({
      data: {
        quotationNumber,
        customerId: data.customerId,
        quotationDate: new Date(),
        validUntil: data.validUntil,
        subtotal: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        discountPercent: new Prisma.Decimal(data.discountPercent || 0),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(totalAmount),
        notes: data.notes,
        status: 'DRAFT',
        createdById: data.userId,
      },
      include: {
        customer: true,
      },
    });

    // Create quotation items
    for (const item of quotationItems) {
      await this.db.quotationItem.create({
        data: {
          quotationId: quotation.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
        },
      });
    }

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'QUOTATION' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`Quotation created: ${quotationNumber}`);
    return quotation;
  }

  /**
   * Send quotation
   */
  async send(quotationId: string) {
    const quotation = await this.db.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT quotations can be sent`);
    }

    return this.db.quotation.update({
      where: { id: quotationId },
      data: { status: 'SENT' },
    });
  }

  /**
   * Mark quotation as accepted
   */
  async accept(quotationId: string) {
    const quotation = await this.db.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    if (quotation.status !== 'SENT') {
      throw new BadRequestException(`Only SENT quotations can be accepted`);
    }

    return this.db.quotation.update({
      where: { id: quotationId },
      data: { status: 'ACCEPTED' },
    });
  }

  /**
   * Convert quotation to sales order
   */
  async convertToSalesOrder(quotationId: string, userId: string) {
    const quotation = await this.db.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    if (quotation.status !== 'ACCEPTED' && quotation.status !== 'DRAFT') {
      throw new BadRequestException(`Quotation must be DRAFT or ACCEPTED to convert`);
    }

    // Get next sales order number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'SALES_ORDER' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const orderNumber = `SO-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create sales order
    const salesOrder = await this.db.salesOrder.create({
      data: {
        orderNumber,
        customerId: quotation.customerId,
        quotationId: quotationId,
        orderDate: new Date(),
        subtotal: quotation.subtotal,
        discountAmount: quotation.discountAmount,
        discountPercent: quotation.discountPercent,
        taxAmount: quotation.taxAmount,
        totalAmount: quotation.totalAmount,
        status: 'DRAFT',
        createdById: userId,
      },
      include: {
        customer: true,
      },
    });

    // Create sales order items
    for (const item of quotation.items) {
      await this.db.salesOrderItem.create({
        data: {
          salesOrderId: salesOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
        },
      });
    }

    // Update quotation status
    await this.db.quotation.update({
      where: { id: quotationId },
      data: { status: 'CONVERTED' },
    });

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'SALES_ORDER' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`Sales Order created from Quotation: ${orderNumber}`);
    return salesOrder;
  }

  /**
   * Get all quotations
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [quotations, total] = await Promise.all([
      this.db.quotation.findMany({
        skip,
        take,
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.quotation.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      quotations,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get quotation by ID
   */
  async findById(id: string) {
    const quotation = await this.db.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    return quotation;
  }

  /**
   * Search quotations
   */
  async search(query: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [quotations, total] = await Promise.all([
      this.db.quotation.findMany({
        where: {
          OR: [
            { quotationNumber: { contains: query, mode: 'insensitive' } },
            { customer: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        skip,
        take,
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      this.db.quotation.count({
        where: {
          OR: [
            { quotationNumber: { contains: query, mode: 'insensitive' } },
            { customer: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
      }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      quotations,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }
}