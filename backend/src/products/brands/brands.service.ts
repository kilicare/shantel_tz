import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  async create(data: { name: string; description?: string }) {
    const existing = await this.db.brand.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException(`Brand ${data.name} already exists`);
    }

    const brand = await this.db.brand.create({
      data: {
        name: data.name,
        description: data.description,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Brand created: ${data.name}`);
    return brand;
  }

  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [brands, total] = await Promise.all([
      this.db.brand.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.db.brand.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      brands,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async findById(id: string) {
    const brand = await this.db.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    return brand;
  }

  async update(id: string, data: { name?: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    const brand = await this.db.brand.findUnique({ where: { id } });

    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    if (data.name && data.name !== brand.name) {
      const existing = await this.db.brand.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw new ConflictException(`Brand ${data.name} already exists`);
      }
    }

    const updated = await this.db.brand.update({
      where: { id },
      data,
    });

    this.logger.log(`Brand updated: ${id}`);
    return updated;
  }

  async delete(id: string) {
    const brand = await this.db.brand.findUnique({ where: { id } });

    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    const productCount = await this.db.product.count({
      where: { brandId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete brand with ${productCount} products. Mark as inactive instead.`,
      );
    }

    await this.db.brand.delete({ where: { id } });

    this.logger.log(`Brand deleted: ${id}`);
    return { message: 'Brand deleted successfully' };
  }
}