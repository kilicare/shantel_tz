import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { ExportService } from './export.service.js';
import { InventoryReportsService } from './inventory-reports.service.js';
import { SalesReportsService } from './sales-reports.service.js';

@ApiTags('Dashboard & Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly salesReportsService: SalesReportsService,
    private readonly inventoryReportsService: InventoryReportsService,
    private readonly exportService: ExportService,
  ) {}

  @Get('dashboard/metrics')
  @RequirePermission('dashboard.view')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  getDashboardMetrics() {
    return this.dashboardService.getDashboardMetrics();
  }

  @Get('dashboard/sales-trend')
  @RequirePermission('dashboard.view')
  @ApiOperation({ summary: 'Get 30-day sales trend' })
  getSalesTrend() {
    return this.dashboardService.getSalesTrend();
  }

  @Get('dashboard/top-customers')
  @RequirePermission('dashboard.view')
  getTopCustomers(@Query('limit') limit?: string) {
    return this.dashboardService.getTopCustomers(this.parseLimit(limit));
  }

  @Get('dashboard/top-products')
  @RequirePermission('dashboard.view')
  getTopProducts(@Query('limit') limit?: string) {
    return this.dashboardService.getTopProducts(this.parseLimit(limit));
  }

  @Get('sales/by-date')
  @RequirePermission('reports.view')
  getSalesByDate(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.salesReportsService.getSalesByDateRange(...this.parseDateRange(startDate, endDate));
  }

  @Get('sales/by-salesperson')
  @RequirePermission('reports.view')
  getSalesBySalesperson(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.salesReportsService.getSalesBySalesperson(...this.parseDateRange(startDate, endDate));
  }

  @Get('sales/by-product')
  @RequirePermission('reports.view')
  getSalesByProduct(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.salesReportsService.getSalesByProduct(...this.parseDateRange(startDate, endDate));
  }

  @Get('sales/by-customer')
  @RequirePermission('reports.view')
  getSalesByCustomer(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.salesReportsService.getSalesByCustomer(...this.parseDateRange(startDate, endDate));
  }

  @Get('inventory/current-stock')
  @RequirePermission('reports.view')
  getCurrentStock(@Query('locationId') locationId?: string) {
    return this.inventoryReportsService.getCurrentStock(locationId);
  }

  @Get('inventory/low-stock')
  @RequirePermission('reports.view')
  getLowStock() {
    return this.inventoryReportsService.getLowStockItems();
  }

  @Get('inventory/movements')
  @RequirePermission('reports.view')
  getMovements(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryReportsService.getMovementReport(...this.parseDateRange(startDate, endDate), productId);
  }

  @Get('inventory/valuation')
  @RequirePermission('reports.view')
  getValuation() {
    return this.inventoryReportsService.getStockValuation();
  }

  @Get('export/sales-excel')
  @RequirePermission('reports.export')
  async exportSalesExcel(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Res() response: Response) {
    const report = await this.salesReportsService.getSalesByDateRange(...this.parseDateRange(startDate, endDate));
    return this.sendFile(response, this.exportService.exportToExcel(report.invoices, 'Sales'), 'sales-report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  @Get('export/sales-csv')
  @RequirePermission('reports.export')
  async exportSalesCsv(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Res() response: Response) {
    const report = await this.salesReportsService.getSalesByDateRange(...this.parseDateRange(startDate, endDate));
    response.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
    response.type('text/csv').send(this.exportService.exportToCsv(report.invoices));
  }

  @Get('export/sales-pdf')
  @RequirePermission('reports.export')
  async exportSalesPdf(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Res() response: Response) {
    const report = await this.salesReportsService.getSalesByDateRange(...this.parseDateRange(startDate, endDate));
    return this.sendFile(response, await this.exportService.exportToPdf('Sales Report', report.invoices, ['invoiceNumber', 'customer', 'invoiceDate', 'totalAmount', 'amountPaid', 'balance']), 'sales-report.pdf', 'application/pdf');
  }

  @Get('export/inventory-excel')
  @RequirePermission('reports.export')
  async exportInventoryExcel(@Query('locationId') locationId: string, @Res() response: Response) {
    const report = await this.inventoryReportsService.getCurrentStock(locationId);
    return this.sendFile(response, this.exportService.exportToExcel(report.details, 'Inventory'), 'inventory-report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  @Get('export/inventory-csv')
  @RequirePermission('reports.export')
  async exportInventoryCsv(@Query('locationId') locationId: string, @Res() response: Response) {
    const report = await this.inventoryReportsService.getCurrentStock(locationId);
    response.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
    response.type('text/csv').send(this.exportService.exportToCsv(report.details));
  }

  @Get('export/inventory-pdf')
  @RequirePermission('reports.export')
  async exportInventoryPdf(@Query('locationId') locationId: string, @Res() response: Response) {
    const report = await this.inventoryReportsService.getCurrentStock(locationId);
    return this.sendFile(response, await this.exportService.exportToPdf('Inventory Report', report.details, ['productSku', 'productName', 'quantity', 'valueAtCost', 'location']), 'inventory-report.pdf', 'application/pdf');
  }

  private parseDateRange(startValue?: string, endValue?: string): [Date, Date] {
    if (!startValue || !endValue) throw new BadRequestException('startDate and endDate are required');
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new BadRequestException('Invalid date range');
    }
    end.setHours(23, 59, 59, 999);
    return [start, end];
  }

  private parseLimit(value?: string) {
    const limit = value ? Number(value) : 10;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('limit must be between 1 and 100');
    return limit;
  }

  private sendFile(response: Response, content: Buffer, filename: string, type: string) {
    response.set({ 'Content-Type': type, 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': content.length });
    return response.send(content);
  }
}
