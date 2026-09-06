import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PaginationService, PaginationParams } from '../shared/services/pagination.service.js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  // GET ALL USERS
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        skip,
        take,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.user.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      users,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  // GET USER BY ID
  async findById(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  // CREATE USER (Admin)
  async create(data: {
    email: string;
    username: string;
    password: string;
    name?: string;
    phone?: string;
    roleId?: string;
  }) {
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.db.user.create({
      data: {
        email: data.email,
        username: data.username,
        name: data.name,
        phone: data.phone,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    // Assign role if provided
    if (data.roleId) {
      await this.db.userRole.create({
        data: {
          userId: user.id,
          roleId: data.roleId,
        },
      });
    }

    this.logger.log(`User created: ${data.email}`);

    return this.findById(user.id);
  }

  // UPDATE USER
  async update(
    id: string,
    data: {
      name?: string;
      phone?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    },
  ) {
    const user = await this.db.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const updated = await this.db.user.update({
      where: { id },
      data,
    });

    // Audit log
    await this.db.auditLog.create({
      data: {
        userId: id,
        action: 'UPDATE',
        entityType: 'USER',
        entityId: id,
        afterData: data,
      },
    });

    this.logger.log(`User updated: ${id}`);

    return this.findById(updated.id);
  }

  // DEACTIVATE USER
  async deactivate(id: string) {
    const user = await this.db.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.update(id, { status: 'INACTIVE' });
  }

  // ASSIGN ROLE
  async assignRole(userId: string, roleId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const role = await this.db.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    await this.db.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      update: {},
      create: { userId, roleId },
    });

    this.logger.log(`Role ${roleId} assigned to user ${userId}`);

    return this.findById(userId);
  }

  // REMOVE ROLE
  async removeRole(userId: string, roleId: string) {
    await this.db.userRole.deleteMany({
      where: { userId, roleId },
    });

    this.logger.log(`Role ${roleId} removed from user ${userId}`);

    return this.findById(userId);
  }
}
