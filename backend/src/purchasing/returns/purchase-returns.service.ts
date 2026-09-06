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
export class PurchaseReturnsService {
  private readonly logger = new Logger(PurchaseReturnsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create purchase return
   */
  async create(data: {
    grnId: string;
    supplierId: string;
    items: Array<{
      productId: string;
      quantity: number;
      reason?: string;
    }>;
    notes?: string;
    userId: string;
  }) {
    // Validate GRN
    const grn = await this.db.gRN.findUnique({
      where: { id: data.grnId },
      include: {
        items: true,
      },
    });

    if (!grn) {
      throw new NotFoundException(`GRN ${data.grnId} not found`);
    }

    // Validate supplier
    const supplier = await this.db.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier ${data.supplierId} not found`);
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Purchase return must have at least one item');
    }

    // Validate items
    for (const item of data.items) {
      const product = await this.db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const grnItem = grn.items.find((gi: any) => gi.productId === item.productId);

      if (!grnItem) {
        throw new BadRequestException(`Product ${item.productId} not in this GRN`);
      }

      if (item.quantity > grnItem.acceptedQuantity.toNumber()) {
        throw new BadRequestException(
          `Return quantity exceeds received quantity for ${product.name}`,
        );
      }

      if (item.quantity <= 0) {
        throw new BadRequestException('Return quantity must be greater than 0');
      }
    }

    // Get next return number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'PURCHASE_RETURN' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const returnNumber = `PR-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create return
    const purchaseReturn = await this.db.purchaseReturn.create({
      data: {
        returnNumber,
        supplierId: data.supplierId,
        grnId: data.grnId,
        returnDate: new Date(),
        notes: data.notes,
        status: 'DRAFT',
        createdById: data.userId,
      },
      include: {
        supplier: true,
        grn: true,
      },
    });

    // Create return items
    for (const item of data.items) {
      const unitCost = this.getGRNItemCost(grn, item.productId);
      const lineTotal = item.quantity * unitCost.toNumber();

      await this.db.purchaseReturnItem.create({
        data: {
          purchaseReturnId: purchaseReturn.id,
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          unitCost: unitCost,
          lineTotal: new Prisma.Decimal(lineTotal),
          reason: item.reason,
        },
      });
    }

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'PURCHASE_RETURN' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`Purchase Return created: ${returnNumber}`);
    return purchaseReturn;
  }

  /**
   * Approve return
   */
  async approve(returnId: string, userId: string) {
    const purchaseReturn = await this.db.purchaseReturn.findUnique({
      where: { id: returnId },
    });

    if (!purchaseReturn) {
      throw new NotFoundException(`Purchase Return ${returnId} not found`);
    }

    if (purchaseReturn.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT returns can be approved`);
    }

    return this.db.purchaseReturn.update({
      where: { id: returnId },
      data: {
        status: 'SUBMITTED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Post return (reduce stock, update supplier liability)
   * ATOMIC TRANSACTION
   */
  async post(returnId: string, locationId: string, userId: string) {
    const purchaseReturn = await this.db.purchaseReturn.findUnique({
      where: { id: returnId },
      include: {
        items: true,
        grn: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!purchaseReturn) {
      throw new NotFoundException(`Purchase Return ${returnId} not found`);
    }

    if (purchaseReturn.status !== 'SUBMITTED') {
      throw new BadRequestException(`Return must be SUBMITTED to post`);
    }

    try {
      const result = await this.db.$transaction(async (tx) => {
        // 1. Reduce stock for each returned item
        for (const item of purchaseReturn.items) {
          const balance = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId,
              },
            },
          });

          if (!balance) {
            throw new BadRequestException(
              `Stock balance not found for product ${item.productId}`,
            );
          }

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

          // Record inventory movement
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId,
              movementType: 'PURCHASE_RETURN',
              quantityOut: item.quantity,
              referenceType: 'PURCHASE_RETURN',
              referenceId: returnId,
              unitCost: item.unitCost,
              reason: item.reason,
              createdById: userId,
            },
          });
        }

        // 2. Update return status
        return tx.purchaseReturn.update({
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

      this.logger.log(`Purchase Return posted: ${purchaseReturn.returnNumber}`);
      return result;
    } catch (error) {
      this.logger.error(`Purchase Return posting failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Purchase Return posting failed: ${error instanceof Error ? error.message : String(error)}. No changes made.`,
      );
    }
  }

  /**
   * Get all returns
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [returns, total] = await Promise.all([
      this.db.purchaseReturn.findMany({
        skip,
        take,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
          grn: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.purchaseReturn.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      returns,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get return by ID
   */
  async findById(id: string) {
    const purchaseReturn = await this.db.purchaseReturn.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
        grn: true,
      },
    });

    if (!purchaseReturn) {
      throw new NotFoundException(`Purchase Return ${id} not found`);
    }

    return purchaseReturn;
  }

  /**
   * Helpers
   */
  private getGRNItemCost(grn: any, productId: string): Prisma.Decimal {
    const item = grn.items.find((i: any) => i.productId === productId);
    return item?.unitCost || new Prisma.Decimal(0);
  }
}