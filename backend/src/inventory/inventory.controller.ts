import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { PaginationService } from '../shared/services/pagination.service.js';

import { StockBalanceService } from './stock-balance/stock-balance.service.js';
import { InventoryMovementService } from './movements/inventory-movement.service.js';
import { StockTransferService } from './transfers/stock-transfer.service.js';
import { StockAdjustmentService } from './adjustments/stock-adjustment.service.js';
import { StockAuditService } from './audits/stock-audit.service.js';

@ApiTags('Inventory Management')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(
    private stockBalanceService: StockBalanceService,
    private inventoryMovementService: InventoryMovementService,
    private stockTransferService: StockTransferService,
    private stockAdjustmentService: StockAdjustmentService,
    private stockAuditService: StockAuditService,
    private paginationService: PaginationService,
  ) {}

  // ===== STOCK BALANCE ENDPOINTS =====

  @Get('balances')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get all stock balances' })
  async getAllBalances(@Query() query: any) {
    // In real app, would paginate
    const balances = await this.stockBalanceService.getLocationStock(query.locationId);
    return { success: true, data: balances };
  }

  @Get('balances/product/:productId')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get total stock for a product' })
  async getTotalStock(@Param('productId') productId: string) {
    const stock = await this.stockBalanceService.getTotalStock(productId);
    return { success: true, data: stock };
  }

  @Get('balances/location/:locationId')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get stock in a location' })
  async getLocationStock(@Param('locationId') locationId: string) {
    const balances = await this.stockBalanceService.getLocationStock(locationId);
    return { success: true, data: balances };
  }

  @Get('low-stock')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get low stock items' })
  async getLowStockItems(@Query('locationId') locationId?: string) {
    const items = await this.stockBalanceService.getLowStockItems(locationId);
    return { success: true, data: items };
  }

  @Get('summary')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get inventory summary' })
  async getSummary() {
    const summary = await this.stockBalanceService.getStockSummary();
    return { success: true, data: summary };
  }

  // ===== MOVEMENTS ENDPOINTS =====

  @Get('movements')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get inventory movements (ledger)' })
  async getLedger(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.inventoryMovementService.getLedger(paginationParams);
  }

  @Get('movements/product/:productId')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get movements for a product' })
  async getProductMovements(
    @Param('productId') productId: string,
    @Query() query: any,
  ) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.inventoryMovementService.getMovementsByProduct(
      productId,
      paginationParams,
    );
  }

  @Get('movements/location/:locationId')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get movements for a location' })
  async getLocationMovements(
    @Param('locationId') locationId: string,
    @Query() query: any,
  ) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.inventoryMovementService.getMovementsByLocation(
      locationId,
      paginationParams,
    );
  }

  // ===== STOCK TRANSFER ENDPOINTS =====

  @Post('transfers')
  @RequirePermission('inventory.transfer')
  @ApiOperation({ summary: 'Create stock transfer' })
  async createTransfer(@Body() body: any, @Body('userId') userId: string) {
    return { success: true, data: await this.stockTransferService.create(body) };
  }

  @Get('transfers')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get all stock transfers' })
  async getAllTransfers(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.stockTransferService.findAll(paginationParams);
  }

  @Get('transfers/:id')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get transfer by ID' })
  async getTransfer(@Param('id') id: string) {
    const transfer = await this.stockTransferService.findById(id);
    return { success: true, data: transfer };
  }

  @Patch('transfers/:id/approve')
  @RequirePermission('inventory.approve_adjust')
  @ApiOperation({ summary: 'Approve stock transfer' })
  async approveTransfer(@Param('id') id: string, @Body('userId') userId: string) {
    const approved = await this.stockTransferService.approve(id, userId);
    return { success: true, data: approved };
  }

  @Patch('transfers/:id/post')
  @RequirePermission('inventory.approve_adjust')
  @ApiOperation({ summary: 'Post stock transfer' })
  async postTransfer(@Param('id') id: string, @Body('userId') userId: string) {
    const posted = await this.stockTransferService.post(id, userId);
    return { success: true, data: posted };
  }

  // ===== STOCK ADJUSTMENT ENDPOINTS =====

  @Post('adjustments')
  @RequirePermission('inventory.adjust')
  @ApiOperation({ summary: 'Create stock adjustment' })
  async createAdjustment(@Body() body: any) {
    return { success: true, data: await this.stockAdjustmentService.create(body) };
  }

  @Get('adjustments')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get all stock adjustments' })
  async getAllAdjustments(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.stockAdjustmentService.findAll(paginationParams);
  }

  @Get('adjustments/:id')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get adjustment by ID' })
  async getAdjustment(@Param('id') id: string) {
    const adjustment = await this.stockAdjustmentService.findById(id);
    return { success: true, data: adjustment };
  }

  @Patch('adjustments/:id/approve')
  @RequirePermission('inventory.approve_adjust')
  @ApiOperation({ summary: 'Approve stock adjustment' })
  async approveAdjustment(@Param('id') id: string, @Body('userId') userId: string) {
    const approved = await this.stockAdjustmentService.approve(id, userId);
    return { success: true, data: approved };
  }

  @Patch('adjustments/:id/post')
  @RequirePermission('inventory.approve_adjust')
  @ApiOperation({ summary: 'Post stock adjustment' })
  async postAdjustment(@Param('id') id: string, @Body('userId') userId: string) {
    const posted = await this.stockAdjustmentService.post(id, userId);
    return { success: true, data: posted };
  }

  // ===== STOCK AUDIT ENDPOINTS =====

  @Post('audits')
  @RequirePermission('inventory.audit')
  @ApiOperation({ summary: 'Create stock audit' })
  async createAudit(@Body() body: any) {
    return { success: true, data: await this.stockAuditService.create(body) };
  }

  @Post('audits/:id/items')
  @RequirePermission('inventory.audit')
  @ApiOperation({ summary: 'Add items to audit' })
  async addAuditItems(@Param('id') id: string, @Body('items') items: any) {
    const added = await this.stockAuditService.addItems(id, items);
    return { success: true, data: added };
  }

  @Get('audits')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get all stock audits' })
  async getAllAudits(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.stockAuditService.findAll(paginationParams);
  }

  @Get('audits/:id')
  @RequirePermission('inventory.view')
  @ApiOperation({ summary: 'Get audit by ID' })
  async getAudit(@Param('id') id: string) {
    const audit = await this.stockAuditService.findById(id);
    return { success: true, data: audit };
  }

  @Patch('audits/:id/complete')
  @RequirePermission('inventory.audit')
  @ApiOperation({ summary: 'Complete stock audit' })
  async completeAudit(@Param('id') id: string) {
    const completed = await this.stockAuditService.complete(id);
    return { success: true, data: completed };
  }

  @Patch('audits/:id/approve')
  @RequirePermission('inventory.audit')
  @ApiOperation({ summary: 'Approve stock audit' })
  async approveAudit(@Param('id') id: string, @Body('userId') userId: string) {
    const approved = await this.stockAuditService.approve(id, userId);
    return { success: true, data: approved };
  }

  @Patch('audits/:id/post')
  @RequirePermission('inventory.audit')
  @ApiOperation({ summary: 'Post stock audit' })
  async postAudit(@Param('id') id: string, @Body('userId') userId: string) {
    const posted = await this.stockAuditService.post(id, userId);
    return { success: true, data: posted };
  }
}