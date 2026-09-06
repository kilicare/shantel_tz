import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { AuditLogService } from './audit-log.service.js';
import { DataIntegrityService } from './data-integrity.service.js';
import { TraceabilityService } from './traceability.service.js';

@ApiTags('Audit, Traceability & Integrity')
@Controller('audit')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly integrityService: DataIntegrityService,
    private readonly traceabilityService: TraceabilityService,
    private readonly paginationService: PaginationService,
  ) {}

  @Get('logs/entity/:type/:id')
  @RequirePermission('audit.view')
  getEntityLogs(@Param('type') type: string, @Param('id') id: string, @Query() query: any) {
    return this.auditLogService.getEntityLogs(type, id, this.paginationService.parsePaginationParams(query));
  }

  @Get('logs/action/:action')
  @RequirePermission('audit.view')
  getActionLogs(@Param('action') action: string, @Query() query: any) {
    return this.auditLogService.getLogsByAction(action, this.paginationService.parsePaginationParams(query));
  }

  @Get('logs/user/:userId')
  @RequirePermission('audit.view')
  getUserLogs(@Param('userId') userId: string, @Query() query: any) {
    return this.auditLogService.getUserActionHistory(userId, this.paginationService.parsePaginationParams(query));
  }

  @Get('logs/date-range')
  @RequirePermission('audit.view')
  getDateRangeLogs(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Query() query: any) {
    return this.auditLogService.getLogsByDateRange(new Date(startDate), new Date(endDate), this.paginationService.parsePaginationParams(query));
  }

  @Get('integrity/financial-check')
  @RequirePermission('audit.view')
  @ApiOperation({ summary: 'Verify financial consistency' })
  checkFinancialIntegrity() { return { success: true, data: this.integrityService.verifyFinancialConsistency() }; }

  @Get('integrity/inventory-check')
  @RequirePermission('audit.view')
  checkInventoryIntegrity() { return { success: true, data: this.integrityService.verifyInventoryConsistency() }; }

  @Get('integrity/constraints-check')
  @RequirePermission('audit.view')
  checkConstraints() { return { success: true, data: this.integrityService.verifyUniqueConstraints() }; }

  @Get('integrity/full-check')
  @RequirePermission('audit.view')
  fullIntegrityCheck() { return { success: true, data: this.integrityService.runFullIntegrityCheck() }; }

  @Get('integrity/stock')
  @RequirePermission('audit.view')
  getStockIntegrity() { return this.integrityService.checkInventoryConsistency(); }

  @Get('integrity/documents')
  @RequirePermission('audit.view')
  getDocumentIntegrity() { return this.integrityService.checkDocumentNumbering(); }

  @Get('integrity/users')
  @RequirePermission('audit.view')
  getUserIntegrity() { return this.integrityService.checkUserRoleIntegrity(); }

  @Get('trace/invoice/:invoiceId')
  @RequirePermission('audit.view')
  getInvoiceTrace(@Param('invoiceId') invoiceId: string) { return { success: true, data: this.traceabilityService.getSalesTraceChain(invoiceId) }; }

  @Get('trace/po/:poId')
  @RequirePermission('audit.view')
  getPOTrace(@Param('poId') poId: string) { return { success: true, data: this.traceabilityService.getPurchasingTraceChain(poId) }; }

  @Get('trace/stock/:productId')
  @RequirePermission('audit.view')
  getStockTrace(@Param('productId') productId: string, @Query('locationId') locationId?: string) { return { success: true, data: this.traceabilityService.getStockMovementHistory(productId, locationId) }; }

  @Get('trace/serial/:serialNumberId')
  @RequirePermission('audit.view')
  getSerialTrace(@Param('serialNumberId') serialNumberId: string) { return { success: true, data: this.traceabilityService.getSerialNumberLifecycle(serialNumberId) }; }

  @Get('trail/:entityType/:entityId')
  @RequirePermission('audit.view')
  getTrail(@Param('entityType') entityType: string, @Param('entityId') entityId: string) { return this.traceabilityService.getEntityHistory(entityType, entityId); }
}
