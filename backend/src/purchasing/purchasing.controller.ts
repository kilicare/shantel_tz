import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { PaginationService } from '../shared/services/pagination.service.js';

import { RequisitionsService } from './requisitions/requisitions.service.js';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service.js';
import { GRNService } from './grns/grns.service.js';
import { PurchaseReturnsService } from './returns/purchase-returns.service.js';

@ApiTags('Purchasing - POs, GRNs, Returns')
@Controller('purchasing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PurchasingController {
  constructor(
    private requisitionsService: RequisitionsService,
    private poService: PurchaseOrdersService,
    private grnService: GRNService,
    private returnService: PurchaseReturnsService,
    private paginationService: PaginationService,
  ) {}

  // ===== REQUISITION ENDPOINTS =====

  @Post('requisitions')
  @RequirePermission('purchase_orders.create')
  @ApiOperation({ summary: 'Create purchase requisition' })
  async createRequisition(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.requisitionsService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('requisitions')
  @RequirePermission('purchase_orders.view')
  @ApiOperation({ summary: 'Get all requisitions' })
  async getAllRequisitions(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.requisitionsService.findAll(paginationParams);
  }

  @Get('requisitions/:id')
  @RequirePermission('purchase_orders.view')
  @ApiOperation({ summary: 'Get requisition by ID' })
  async getRequisition(@Param('id') id: string) {
    return {
      success: true,
      data: await this.requisitionsService.findById(id),
    };
  }

  @Patch('requisitions/:id/approve')
  @RequirePermission('purchase_orders.approve')
  @ApiOperation({ summary: 'Approve requisition' })
  async approveRequisition(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.requisitionsService.approve(id, req.user.sub),
    };
  }

  @Post('requisitions/:id/convert-to-po')
  @RequirePermission('purchase_orders.create')
  @ApiOperation({ summary: 'Convert requisition to PO' })
  async convertToPO(
    @Param('id') id: string,
    @Body() body: { supplierId: string },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.requisitionsService.convertToPO(id, body.supplierId, req.user.sub),
    };
  }

  // ===== PURCHASE ORDER ENDPOINTS =====

  @Post('purchase-orders')
  @RequirePermission('purchase_orders.create')
  @ApiOperation({ summary: 'Create purchase order' })
  async createPO(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.poService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('purchase-orders')
  @RequirePermission('purchase_orders.view')
  @ApiOperation({ summary: 'Get all purchase orders' })
  async getAllPOs(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.poService.findAll(paginationParams);
  }

  @Get('purchase-orders/:id')
  @RequirePermission('purchase_orders.view')
  @ApiOperation({ summary: 'Get PO by ID' })
  async getPO(@Param('id') id: string) {
    return {
      success: true,
      data: await this.poService.findById(id),
    };
  }

  @Get('purchase-orders/:id/receiving-status')
  @RequirePermission('purchase_orders.view')
  @ApiOperation({ summary: 'Get PO receiving status' })
  async getPOReceivingStatus(@Param('id') id: string) {
    return {
      success: true,
      data: await this.poService.getReceivingStatus(id),
    };
  }

  @Patch('purchase-orders/:id/approve')
  @RequirePermission('purchase_orders.approve')
  @ApiOperation({ summary: 'Approve PO' })
  async approvePO(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.poService.approve(id, req.user.sub),
    };
  }

  @Patch('purchase-orders/:id/post')
  @RequirePermission('purchase_orders.approve')
  @ApiOperation({ summary: 'Post PO' })
  async postPO(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.poService.post(id, req.user.sub),
    };
  }

  // ===== GRN ENDPOINTS =====

  @Post('grns')
  @RequirePermission('grns.create')
  @ApiOperation({ summary: 'Create GRN' })
  async createGRN(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.grnService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('grns')
  @RequirePermission('grns.view')
  @ApiOperation({ summary: 'Get all GRNs' })
  async getAllGRNs(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.grnService.findAll(paginationParams);
  }

  @Get('grns/:id')
  @RequirePermission('grns.view')
  @ApiOperation({ summary: 'Get GRN by ID' })
  async getGRN(@Param('id') id: string) {
    return {
      success: true,
      data: await this.grnService.findById(id),
    };
  }

  @Patch('grns/:id/post')
  @RequirePermission('grns.post')
  @ApiOperation({ summary: 'Post GRN (increase stock)' })
  async postGRN(
    @Param('id') id: string,
    @Body() body: { locationId: string },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.grnService.post(id, body.locationId, req.user.sub),
    };
  }

  // ===== PURCHASE RETURN ENDPOINTS =====

  @Post('purchase-returns')
  @RequirePermission('purchase_returns.create')
  @ApiOperation({ summary: 'Create purchase return' })
  async createReturn(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.returnService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('purchase-returns')
  @RequirePermission('purchase_returns.view')
  @ApiOperation({ summary: 'Get all purchase returns' })
  async getAllReturns(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.returnService.findAll(paginationParams);
  }

  @Get('purchase-returns/:id')
  @RequirePermission('purchase_returns.view')
  @ApiOperation({ summary: 'Get purchase return by ID' })
  async getReturn(@Param('id') id: string) {
    return {
      success: true,
      data: await this.returnService.findById(id),
    };
  }

  @Patch('purchase-returns/:id/approve')
  @RequirePermission('purchase_returns.create')
  @ApiOperation({ summary: 'Approve purchase return' })
  async approveReturn(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.returnService.approve(id, req.user.sub),
    };
  }

  @Patch('purchase-returns/:id/post')
  @RequirePermission('purchase_returns.create')
  @ApiOperation({ summary: 'Post purchase return' })
  async postReturn(
    @Param('id') id: string,
    @Body() body: { locationId: string },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.returnService.post(id, body.locationId, req.user.sub),
    };
  }
}