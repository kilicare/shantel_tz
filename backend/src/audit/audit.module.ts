import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { AuditController } from './audit.controller.js';
import { AuditLogService } from './audit-log.service.js';
import { DataIntegrityService } from './data-integrity.service.js';
import { TraceabilityService } from './traceability.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [PaginationService, AuditLogService, TraceabilityService, DataIntegrityService],
  controllers: [AuditController],
  exports: [AuditLogService, TraceabilityService, DataIntegrityService],
})
export class AuditModule {}
