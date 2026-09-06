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
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Register asset
   */
  async register(data: {
    name: string;
    assetType: string;
    productId?: string;
    supplierId?: string;
    locationId: string;
    projectId?: string;
    purchaseDate?: Date;
    purchaseCost?: number;
    warrantyStartDate?: Date;
    warrantyEndDate?: Date;
    userId: string;
  }) {
    // Validate location
    const location = await this.db.location.findUnique({
      where: { id: data.locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location not found`);
    }

    // If product specified, validate
    if (data.productId) {
      const product = await this.db.product.findUnique({
        where: { id: data.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product not found`);
      }
    }

    // If supplier specified, validate
    if (data.supplierId) {
      const supplier = await this.db.supplier.findUnique({
        where: { id: data.supplierId },
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier not found`);
      }
    }

    // If project specified, validate
    if (data.projectId) {
      const project = await this.db.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        throw new NotFoundException(`Project not found`);
      }
    }

    // Get next asset number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'ASSET' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const assetNumber = `ASS-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create asset
    const asset = await this.db.asset.create({
      data: {
        assetNumber,
        name: data.name,
        assetType: data.assetType,
        productId: data.productId,
        supplierId: data.supplierId,
        locationId: data.locationId,
        assignedToUserId: data.userId,
        projectId: data.projectId,
        purchaseDate: data.purchaseDate,
        purchaseCost: data.purchaseCost
          ? new Prisma.Decimal(data.purchaseCost)
          : null,
        warrantyStartDate: data.warrantyStartDate,
        warrantyEndDate: data.warrantyEndDate,
        status: 'NEW' as any,
      },
      include: {
        product: true,
        supplier: true,
        location: true,
        project: true,
        serialNumbers: true,
      },
    });

    // Update document sequence (create if not exists)
    await this.db.documentSequence.upsert({
      where: { documentType: 'ASSET' },
      create: { documentType: 'ASSET', prefix: 'ASS', currentNumber: nextNumber },
      update: { currentNumber: nextNumber },
    });

    this.logger.log(`Asset registered: ${assetNumber}`);
    return asset;
  }

  /**
   * Transfer asset to different location or user
   */
  async transfer(data: {
    assetId: string;
    newLocationId: string;
    newAssignedToUserId?: string;
    newProjectId?: string;
    userId: string;
  }) {
    const asset = await this.db.asset.findUnique({
      where: { id: data.assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found`);
    }

    // Validate location
    const location = await this.db.location.findUnique({
      where: { id: data.newLocationId },
    });

    if (!location) {
      throw new NotFoundException(`Location not found`);
    }

    return this.db.asset.update({
      where: { id: data.assetId },
      data: {
        locationId: data.newLocationId,
        assignedToUserId: data.newAssignedToUserId,
        projectId: data.newProjectId,
      },
      include: {
        product: true,
        supplier: true,
        location: true,
        project: true,
        serialNumbers: true,
      },
    });
  }

  /**
   * Deactivate asset
   */
  async deactivate(assetId: string, userId: string) {
    const asset = await this.db.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found`);
    }

    return this.db.asset.update({
      where: { id: assetId },
      data: {
        status: 'DISPOSED' as any,
      },
    });
  }

  /**
   * Get all assets
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [assets, total] = await Promise.all([
      this.db.asset.findMany({
        skip,
        take,
        include: {
          product: true,
          supplier: true,
          location: true,
          project: true,
          serialNumbers: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.asset.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      assets,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get assets by project
   */
  async findByProject(projectId: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [assets, total] = await Promise.all([
      this.db.asset.findMany({
        where: { projectId },
        skip,
        take,
        include: {
          product: true,
          supplier: true,
          location: true,
          project: true,
          serialNumbers: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.asset.count({ where: { projectId } }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      assets,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get asset by ID
   */
  async findById(id: string) {
    const asset = await this.db.asset.findUnique({
      where: { id },
      include: {
        product: true,
        supplier: true,
        location: true,
        project: true,
        serialNumbers: true,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found`);
    }

    return asset;
  }
}
