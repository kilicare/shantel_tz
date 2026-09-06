import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { DashboardService } from '../dashboard/dashboard.service.js';

import { ReportsController } from './reports.controller.js';
import { ExportService } from './export.service.js';
import { InventoryReportsService } from './inventory-reports.service.js';
import { SalesReportsService } from './sales-reports.service.js';

@Module({
	imports: [DatabaseModule],
	providers: [DashboardService, SalesReportsService, InventoryReportsService, ExportService],
	controllers: [ReportsController],
	exports: [DashboardService, SalesReportsService, InventoryReportsService, ExportService],
})
export class ReportsModule {}
