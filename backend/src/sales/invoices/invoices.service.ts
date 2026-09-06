import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
    private configService: ConfigService,
  ) {}

  /**
   * Create invoice
   * Can be from sales order or direct invoice (cash sales)
   * NO STOCK DEDUCTION AT THIS STAGE - ONLY AT POST
   */
  async create(data: {
    customerId: string;
    salesOrderId?: string;
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
      throw new BadRequestException('Invoice must have at least one item');
    }

    // Validate all products exist and calculate totals
    // BUT DO NOT DEDUCT STOCK YET
    let subtotal = 0;
    let taxAmount = 0;

    const invoiceItems = await Promise.all(
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

    // Get next invoice number
    const [seq, latestInvoice] = await Promise.all([
      this.db.documentSequence.findUnique({
        where: { documentType: 'INVOICE' },
      }),
      this.db.invoice.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      }),
    ]);

    const latestInvoiceNumber = latestInvoice?.invoiceNumber.match(/(\d+)$/)?.[1];
    const nextNumber = Math.max(
      Number(seq?.currentNumber || 0),
      Number(latestInvoiceNumber || 0),
    ) + 1;
    const invoiceNumber = `INV-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create invoice (DRAFT status - NO STOCK CHANGE)
    const invoice = await this.db.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        salesOrderId: data.salesOrderId,
        invoiceDate: new Date(),
        subtotal: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        discountPercent: new Prisma.Decimal(data.discountPercent || 0),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(totalAmount),
        amountPaid: new Prisma.Decimal(0),
        balance: new Prisma.Decimal(totalAmount),
        notes: data.notes,
        status: 'DRAFT',
        createdById: data.userId,
      },
      include: {
        customer: true,
      },
    });

    // Create invoice items
    for (const item of invoiceItems) {
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

    // Keep numbering safe even when a fresh database has no sequence row yet.
    await this.db.documentSequence.upsert({
      where: { documentType: 'INVOICE' },
      create: { documentType: 'INVOICE', prefix: 'INV', currentNumber: nextNumber },
      update: { currentNumber: nextNumber },
    });

    this.logger.log(`Invoice created: ${invoiceNumber} (DRAFT - No stock change)`);
    return invoice;
  }

  /**
   * POST INVOICE - CRITICAL OPERATION
   * This is where stock is DEDUCTED (ATOMIC TRANSACTION)
   * Validate stock before posting
   * Deduct stock on successful post
   */
  async post(invoiceId: string, locationId: string, userId: string) {
    const invoice = await this.db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT invoices can be posted`);
    }

    // Validate location exists
    const location = await this.db.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    // VALIDATE STOCK BEFORE POSTING
    const allowNegativeStock = this.configService.get('features.allowNegativeStock');

    for (const item of invoice.items) {
      // Get current stock
      const stockBalance = await this.db.stockBalance.findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId,
          },
        },
      });

      const currentStock = stockBalance?.quantity.toNumber() || 0;
      const requiredQuantity = item.quantity.toNumber();

      // Check if sufficient stock
      if (!allowNegativeStock && currentStock < requiredQuantity) {
        const product = await this.db.product.findUnique({
          where: { id: item.productId },
        });

        this.logger.warn(
          `Insufficient stock for invoice: ${invoice.invoiceNumber}, Product: ${product?.name}, Available: ${currentStock}, Required: ${requiredQuantity}`,
        );

        throw new BadRequestException(
          `Insufficient stock for ${product?.name}. Available: ${currentStock}, Required: ${requiredQuantity}`,
        );
      }
    }

    // ATOMIC TRANSACTION: POST INVOICE + DEDUCT STOCK
    try {
      const result = await this.db.$transaction(async (tx) => {
        // 1. Deduct stock for all items
        for (const item of invoice.items) {
          const balance = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId,
              },
            },
          });

          if (!balance) {
            // If no balance exists, create with negative (if allowed)
            if (allowNegativeStock) {
              await tx.stockBalance.create({
                data: {
                  productId: item.productId,
                  locationId,
                  quantity: item.quantity.negated(),
                },
              });
            } else {
              throw new BadRequestException(`Stock balance not found for product ${item.productId}`);
            }
          } else {
            // Update existing balance
            const newQuantity = balance.quantity.toNumber() - item.quantity.toNumber();

            await tx.stockBalance.update({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId,
                },
              },
              data: {
                quantity: new Prisma.Decimal(newQuantity),
              },
            });
          }

          // Record inventory movement
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId,
              movementType: 'SALE',
              quantityOut: item.quantity,
              referenceType: 'INVOICE',
              referenceId: invoiceId,
              unitCost: item.unitPrice,
            },
          });
        }

        // 2. Update invoice status to ISSUED
        const postedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'ISSUED',
            postedById: userId,
            postedAt: new Date(),
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            customer: true,
          },
        });

        return postedInvoice;
      });

      this.logger.log(`Invoice posted: ${invoice.invoiceNumber} - Stock DEDUCTED`);
      return result;
    } catch (error) {
      this.logger.error(`Invoice posting failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Invoice posting failed: ${error instanceof Error ? error.message : String(error)}. No changes made.`,
      );
    }
  }

  /**
   * Record payment for invoice
   * Updates invoice balance and payment status
   */
  async recordPayment(invoiceId: string, amount: number, paymentMethodId: string, userId: string) {
    const invoice = await this.db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status === 'DRAFT') {
      throw new BadRequestException(`Cannot record payment for DRAFT invoice`);
    }

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Create payment record
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'PAYMENT' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const paymentNumber = `PAY-2026-${String(nextNumber).padStart(6, '0')}`;

    const payment = await this.db.payment.create({
      data: {
        paymentNumber,
        customerId: invoice.customerId,
        invoiceId: invoiceId,
        amount: new Prisma.Decimal(amount),
        paymentMethodId,
        paymentDate: new Date(),
        status: 'RECORDED',
        createdById: userId,
      },
    });

    // Update invoice balance and status
    const newAmountPaid = invoice.amountPaid.toNumber() + amount;
    const newBalance = invoice.totalAmount.toNumber() - newAmountPaid;
    const newStatus =
      newBalance <= 0 ? 'PAID' : newBalance < invoice.totalAmount.toNumber() ? 'PARTIALLY_PAID' : 'ISSUED';

    await this.db.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: new Prisma.Decimal(newAmountPaid),
        balance: new Prisma.Decimal(Math.max(0, newBalance)),
        status: newStatus,
      },
    });

    this.logger.log(`Payment recorded for invoice: ${invoice.invoiceNumber}`);
    return payment;
  }

  /**
   * Get all invoices
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [invoices, total] = await Promise.all([
      this.db.invoice.findMany({
        skip,
        take,
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.invoice.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      invoices,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get invoice by ID
   */
  async updateDraft(id: string, notes?: string) {
    const invoice = await this.db.invoice.findUnique({ where: { id } });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be edited');
    }

    return this.db.invoice.update({
      where: { id },
      data: { notes },
      include: { customer: true, items: { include: { product: true } } },
    });
  }

  async findById(id: string) {
    const invoice = await this.db.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        salesReturns: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  /**
   * Search invoices
   */
  async search(query: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [invoices, total] = await Promise.all([
      this.db.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: query, mode: 'insensitive' } },
            { customer: { name: { contains: query, mode: 'insensitive' } } },
            { reference: { contains: query, mode: 'insensitive' } },
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
      this.db.invoice.count({
        where: {
          OR: [
            { invoiceNumber: { contains: query, mode: 'insensitive' } },
            { customer: { name: { contains: query, mode: 'insensitive' } } },
            { reference: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      invoices,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get customer balance
   * Balance = Sum of invoices - Sum of payments - Sum of returns
   */
  async getCustomerBalance(customerId: string) {
    const invoices = await this.db.invoice.findMany({
      where: { customerId, status: { not: 'CANCELLED' } },
      select: { balance: true },
    });

    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance.toNumber(), 0);

    return {
      customerId,
      totalBalance,
      invoiceCount: invoices.length,
    };
  }
}