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
export class StockAuditService {
  private readonly logger = new Logger(StockAuditService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create stock audit
   * Full physical count of all items in a location
   */
  async create(data: {
    locationId: string;
    auditType: 'FULL_COUNT' | 'PARTIAL_COUNT' | 'RECONCILIATION';
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

    // Get next audit number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'STOCK_AUDIT' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const auditNumber = `AUD-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create audit (DRAFT status)
    const audit = await this.db.stockAudit.create({
      data: {
        auditNumber,
        locationId: data.locationId,
        auditDate: new Date(),
        auditType: data.auditType,
        notes: data.notes,
        status: 'DRAFT',
        createdById: data.userId,
      },
    });

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'STOCK_AUDIT' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`Stock Audit created: ${auditNumber}`);
    return audit;
  }

  /**
   * Add items to audit
   * Called multiple times as physical count is recorded
   */
  async addItems(
    auditId: string,
    items: Array<{
      productId: string;
      physicalQuantity: number;
    }>,
  ) {
    const audit = await this.db.stockAudit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      throw new NotFoundException(`Stock Audit ${auditId} not found`);
    }

    if (audit.status !== 'DRAFT' && audit.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Can only add items to DRAFT or IN_PROGRESS audits`,
      );
    }

    // Add items (or update if already exists)
    const createdItems = [];

    for (const item of items) {
      // Validate product exists
      const product = await this.db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      // Get system quantity
      const systemBalance = await this.db.stockBalance.findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: audit.locationId,
          },
        },
      });

      const systemQuantity = systemBalance?.quantity.toNumber() || 0;
      const variance = item.physicalQuantity - systemQuantity;

      // Check if item already exists
      const existing = await this.db.stockAuditItem.findFirst({
        where: {
          auditId,
          productId: item.productId,
        },
      });

      let auditItem;

      if (existing) {
        // Update
        auditItem = await this.db.stockAuditItem.update({
          where: { id: existing.id },
          data: {
            physicalQuantity: new Prisma.Decimal(item.physicalQuantity),
            variance: new Prisma.Decimal(variance),
          },
          include: {
            product: true,
          },
        });
      } else {
        // Create
        auditItem = await this.db.stockAuditItem.create({
          data: {
            auditId,
            productId: item.productId,
            systemQuantity: new Prisma.Decimal(systemQuantity),
            physicalQuantity: new Prisma.Decimal(item.physicalQuantity),
            variance: new Prisma.Decimal(variance),
          },
          include: {
            product: true,
          },
        });
      }

      createdItems.push(auditItem);
    }

    // Update audit status to IN_PROGRESS if not already
    if (audit.status === 'DRAFT') {
      await this.db.stockAudit.update({
        where: { id: auditId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return createdItems;
  }

  /**
   * Complete audit (submit for approval)
   */
  async complete(auditId: string) {
    const audit = await this.db.stockAudit.findUnique({
      where: { id: auditId },
      include: {
        items: true,
      },
    });

    if (!audit) {
      throw new NotFoundException(`Stock Audit ${auditId} not found`);
    }

    if (audit.items.length === 0) {
      throw new BadRequestException(`Audit must have at least one item`);
    }

    return this.db.stockAudit.update({
      where: { id: auditId },
      data: { status: 'COMPLETED' },
    });
  }

  /**
   * Approve audit (required before posting)
   */
  async approve(auditId: string, userId: string) {
    const audit = await this.db.stockAudit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      throw new NotFoundException(`Stock Audit ${auditId} not found`);
    }

    if (audit.status !== 'COMPLETED') {
      throw new BadRequestException(`Only COMPLETED audits can be approved`);
    }

    return this.db.stockAudit.update({
      where: { id: auditId },
      data: {
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Post audit (apply adjustments to actual stock)
   * ATOMIC TRANSACTION
   */
  async post(auditId: string, userId: string) {
    const audit = await this.db.stockAudit.findUnique({
      where: { id: auditId },
      include: {
        items: true,
      },
    });

    if (!audit) {
      throw new NotFoundException(`Stock Audit ${auditId} not found`);
    }

    if (audit.status !== 'APPROVED') {
      throw new BadRequestException(`Audit must be APPROVED to post`);
    }

    try {
      const result = await this.db.$transaction(async (tx) => {
        // Apply each audit item
        for (const item of audit.items) {
          const variance = item.variance.toNumber();

          // Update balance to physical quantity
          await tx.stockBalance.update({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: audit.locationId,
              },
            },
            data: {
              quantity: item.physicalQuantity,
            },
          });

          // Record movement
          if (variance !== 0) {
            if (variance > 0) {
              // Gain (reconciliation gain)
              await tx.inventoryMovement.create({
                data: {
                  productId: item.productId,
                  locationId: audit.locationId,
                  movementType: 'AUDIT',
                  quantityIn: new Prisma.Decimal(variance),
                  referenceType: 'STOCK_AUDIT',
                  referenceId: auditId,
                  reason: 'Stock audit reconciliation gain',
                  createdById: userId,
                },
              });
            } else {
              // Loss (reconciliation loss)
              await tx.inventoryMovement.create({
                data: {
                  productId: item.productId,
                  locationId: audit.locationId,
                  movementType: 'AUDIT',
                  quantityOut: new Prisma.Decimal(Math.abs(variance)),
                  referenceType: 'STOCK_AUDIT',
                  referenceId: auditId,
                  reason: 'Stock audit reconciliation loss',
                  createdById: userId,
                },
              });
            }
          }
        }

        // Update audit status
        return tx.stockAudit.update({
          where: { id: auditId },
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

      this.logger.log(`Stock Audit posted: ${audit.auditNumber}`);
      return result;
    } catch (error) {
      this.logger.error(`Stock Audit failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Stock Audit failed: ${error instanceof Error ? error.message : String(error)}. No changes made.`,
      );
    }
  }

  /**
   * Get all audits
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [audits, total] = await Promise.all([
      this.db.stockAudit.findMany({
        skip,
        take,
        include: {
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.stockAudit.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      audits,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get audit by ID
   */
  async findById(id: string) {
    const audit = await this.db.stockAudit.findUnique({
      where: { id },
      include: {
        location: true,
      },
    });

    if (!audit) {
      throw new NotFoundException(`Stock Audit ${id} not found`);
    }

    return audit;
  }
}