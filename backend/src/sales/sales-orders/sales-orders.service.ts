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
export class SalesOrdersService {
  private readonly logger = new Logger(SalesOrdersService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create sales order
   * Can be standalone or from quotation
   */
  async create(data: {
    customerId: string;
    quotationId?: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discountPercent?: number;
    }>;
    discountPercent?: number;
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

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Sales order must have at least one item');
    }

    // Validate all products and calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const soItems = await Promise.all(
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
        customerId: data.customerId,
        quotationId: data.quotationId,
        orderDate: new Date(),
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

    // Create sales order items
    for (const item of soItems) {
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

    await this.db.documentSequence.upsert({
      where: { documentType: 'SALES_ORDER' },
      update: { currentNumber: nextNumber },
      create: { documentType: 'SALES_ORDER', prefix: 'SO', currentNumber: nextNumber, padding: 6, year: 2026, status: 'ACTIVE' },
    });

    this.logger.log(`Sales Order created: ${orderNumber}`);
    return salesOrder;
  }

  /**
   * Approve sales order (if needed)
   */
  async submit(soId: string, userId: string) {
    const so = await this.db.salesOrder.findUnique({ where: { id: soId }, include: { items: true } });
    if (!so) throw new NotFoundException(`Sales Order ${soId} not found`);
    if (!['DRAFT', 'REJECTED'].includes(so.status)) throw new BadRequestException('Only DRAFT or REJECTED orders can be submitted');
    if (!so.items.length) throw new BadRequestException('Sales order must have at least one item');
    return this.db.salesOrder.update({ where: { id: soId }, data: { status: 'SUBMITTED' }, include: { customer: true, items: { include: { product: true } } } });
  }

  async approve(soId: string, userId: string) {
    const so = await this.db.salesOrder.findUnique({
      where: { id: soId },
    });

    if (!so) {
      throw new NotFoundException(`Sales Order ${soId} not found`);
    }

    if (so.status !== 'SUBMITTED') {
      throw new BadRequestException(`Only SUBMITTED orders can be approved`);
    }

    return this.db.salesOrder.update({
      where: { id: soId },
      data: {
        status: 'CONFIRMED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  async reject(soId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('A rejection reason is required');
    const so = await this.db.salesOrder.findUnique({ where: { id: soId } });
    if (!so) throw new NotFoundException(`Sales Order ${soId} not found`);
    if (so.status !== 'SUBMITTED') throw new BadRequestException('Only SUBMITTED orders can be rejected');
    return this.db.salesOrder.update({ where: { id: soId }, data: { status: 'REJECTED', notes: `${so.notes ?? ''}${so.notes ? '\n' : ''}Rejected: ${reason}` }, include: { customer: true, items: { include: { product: true } } } });
  }

  /**
   * Convert sales order to invoice
   */
  async convertToInvoice(soId: string, userId: string) {
    const so = await this.db.salesOrder.findUnique({
      where: { id: soId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!so) {
      throw new NotFoundException(`Sales Order ${soId} not found`);
    }

    if (!['SUBMITTED', 'DRAFT', 'CONFIRMED'].includes(so.status)) {
      throw new BadRequestException(`Sales order must be DRAFT, SUBMITTED, or CONFIRMED to convert`);
    }

    // Get next invoice number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'INVOICE' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const invoiceNumber = `INV-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create invoice
    const invoice = await this.db.invoice.create({
      data: {
        invoiceNumber,
        customerId: so.customerId,
        salesOrderId: soId,
        invoiceDate: new Date(),
        subtotal: so.subtotal,
        discountAmount: so.discountAmount,
        discountPercent: so.discountPercent,
        taxAmount: so.taxAmount,
        totalAmount: so.totalAmount,
        balance: so.totalAmount,
        amountPaid: new Prisma.Decimal(0),
        status: 'DRAFT',
        createdById: userId,
      },
      include: {
        customer: true,
      },
    });

    // Create invoice items
    for (const item of so.items) {
      await this.db.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
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

    await this.db.documentSequence.upsert({
      where: { documentType: 'INVOICE' },
      update: { currentNumber: nextNumber },
      create: { documentType: 'INVOICE', prefix: 'INV', currentNumber: nextNumber, padding: 6, year: 2026, status: 'ACTIVE' },
    });

    this.logger.log(`Invoice created from Sales Order: ${invoiceNumber}`);
    return invoice;
  }

  /**
   * Get all sales orders
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [orders, total] = await Promise.all([
      this.db.salesOrder.findMany({
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
      this.db.salesOrder.count(),
    ]);

    const ordersWithQuotation = await Promise.all(orders.map(async (order) => ({ ...order, quotation: order.quotationId ? await this.db.quotation.findUnique({ where: { id: order.quotationId }, select: { quotationNumber: true } }) : null })));
    return this.paginationService.formatPaginatedResponse(
      ordersWithQuotation,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get sales order by ID
   */
  async findById(id: string) {
    const order = await this.db.salesOrder.findUnique({
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

    if (!order) {
      throw new NotFoundException(`Sales Order ${id} not found`);
    }
    return { ...order, quotation: order.quotationId ? await this.db.quotation.findUnique({ where: { id: order.quotationId }, select: { quotationNumber: true } }) : null };
  }
}