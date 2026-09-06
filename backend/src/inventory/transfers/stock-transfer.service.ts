import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';
import { InventoryMovementService } from '../movements/inventory-movement.service.js';
import { StockBalanceService } from '../stock-balance/stock-balance.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class StockTransferService {
  private readonly logger = new Logger(StockTransferService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
    private inventoryMovementService: InventoryMovementService,
    private stockBalanceService: StockBalanceService,
  ) {}

  /**
   * Create stock transfer (from one location to another)
   * Must be approved before posting
   */
  async create(data: {
    sourceLocationId: string;
    destLocationId: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    notes?: string;
    userId: string;
  }) {
    // Validate locations exist and are different
    if (data.sourceLocationId === data.destLocationId) {
      throw new BadRequestException('Source and destination must be different');
    }

    const sourceLocation = await this.db.location.findUnique({
      where: { id: data.sourceLocationId },
    });

    if (!sourceLocation) {
      throw new NotFoundException(`Source location ${data.sourceLocationId} not found`);
    }

    const destLocation = await this.db.location.findUnique({
      where: { id: data.destLocationId },
    });

    if (!destLocation) {
      throw new NotFoundException(`Destination location ${data.destLocationId} not found`);
    }

    // Validate all products exist and have sufficient stock
    for (const item of data.items) {
      const product = await this.db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const sourceBalance = await this.stockBalanceService.getBalance(
        item.productId,
        data.sourceLocationId,
      );

      if ((typeof sourceBalance.quantity === 'number' ? sourceBalance.quantity : sourceBalance.quantity.toNumber()) < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name} at source location. Available: ${sourceBalance.quantity}, Requested: ${item.quantity}`,
        );
      }

      if (item.quantity <= 0) {
        throw new BadRequestException(`Quantity must be greater than 0`);
      }
    }

    // Get next transfer number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'STOCK_TRANSFER' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const transferNumber = `TRF-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create transfer (DRAFT status)
    const transfer = await this.db.stockTransfer.create({
      data: {
        transferNumber,
        sourceLocationId: data.sourceLocationId,
        destLocationId: data.destLocationId,
        transferDate: new Date(),
        notes: data.notes,
        status: 'DRAFT',
        createdById: data.userId,
      },
    });

    for (const item of data.items) {
      await this.db.stockTransferItem.create({
        data: {
          transferId: transfer.id,
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
        },
      });
    }

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'STOCK_TRANSFER' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`Stock Transfer created: ${transferNumber}`);
    return transfer;
  }

  /**
   * Post/execute stock transfer (ATOMIC TRANSACTION)
   * This is the critical operation - must be atomic
   * If any part fails, entire operation rolls back
   */
  async post(transferId: string, userId: string) {
    const transfer = await this.db.stockTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock Transfer ${transferId} not found`);
    }

    if (transfer.status !== 'SUBMITTED' && transfer.status !== 'DRAFT') {
      throw new BadRequestException(`Transfer must be DRAFT or SUBMITTED to post`);
    }

    // USE TRANSACTION FOR ATOMICITY
    try {
      const result = await this.db.$transaction(async (tx) => {
        const transferItems = await tx.stockTransferItem.findMany({ where: { transferId } });

        const sourceLocation = await tx.location.findUnique({
          where: { id: transfer.sourceLocationId },
        });

        const destLocation = await tx.location.findUnique({
          where: { id: transfer.destLocationId },
        });

        // Get current balances at source
        // Transfer only the explicitly requested products and quantities.
        for (const item of transferItems) {
          // Check source has stock
          const sourceBalance = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: transfer.sourceLocationId,
              },
            },
          });

          if (!sourceBalance || sourceBalance.quantity.toNumber() < item.quantity.toNumber()) {
            throw new BadRequestException(
              `Insufficient stock for product ${item.productId}. Transfer aborted.`,
            );
          }

          const transferQuantity = item.quantity.toNumber();

          // Deduct from source
          await tx.stockBalance.update({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: transfer.sourceLocationId,
              },
            },
            data: {
              quantity: sourceBalance.quantity.minus(transferQuantity),
            },
          });

          // Add to destination
          const destBalance = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: transfer.destLocationId,
              },
            },
          });

          if (destBalance) {
            await tx.stockBalance.update({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: transfer.destLocationId,
                },
              },
              data: {
                quantity: destBalance.quantity.plus(transferQuantity),
              },
            });
          } else {
            // Create new balance at destination
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                locationId: transfer.destLocationId,
                quantity: transferQuantity,
              },
            });
          }

          // Record movements
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId: transfer.sourceLocationId,
              movementType: 'TRANSFER_OUT',
              quantityOut: new Prisma.Decimal(transferQuantity),
              referenceType: 'STOCK_TRANSFER',
              referenceId: transferId,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId: transfer.destLocationId,
              movementType: 'TRANSFER_IN',
              quantityIn: new Prisma.Decimal(transferQuantity),
              referenceType: 'STOCK_TRANSFER',
              referenceId: transferId,
            },
          });
        }

        // 3. Update transfer status
        const postedTransfer = await tx.stockTransfer.update({
          where: { id: transferId },
          data: {
            status: 'POSTED',
            postedById: userId,
            postedAt: new Date(),
          },
        });

        return postedTransfer;
      });

      this.logger.log(`Stock Transfer posted: ${transfer.transferNumber}`);
      return result;
    } catch (error) {
      this.logger.error(`Stock Transfer failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Stock Transfer failed: ${error instanceof Error ? error.message : String(error)}. No changes made.`,
      );
    }
  }

  /**
   * Approve transfer (required before posting)
   */
  async approve(transferId: string, userId: string) {
    const transfer = await this.db.stockTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock Transfer ${transferId} not found`);
    }

    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT transfers can be approved`);
    }

    return this.db.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: 'SUBMITTED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Get all transfers
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [transfers, total] = await Promise.all([
      this.db.stockTransfer.findMany({
        skip,
        take,
        include: {
          sourceLocation: true,
          destLocation: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.stockTransfer.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      transfers,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get transfer by ID
   */
  async findById(id: string) {
    const transfer = await this.db.stockTransfer.findUnique({
      where: { id },
      include: {
        sourceLocation: true,
        destLocation: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException(`Stock Transfer ${id} not found`);
    }

    return transfer;
  }
}