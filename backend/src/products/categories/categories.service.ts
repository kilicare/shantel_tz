import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  async create(data: { name: string; description?: string }) {
    const existing = await this.db.category.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException(`Category ${data.name} already exists`);
    }

    const category = await this.db.category.create({
      data: {
        name: data.name,
        description: data.description,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Category created: ${data.name}`);
    return category;
  }

  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [categories, total] = await Promise.all([
      this.db.category.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.db.category.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      categories,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async findById(id: string) {
    const category = await this.db.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    return category;
  }

  async update(id: string, data: { name?: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    const category = await this.db.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    if (data.name && data.name !== category.name) {
      const existing = await this.db.category.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw new ConflictException(`Category ${data.name} already exists`);
      }
    }

    const updated = await this.db.category.update({
      where: { id },
      data,
    });

    this.logger.log(`Category updated: ${id}`);
    return updated;
  }

  async delete(id: string) {
    const category = await this.db.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    // Check if category has products
    const productCount = await this.db.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete category with ${productCount} products. Mark as inactive instead.`,
      );
    }

    await this.db.category.delete({ where: { id } });

    this.logger.log(`Category deleted: ${id}`);
    return { message: 'Category deleted successfully' };
  }
}