import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';

import { PurchasingController } from './purchasing.controller.js';
import { RequisitionsService } from './requisitions/requisitions.service.js';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service.js';
import { GRNService } from './grns/grns.service.js';
import { PurchaseReturnsService } from './returns/purchase-returns.service.js';

@Module({
  imports: [DatabaseModule, InventoryModule],
  providers: [
    PaginationService,
    RequisitionsService,
    PurchaseOrdersService,
    GRNService,
    PurchaseReturnsService,
  ],
  controllers: [PurchasingController],
  exports: [
    RequisitionsService,
    PurchaseOrdersService,
    GRNService,
    PurchaseReturnsService,
  ],
})
export class PurchasingModule {}
