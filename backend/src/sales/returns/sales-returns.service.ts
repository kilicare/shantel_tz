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
export class SalesReturnsService {
  private readonly logger = new Logger(SalesReturnsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create sales return
   * Customer returns items from invoice
   */
  async create(data: {
    customerId: string;
    invoiceId: string;
    items: Array<{
      productId: string;
      quantity: number;
      reason?: string;
    }>;
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

    // Validate invoice
    const invoice = await this.db.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${data.invoiceId} not found`);
    }

    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot return items from ${invoice.status} invoice`,
      );
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Return must have at least one item');
    }

    // Validate items
    let totalRefund = 0;

    const returnItems = await Promise.all(
      data.items.map(async (item) => {
        const product = await this.db.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        // Check if product was in original invoice
        const invoiceItem = invoice.items.find((ii) => ii.productId === item.productId);

        if (!invoiceItem) {
          throw new BadRequestException(
            `Product ${product.name} not in original invoice`,
          );
        }

        if (item.quantity > invoiceItem.quantity.toNumber()) {
          throw new BadRequestException(
            `Return quantity exceeds invoice quantity for ${product.name}`,
          );
        }

        if (item.quantity <= 0) {
          throw new BadRequestException('Return quantity must be greater than 0');
        }

        const refundAmount = item.quantity * invoiceItem.unitPrice.toNumber();
        totalRefund += refundAmount;

        return {
          productId: item.productId,
          originalQuantity: invoiceItem.quantity,
          returnedQuantity: new Prisma.Decimal(item.quantity),
          acceptedQuantity: new Prisma.Decimal(item.quantity),
          rejectedQuantity: new Prisma.Decimal(0),
          unitPrice: invoiceItem.unitPrice,
          lineTotal: new Prisma.Decimal(refundAmount),
          reason: item.reason,
        };
      }),
    );

    // Get next return number
    const [seq, latestReturn] = await Promise.all([
      this.db.documentSequence.findUnique({
        where: { documentType: 'SALES_RETURN' },
      }),
      this.db.salesReturn.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { returnNumber: true },
      }),
    ]);

    const latestReturnNumber = latestReturn?.returnNumber.match(/(\d+)$/)?.[1];
    const nextNumber = Math.max(Number(seq?.currentNumber || 0), Number(latestReturnNumber || 0)) + 1;
    const returnNumber = `SR-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create return (DRAFT status)
    const salesReturn = await this.db.salesReturn.create({
      data: {
        returnNumber,
        customerId: data.customerId,
        invoiceId: data.invoiceId,
        returnDate: new Date(),
        refundAmount: new Prisma.Decimal(totalRefund),
        notes: data.notes,
        status: 'DRAFT',
        createdById: data.userId,
      },
      include: {
        customer: true,
        invoice: true,
      },
    });

    // Create return items
    for (const item of returnItems) {
      await this.db.salesReturnItem.create({
        data: {
          salesReturnId: salesReturn.id,
          productId: item.productId,
          originalQuantity: item.originalQuantity,
          returnedQuantity: item.returnedQuantity,
          acceptedQuantity: item.acceptedQuantity,
          rejectedQuantity: item.rejectedQuantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          reason: item.reason,
        },
      });
    }

    // Update document sequence
    await this.db.documentSequence.upsert({
      where: { documentType: 'SALES_RETURN' },
      create: { documentType: 'SALES_RETURN', prefix: 'SR', currentNumber: nextNumber },
      update: { currentNumber: nextNumber },
    });

    this.logger.log(`Sales Return created: ${returnNumber}`);
    return salesReturn;
  }

  /**
   * Approve sales return
   */
  async approve(returnId: string, userId: string) {
    const salesReturn = await this.db.salesReturn.findUnique({
      where: { id: returnId },
    });

    if (!salesReturn) {
      throw new NotFoundException(`Sales Return ${returnId} not found`);
    }

    if (salesReturn.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT returns can be approved`);
    }

    return this.db.salesReturn.update({
      where: { id: returnId },
      data: {
        status: 'SUBMITTED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Post sales return (ATOMIC TRANSACTION)
   * Increase stock + adjust customer balance
   */
  async post(returnId: string, locationId: string, userId: string) {
    const salesReturn = await this.db.salesReturn.findUnique({
      where: { id: returnId },
      include: {
        items: true,
        invoice: true,
      },
    });

    if (!salesReturn) {
      throw new NotFoundException(`Sales Return ${returnId} not found`);
    }

    if (salesReturn.status !== 'SUBMITTED') {
      throw new BadRequestException(`Return must be SUBMITTED to post`);
    }

    try {
      const result = await this.db.$transaction(async (tx) => {
        // 1. Increase stock for all returned items
        for (const item of salesReturn.items) {
          const balance = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId,
              },
            },
          });

          if (balance) {
            const newQuantity =
              balance.quantity.toNumber() + item.acceptedQuantity.toNumber();

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
          } else {
            // Create new balance
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                locationId,
                quantity: item.acceptedQuantity,
              },
            });
          }

          // Record inventory movement
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId,
              movementType: 'SALES_RETURN',
              quantityIn: item.acceptedQuantity,
              referenceType: 'SALES_RETURN',
              referenceId: returnId,
              unitCost: item.unitPrice,
              reason: item.reason,
            },
          });
        }

        // 2. Adjust invoice balance
        const invoice = salesReturn.invoice;
        const newInvoiceBalance =
          invoice.balance.toNumber() + salesReturn.refundAmount.toNumber();
        const newInvoiceStatus =
          newInvoiceBalance > 0
            ? invoice.status === 'PAID'
              ? 'PARTIALLY_PAID'
              : invoice.status
            : 'PAID';

        await tx.invoice.update({
          where: { id: salesReturn.invoiceId },
          data: {
            balance: new Prisma.Decimal(newInvoiceBalance),
            status: newInvoiceStatus,
          },
        });

        // 3. Update return status
        return tx.salesReturn.update({
          where: { id: returnId },
          data: {
            status: 'POSTED',
            postedById: userId,
            postedAt: new Date(),
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });
      });

      this.logger.log(`Sales Return posted: ${salesReturn.returnNumber}`);
      return result;
    } catch (error) {
      this.logger.error(`Sales Return posting failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Sales Return posting failed: ${error instanceof Error ? error.message : String(error)}. No changes made.`,
      );
    }
  }

  /**
   * Get all sales returns
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [returns, total] = await Promise.all([
      this.db.salesReturn.findMany({
        skip,
        take,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.salesReturn.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      returns,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get sales return by ID
   */
  async findById(id: string) {
    const salesReturn = await this.db.salesReturn.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        invoice: true,
      },
    });

    if (!salesReturn) {
      throw new NotFoundException(`Sales Return ${id} not found`);
    }

    return salesReturn;
  }
}