import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class SerialNumbersService {
  private readonly logger = new Logger(SerialNumbersService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Register serial number
   */
  async register(data: {
    productId: string;
    serialNumber: string;
    locationId?: string;
    purchaseDate?: Date;
    projectId?: string;
    assetId?: string;
    userId: string;
  }) {
    // Validate product
    const product = await this.db.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    // Check for duplicate serial number for this product
    const existing = await this.db.serialNumber.findUnique({
      where: {
        productId_serialNumber: {
          productId: data.productId,
          serialNumber: data.serialNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Serial number "${data.serialNumber}" already exists for this product`,
      );
    }

    // If location specified, validate
    if (data.locationId) {
      const location = await this.db.location.findUnique({
        where: { id: data.locationId },
      });

      if (!location) {
        throw new NotFoundException(`Location not found`);
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

    // If asset specified, validate
    if (data.assetId) {
      const asset = await this.db.asset.findUnique({
        where: { id: data.assetId },
      });

      if (!asset) {
        throw new NotFoundException(`Asset not found`);
      }
    }

    // Create serial number
    const serialNumber = await this.db.serialNumber.create({
      data: {
        productId: data.productId,
        serialNumber: data.serialNumber,
        serialStatus: 'NEW' as any,
        locationId: data.locationId,
        purchaseDate: data.purchaseDate,
        projectId: data.projectId,
        assetId: data.assetId,
      },
      include: {
        product: true,
        location: true,
        project: true,
        asset: true,
      },
    });

    this.logger.log(`Serial number registered: ${data.serialNumber}`);
    return serialNumber;
  }

  /**
   * Lookup serial number by serial number value
   */
  async findBySerialNumber(serialNumber: string) {
    const sn = await this.db.serialNumber.findFirst({
      where: { serialNumber },
      include: {
        product: true,
        location: true,
        project: true,
        asset: true,
      },
    });

    if (!sn) {
      throw new NotFoundException(`Serial number not found`);
    }

    return sn;
  }

  /**
   * Get serial number by ID
   */
  async findById(id: string) {
    const serialNumber = await this.db.serialNumber.findUnique({
      where: { id },
      include: {
        product: true,
        location: true,
        project: true,
        asset: true,
      },
    });

    if (!serialNumber) {
      throw new NotFoundException(`Serial number not found`);
    }

    return serialNumber;
  }

  /**
   * List serial numbers (paginated)
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [serialNumbers, total] = await Promise.all([
      this.db.serialNumber.findMany({
        skip,
        take,
        include: {
          product: true,
          location: true,
          project: true,
          asset: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.serialNumber.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      serialNumbers,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Filter serial numbers by status
   */
  async findByStatus(status: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [serialNumbers, total] = await Promise.all([
      this.db.serialNumber.findMany({
        where: { serialStatus: status as any },
        skip,
        take,
        include: {
          product: true,
          location: true,
          project: true,
          asset: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.serialNumber.count({ where: { serialStatus: status as any } }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      serialNumbers,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Search serial numbers
   */
  async search(query: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [serialNumbers, total] = await Promise.all([
      this.db.serialNumber.findMany({
        where: {
          serialNumber: {
            contains: query,
            mode: 'insensitive',
          },
        },
        skip,
        take,
        include: {
          product: true,
          location: true,
          project: true,
          asset: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.serialNumber.count({
        where: {
          serialNumber: {
            contains: query,
            mode: 'insensitive',
          },
        },
      }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      serialNumbers,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Assign serial number to project or asset
   */
  async assign(data: {
    serialNumberId: string;
    projectId?: string;
    assetId?: string;
    locationId?: string;
    userId: string;
  }) {
    const serialNumber = await this.db.serialNumber.findUnique({
      where: { id: data.serialNumberId },
    });

    if (!serialNumber) {
      throw new NotFoundException(`Serial number not found`);
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

    // If asset specified, validate
    if (data.assetId) {
      const asset = await this.db.asset.findUnique({
        where: { id: data.assetId },
      });

      if (!asset) {
        throw new NotFoundException(`Asset not found`);
      }
    }

    // If location specified, validate
    if (data.locationId) {
      const location = await this.db.location.findUnique({
        where: { id: data.locationId },
      });

      if (!location) {
        throw new NotFoundException(`Location not found`);
      }
    }

    return this.db.serialNumber.update({
      where: { id: data.serialNumberId },
      data: {
        projectId: data.projectId,
        assetId: data.assetId,
        locationId: data.locationId,
        serialStatus: 'ASSIGNED' as any,
      },
      include: {
        product: true,
        location: true,
        project: true,
        asset: true,
      },
    });
  }

  /**
   * Update serial number status
   */
  async updateStatus(serialNumberId: string, status: string) {
    const serialNumber = await this.db.serialNumber.findUnique({
      where: { id: serialNumberId },
    });

    if (!serialNumber) {
      throw new NotFoundException(`Serial number not found`);
    }

    return this.db.serialNumber.update({
      where: { id: serialNumberId },
      data: {
        serialStatus: status as any,
        soldAt: status === 'SOLD' ? new Date() : undefined,
      },
      include: {
        product: true,
        location: true,
        project: true,
        asset: true,
      },
    });
  }

  /**
   * Get serial number history (based on available fields)
   */
  async getHistory(serialNumberId: string) {
    const serialNumber = await this.db.serialNumber.findUnique({
      where: { id: serialNumberId },
      include: {
        product: true,
        location: true,
        project: true,
        asset: true,
      },
    });

    if (!serialNumber) {
      throw new NotFoundException(`Serial number not found`);
    }

    // Build timeline based on available fields
    const timeline = [
      {
        date: serialNumber.createdAt,
        event: 'REGISTERED',
        details: 'Serial number created',
      },
    ];

    if (serialNumber.soldAt) {
      timeline.push({
        date: serialNumber.soldAt,
        event: 'SOLD',
        details: 'Serial number sold',
      });
    }

    if (serialNumber.projectId) {
      timeline.push({
        date: serialNumber.updatedAt,
        event: 'ASSIGNED_TO_PROJECT',
        details: `Assigned to project ${serialNumber.projectId}`,
      });
    }

    if (serialNumber.assetId) {
      timeline.push({
        date: serialNumber.updatedAt,
        event: 'ASSIGNED_TO_ASSET',
        details: `Assigned to asset ${serialNumber.assetId}`,
      });
    }

    return {
      serialNumber: serialNumber.serialNumber,
      product: serialNumber.product.name,
      currentStatus: serialNumber.serialStatus,
      currentLocation: serialNumber.location?.name,
      project: serialNumber.project?.name,
      asset: serialNumber.asset?.name,
      timeline: timeline.sort((a, b) => a.date.getTime() - b.date.getTime()),
    };
  }
}
