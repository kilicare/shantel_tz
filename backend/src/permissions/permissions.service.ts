import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private db: DatabaseService) {}

  // GET ALL PERMISSIONS
  async findAll(module?: string) {
    const where = module ? { module } : {};

    return this.db.permission.findMany({
      where,
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  // GET PERMISSION BY ID
  async findById(id: string) {
    const permission = await this.db.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission ${id} not found`);
    }

    return permission;
  }

  // CREATE PERMISSION
  async create(data: {
    code: string;
    name: string;
    module: string;
    description?: string;
  }) {
    const existing = await this.db.permission.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(`Permission ${data.code} already exists`);
    }

    const permission = await this.db.permission.create({
      data,
    });

    this.logger.log(`Permission created: ${data.code}`);

    return permission;
  }

  // UPDATE PERMISSION
  async update(
    id: string,
    data: { name?: string; description?: string },
  ) {
    const permission = await this.db.permission.findUnique({ where: { id } });

    if (!permission) {
      throw new NotFoundException(`Permission ${id} not found`);
    }

    const updated = await this.db.permission.update({
      where: { id },
      data,
    });

    this.logger.log(`Permission updated: ${id}`);

    return updated;
  }

  // GET PERMISSIONS BY MODULE
  async findByModule(module: string) {
    return this.db.permission.findMany({
      where: { module },
      orderBy: { code: 'asc' },
    });
  }
}
