import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  async create(data: { name: string; code: string; description?: string }) {
    const existing = await this.db.unit.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(`Unit code ${data.code} already exists`);
    }

    const unit = await this.db.unit.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Unit created: ${data.code}`);
    return unit;
  }

  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [units, total] = await Promise.all([
      this.db.unit.findMany({
        skip,
        take,
        orderBy: { code: 'asc' },
      }),
      this.db.unit.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      units,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async findById(id: string) {
    const unit = await this.db.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException(`Unit ${id} not found`);
    }

    return unit;
  }

  async update(id: string, data: { name?: string; code?: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    const unit = await this.db.unit.findUnique({ where: { id } });

    if (!unit) {
      throw new NotFoundException(`Unit ${id} not found`);
    }

    if (data.code && data.code !== unit.code) {
      const existing = await this.db.unit.findUnique({
        where: { code: data.code },
      });
      if (existing) {
        throw new ConflictException(`Unit code ${data.code} already exists`);
      }
    }

    const updated = await this.db.unit.update({
      where: { id },
      data,
    });

    this.logger.log(`Unit updated: ${id}`);
    return updated;
  }

  async delete(id: string) {
    const unit = await this.db.unit.findUnique({ where: { id } });

    if (!unit) {
      throw new NotFoundException(`Unit ${id} not found`);
    }

    const productCount = await this.db.product.count({
      where: { unitId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete unit with ${productCount} products. Mark as inactive instead.`,
      );
    }

    await this.db.unit.delete({ where: { id } });

    this.logger.log(`Unit deleted: ${id}`);
    return { message: 'Unit deleted successfully' };
  }
}