import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';

import { SalesController } from './sales.controller.js';
import { QuotationsService } from './quotations/quotations.service.js';
import { SalesOrdersService } from './sales-orders/sales-orders.service.js';
import { InvoicesService } from './invoices/invoices.service.js';
import { SalesReturnsService } from './returns/sales-returns.service.js';

@Module({
  imports: [DatabaseModule, InventoryModule],
  providers: [
    PaginationService,
    QuotationsService,
    SalesOrdersService,
    InvoicesService,
    SalesReturnsService,
  ],
  controllers: [SalesController],
  exports: [
    QuotationsService,
    SalesOrdersService,
    InvoicesService,
    SalesReturnsService,
  ],
})
export class SalesModule {}
