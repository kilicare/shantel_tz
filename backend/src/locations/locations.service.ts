import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PaginationService, PaginationParams } from '../shared/services/pagination.service.js';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  async create(data: {
    name: string;
    code: string;
    description?: string;
    locationType: 'MAIN_STORE' | 'BRANCH' | 'PROJECT_STORE' | 'OTHER';
    address?: string;
  }) {
    const existing = await this.db.location.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(`Location code ${data.code} already exists`);
    }

    const location = await this.db.location.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        locationType: data.locationType,
        address: data.address,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Location created: ${data.code}`);
    return location;
  }

  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [locations, total] = await Promise.all([
      this.db.location.findMany({
        skip,
        take,
        include: {
          stockBalances: {
            select: { quantity: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.db.location.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      locations,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async findById(id: string) {
    const location = await this.db.location.findUnique({
      where: { id },
      include: {
        stockBalances: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    return location;
  }

  async update(id: string, data: Partial<any>) {
    const location = await this.db.location.findUnique({ where: { id } });

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    if (data.code && data.code !== location.code) {
      const existing = await this.db.location.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new ConflictException(`Location code ${data.code} already exists`);
      }
    }

    const updated = await this.db.location.update({
      where: { id },
      data,
    });

    this.logger.log(`Location updated: ${id}`);
    return updated;
  }

  async getStockSummary(id: string) {
    const location = await this.db.location.findUnique({
      where: { id },
      include: {
        stockBalances: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    const totalItems = location.stockBalances.length;
    const totalQuantity = location.stockBalances.reduce((sum, sb) => sum + sb.quantity.toNumber(), 0);
    const lowStockItems = location.stockBalances.filter(
      (sb) => sb.quantity.toNumber() <= sb.product.minimumStockLevel,
    );

    return {
      location,
      summary: {
        totalItems,
        totalQuantity,
        lowStockCount: lowStockItems.length,
        lowStockItems,
      },
    };
  }
}