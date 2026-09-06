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
export class GRNService {
  private readonly logger = new Logger(GRNService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create GRN (Goods Received Note)
   * Supports partial receiving
   */
  async create(data: {
    purchaseOrderId: string;
    supplierId: string;
    items: Array<{
      purchaseOrderItemId: string;
      productId: string;
      orderedQuantity: number;
      receivedQuantity: number; // Can be less than ordered (partial)
      acceptedQuantity: number;
      rejectedQuantity?: number;
    }>;
    reference?: string;
    notes?: string;
    userId: string;
  }) {
    // Validate PO exists
    const po = await this.db.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
      include: {
        items: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`PO ${data.purchaseOrderId} not found`);
    }

    // Validate supplier
    const supplier = await this.db.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier ${data.supplierId} not found`);
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('GRN must have at least one item');
    }

    // Validate each item
    for (const item of data.items) {
      const product = await this.db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (item.acceptedQuantity > item.receivedQuantity) {
        throw new BadRequestException(
          `Accepted quantity cannot exceed received quantity for ${product.name}`,
        );
      }

      if (item.receivedQuantity > item.orderedQuantity) {
        throw new BadRequestException(
          `Received quantity cannot exceed ordered quantity for ${product.name}`,
        );
      }

      if (item.receivedQuantity <= 0) {
        throw new BadRequestException('Received quantity must be greater than 0');
      }
    }

    // Get next GRN number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'GRN' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const grnNumber = `GRN-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create GRN
    const grn = await this.db.gRN.create({
      data: {
        grnNumber,
        purchaseOrderId: data.purchaseOrderId,
        supplierId: data.supplierId,
        receivedDate: new Date(),
        reference: data.reference,
        notes: data.notes,
        status: 'DRAFT',
        receivedById: data.userId,
      },
      include: {
        purchaseOrder: true,
        supplier: true,
      },
    });

    // Create GRN items
    for (const item of data.items) {
      const unitCost = await this.getProductUnitCost(item.productId, data.purchaseOrderId);
      const lineTotal = item.acceptedQuantity * unitCost.toNumber();

      await this.db.gRNItem.create({
        data: {
          grnId: grn.id,
          purchaseOrderItemId: item.purchaseOrderItemId,
          productId: item.productId,
          orderedQuantity: new Prisma.Decimal(item.orderedQuantity),
          receivedQuantity: new Prisma.Decimal(item.receivedQuantity),
          acceptedQuantity: new Prisma.Decimal(item.acceptedQuantity),
          rejectedQuantity: new Prisma.Decimal(item.rejectedQuantity || 0),
          unitCost: unitCost,
          lineTotal: new Prisma.Decimal(lineTotal),
        },
      });
    }

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'GRN' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`GRN created: ${grnNumber}`);
    return grn;
  }

  /**
   * Post GRN (increase stock and update PO status)
   * ATOMIC TRANSACTION
   */
  async post(grnId: string, locationId: string, userId: string) {
    const grn = await this.db.gRN.findUnique({
      where: { id: grnId },
      include: {
        items: true,
        purchaseOrder: true,
      },
    });

    if (!grn) {
      throw new NotFoundException(`GRN ${grnId} not found`);
    }

    if (grn.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT GRNs can be posted`);
    }

    // Validate location exists
    const location = await this.db.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    try {
      const result = await this.db.$transaction(async (tx) => {
        // 1. Increase stock for each item
        for (const item of grn.items) {
          // Get current balance
          const currentBalance = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId,
              },
            },
          });

          const newQuantity = (currentBalance?.quantity.toNumber() || 0) + item.acceptedQuantity.toNumber();

          // Update or create balance
          if (currentBalance) {
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
              movementType: 'GRN',
              quantityIn: item.acceptedQuantity,
              referenceType: 'GRN',
              referenceId: grnId,
              unitCost: item.unitCost,
            },
          });
        }

        // 2. Update GRN status
        const postedGRN = await tx.gRN.update({
          where: { id: grnId },
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

        // 3. Update PO status (if all items received)
        const receivingStatus = await this.getReceivingStatus(grn.purchaseOrderId);

        if (receivingStatus.totalOutstanding === 0) {
          await tx.purchaseOrder.update({
            where: { id: grn.purchaseOrderId },
            data: { status: 'RECEIVED' },
          });
        } else {
          await tx.purchaseOrder.update({
            where: { id: grn.purchaseOrderId },
            data: { status: 'PARTIALLY_RECEIVED' },
          });
        }

        return postedGRN;
      });

      this.logger.log(`GRN posted: ${grn.grnNumber}`);
      return result;
    } catch (error) {
      this.logger.error(`GRN posting failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `GRN posting failed: ${error instanceof Error ? error.message : String(error)}. No changes made.`,
      );
    }
  }

  /**
   * Get all GRNs
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [grns, total] = await Promise.all([
      this.db.gRN.findMany({
        skip,
        take,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          purchaseOrder: true,
          supplier: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.gRN.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      grns,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get GRN by ID
   */
  async findById(id: string) {
    const grn = await this.db.gRN.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        purchaseOrder: {
          include: {
            items: true,
          },
        },
        supplier: true,
      },
    });

    if (!grn) {
      throw new NotFoundException(`GRN ${id} not found`);
    }

    return grn;
  }

  /**
   * Get receiving status
   */
  private async getReceivingStatus(poId: string) {
    const po = await this.db.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        items: true,
        grns: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`PO ${poId} not found`);
    }

    const itemsStatus = po.items.map((item) => {
      const grnItems = po.grns.flatMap((grn) =>
        grn.items.filter((gi) => gi.purchaseOrderItemId === item.id),
      );

      const receivedQuantity = grnItems.reduce(
        (sum, gi) => sum + gi.acceptedQuantity.toNumber(),
        0,
      );

      return {
        orderedQuantity: item.quantity.toNumber(),
        receivedQuantity,
        outstandingQuantity: item.quantity.toNumber() - receivedQuantity,
      };
    });

    const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity.toNumber(), 0);
    const totalReceived = itemsStatus.reduce((sum, item) => sum + item.receivedQuantity, 0);

    return {
      totalOrdered,
      totalReceived,
      totalOutstanding: totalOrdered - totalReceived,
    };
  }

  /**
   * Helper: Get product unit cost from PO
   */
  private async getProductUnitCost(productId: string, poId: string): Promise<Prisma.Decimal> {
    const poItem = await this.db.purchaseOrderItem.findFirst({
      where: {
        purchaseOrderId: poId,
        productId,
      },
    });

    return poItem?.unitCost || new Prisma.Decimal(0);
  }
}