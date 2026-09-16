import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';

import { InventoryController } from './inventory.controller.js';
import { StockBalanceService } from './stock-balance/stock-balance.service.js';
import { InventoryMovementService } from './movements/inventory-movement.service.js';
import { StockTransferService } from './transfers/stock-transfer.service.js';
import { StockAdjustmentService } from './adjustments/stock-adjustment.service.js';
import { StockAuditService } from './audits/stock-audit.service.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  providers: [
    PaginationService,
    StockBalanceService,
    InventoryMovementService,
    StockTransferService,
    StockAdjustmentService,
    StockAuditService,
  ],
  controllers: [InventoryController],
  exports: [
    StockBalanceService,
    InventoryMovementService,
    StockTransferService,
    StockAdjustmentService,
    StockAuditService,
  ],
})
export class InventoryModule {}