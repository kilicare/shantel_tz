import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private db: DatabaseService) {}

  // GET ALL ROLES
  async findAll() {
    return this.db.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // GET ROLE BY ID
  async findById(id: string) {
    const role = await this.db.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    return role;
  }

  // CREATE ROLE
  async create(data: { name: string; description?: string }) {
    const existingRole = await this.db.role.findUnique({
      where: { name: data.name },
    });

    if (existingRole) {
      throw new ConflictException(`Role ${data.name} already exists`);
    }

    const role = await this.db.role.create({
      data: {
        name: data.name,
        description: data.description,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Role created: ${data.name}`);

    return this.findById(role.id);
  }

  // UPDATE ROLE
  async update(id: string, data: { name?: string; description?: string }) {
    const role = await this.db.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    const updated = await this.db.role.update({
      where: { id },
      data,
    });

    this.logger.log(`Role updated: ${id}`);

    return this.findById(updated.id);
  }

  // ASSIGN PERMISSION
  async assignPermission(roleId: string, permissionId: string) {
    const role = await this.db.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    const permission = await this.db.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException(`Permission ${permissionId} not found`);
    }

    await this.db.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      update: {},
      create: { roleId, permissionId },
    });

    this.logger.log(`Permission assigned to role: ${roleId}`);

    return this.findById(roleId);
  }

  // REMOVE PERMISSION
  async removePermission(roleId: string, permissionId: string) {
    await this.db.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });

    this.logger.log(`Permission removed from role: ${roleId}`);

    return this.findById(roleId);
  }
}
