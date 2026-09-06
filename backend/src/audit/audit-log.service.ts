import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service.js';
import { PaginationParams, PaginationService } from '../shared/services/pagination.service.js';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly paginationService: PaginationService,
  ) {}

  async logAction(data: {
    entityType: string;
    entityId: string;
    action: AuditAction;
    beforeData?: Record<string, unknown>;
    afterData?: Record<string, unknown>;
    details?: string;
    userId: string;
    ipAddress?: string;
    requestId?: string;
  }) {
    try {
      const log = await this.db.auditLog.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          action: data.action,
          beforeData: data.beforeData as Prisma.InputJsonValue | undefined,
          afterData: data.afterData as Prisma.InputJsonValue | undefined,
          metadata: data.details ? { details: data.details } : undefined,
          userId: data.userId,
          ipAddress: data.ipAddress,
          requestId: data.requestId,
        },
      });
      this.logger.log(`Audit log: ${data.action} on ${data.entityType} ${data.entityId}`);
      return log;
    } catch (error) {
      this.logger.error(`Failed to log action: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  async logEvent(data: {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    beforeData?: Record<string, unknown> | null;
    afterData?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }) {
    return this.logAction({
      entityType: data.entityType,
      entityId: data.entityId ?? '00000000-0000-0000-0000-000000000000',
      action: data.action,
      beforeData: data.beforeData ?? undefined,
      afterData: data.afterData ?? undefined,
      details: data.metadata ? JSON.stringify(data.metadata) : undefined,
      userId: data.userId,
      ipAddress: data.ipAddress,
      requestId: data.requestId,
    });
  }

  private async paginated(where: Prisma.AuditLogWhereInput, params: PaginationParams) {
    const [logs, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip: params.skip,
        take: params.take,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
      }),
      this.db.auditLog.count({ where }),
    ]);
    return this.paginationService.formatPaginatedResponse(logs, total, params.page ?? 1, params.limit ?? 20);
  }

  async getEntityLogs(entityType: string, entityId: string, params: PaginationParams) {
    return this.paginated({ entityType, entityId }, params);
  }

  async getLogsByAction(action: string, params: PaginationParams) {
    return this.paginated({ action: action as AuditAction }, params);
  }

  async getUserActionHistory(userId: string, params: PaginationParams) {
    return this.paginated({ userId }, params);
  }

  async getLogsByDateRange(startDate: Date, endDate: Date, params: PaginationParams) {
    return this.paginated({ timestamp: { gte: startDate, lte: endDate } }, params);
  }

  async findByEntity(entityType: string, entityId?: string) {
    return this.db.auditLog.findMany({
      where: { entityType, ...(entityId ? { entityId } : {}) },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findAll(options?: { userId?: string; entityType?: string; action?: string; limit?: number }) {
    return this.db.auditLog.findMany({
      where: {
        ...(options?.userId ? { userId: options.userId } : {}),
        ...(options?.entityType ? { entityType: options.entityType } : {}),
        ...(options?.action ? { action: options.action as AuditAction } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      take: Math.min(Math.max(options?.limit ?? 50, 1), 100),
    });
  }

  async getAuditTrail(entityType: string, entityId: string) {
    return this.db.auditLog.findMany({ where: { entityType, entityId }, orderBy: { timestamp: 'asc' } });
  }
}
