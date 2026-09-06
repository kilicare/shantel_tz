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
export class StockAdjustmentService {
  private readonly logger = new Logger(StockAdjustmentService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create stock adjustment
   * Adjustments track discrepancies between system and physical count
   */
  async create(data: {
    locationId: string;
    reason: string; // Damage, Loss, Counting Error, etc
    items: Array<{
      productId: string;
      systemQuantity: number;
      physicalQuantity: number;
    }>;
    notes?: string;
    userId: string;
  }) {
    // Validate location
    const location = await this.db.location.findUnique({
      where: { id: data.locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${data.locationId} not found`);
    }

    if (!data.reason || data.reason.trim().length === 0) {
      throw new BadRequestException('Reason is required for stock adjustment');
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Adjustment must have at least one item');
    }

    // Validate all products exist
    for (const item of data.items) {
      const product = await this.db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (item.systemQuantity < 0 || item.physicalQuantity < 0) {
        throw new BadRequestException('Quantities cannot be negative');
      }
    }

    // Get next adjustment number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'STOCK_ADJUSTMENT' },
    });

    const latestAdjustment = await this.db.stockAdjustment.findFirst({
      orderBy: { adjustmentNumber: 'desc' },
      select: { adjustmentNumber: true },
    });
    const latestNumber = Number(latestAdjustment?.adjustmentNumber.split('-').pop() || 0);
    const nextNumber = Math.max(Number(seq?.currentNumber || 0), latestNumber) + 1;
    const adjustmentNumber = `ADJ-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create adjustment (DRAFT status)
    const adjustment = await this.db.stockAdjustment.create({
      data: {
        adjustmentNumber,
        locationId: data.locationId,
        adjustmentDate: new Date(),
        reason: data.reason,
        notes: data.notes,
        status: 'DRAFT',
        createdById: data.userId,
      },
    });

    for (const item of data.items) {
      await this.db.stockAdjustmentItem.create({
        data: {
          adjustmentId: adjustment.id,
          productId: item.productId,
          systemQuantity: new Prisma.Decimal(item.systemQuantity),
          physicalQuantity: new Prisma.Decimal(item.physicalQuantity),
          difference: new Prisma.Decimal(item.physicalQuantity - item.systemQuantity),
          reason: data.reason,
        },
      });
    }

    // Update document sequence
    await this.db.documentSequence.upsert({
      where: { documentType: 'STOCK_ADJUSTMENT' },
      update: { currentNumber: nextNumber },
      create: { documentType: 'STOCK_ADJUSTMENT', prefix: 'ADJ', currentNumber: nextNumber, padding: 6, year: 2026, status: 'ACTIVE' },
    });

    this.logger.log(`Stock Adjustment created: ${adjustmentNumber}`);
    return adjustment;
  }

  /**
   * Approve adjustment (required before posting)
   */
  async approve(adjustmentId: string, userId: string) {
    const adjustment = await this.db.stockAdjustment.findUnique({
      where: { id: adjustmentId },
    });

    if (!adjustment) {
      throw new NotFoundException(`Stock Adjustment ${adjustmentId} not found`);
    }

    if (adjustment.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT adjustments can be approved`);
    }

    return this.db.stockAdjustment.update({
      where: { id: adjustmentId },
      data: {
        status: 'SUBMITTED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Post adjustment (apply to actual stock balance)
   * ATOMIC TRANSACTION
   */
  async post(adjustmentId: string, userId: string) {
    const adjustment = await this.db.stockAdjustment.findUnique({
      where: { id: adjustmentId },
      include: {
        items: true,
      },
    });

    if (!adjustment) {
      throw new NotFoundException(`Stock Adjustment ${adjustmentId} not found`);
    }

    if (adjustment.status !== 'SUBMITTED') {
      throw new BadRequestException(`Adjustment must be SUBMITTED to post`);
    }

    try {
      const result = await this.db.$transaction(async (tx) => {
        for (const item of adjustment.items) {
          const delta = item.difference.toNumber();
          const currentBalance = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: adjustment.locationId,
              },
            },
          });

          const nextQuantity = (currentBalance
            ? currentBalance.quantity.toNumber()
            : 0) + delta;

          await tx.stockBalance.upsert({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: adjustment.locationId,
              },
            },
            update: {
              quantity: new Prisma.Decimal(nextQuantity),
            },
            create: {
              productId: item.productId,
              locationId: adjustment.locationId,
              quantity: new Prisma.Decimal(nextQuantity),
            },
          });

          if (delta !== 0) {
            await tx.inventoryMovement.create({
              data: {
                productId: item.productId,
                locationId: adjustment.locationId,
                movementType: 'ADJUSTMENT',
                quantityIn: delta > 0 ? new Prisma.Decimal(delta) : new Prisma.Decimal(0),
                quantityOut: delta < 0 ? new Prisma.Decimal(Math.abs(delta)) : new Prisma.Decimal(0),
                referenceType: 'STOCK_ADJUSTMENT',
                referenceId: adjustmentId,
                reason: item.reason || adjustment.reason,
              },
            });
          }
        }

        // Update adjustment status
        return tx.stockAdjustment.update({
          where: { id: adjustmentId },
          data: {
            status: 'POSTED',
            postedById: userId,
            postedAt: new Date(),
          },
        });
      });

      this.logger.log(`Stock Adjustment posted: ${adjustment.adjustmentNumber}`);
      return result;
    } catch (error) {
      this.logger.error(`Stock Adjustment failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Stock Adjustment failed: ${error instanceof Error ? error.message : String(error)}. No changes made.`,
      );
    }
  }

  /**
   * Get all adjustments
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [adjustments, total] = await Promise.all([
      this.db.stockAdjustment.findMany({
        skip,
        take,
        include: {
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.stockAdjustment.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      adjustments,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get adjustment by ID
   */
  async findById(id: string) {
    const adjustment = await this.db.stockAdjustment.findUnique({
      where: { id },
      include: {
        location: true,
      },
    });

    if (!adjustment) {
      throw new NotFoundException(`Stock Adjustment ${id} not found`);
    }

    return adjustment;
  }
}