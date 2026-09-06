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

import { QuotationsService } from './quotations/quotations.service.js';
import { SalesOrdersService } from './sales-orders/sales-orders.service.js';
import { InvoicesService } from './invoices/invoices.service.js';
import { SalesReturnsService } from './returns/sales-returns.service.js';

@ApiTags('Sales - Quotations, Orders, Invoices')
@Controller('sales')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(
    private quotationsService: QuotationsService,
    private salesOrdersService: SalesOrdersService,
    private invoicesService: InvoicesService,
    private returnsService: SalesReturnsService,
    private paginationService: PaginationService,
  ) {}

  // ===== QUOTATION ENDPOINTS =====

  @Post('quotations')
  @RequirePermission('quotations.create')
  @ApiOperation({ summary: 'Create quotation' })
  async createQuotation(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.quotationsService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('quotations')
  @RequirePermission('quotations.view')
  @ApiOperation({ summary: 'Get all quotations' })
  async getAllQuotations(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.quotationsService.findAll(paginationParams);
  }

  @Get('quotations/search')
  @RequirePermission('quotations.view')
  @ApiOperation({ summary: 'Search quotations' })
  async searchQuotations(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.quotationsService.search(query.q, paginationParams);
  }

  @Get('quotations/:id')
  @RequirePermission('quotations.view')
  @ApiOperation({ summary: 'Get quotation by ID' })
  async getQuotation(@Param('id') id: string) {
    return {
      success: true,
      data: await this.quotationsService.findById(id),
    };
  }

  @Patch('quotations/:id/send')
  @RequirePermission('quotations.edit')
  @ApiOperation({ summary: 'Send quotation' })
  async sendQuotation(@Param('id') id: string) {
    return {
      success: true,
      data: await this.quotationsService.send(id),
    };
  }

  @Patch('quotations/:id/accept')
  @RequirePermission('quotations.edit')
  @ApiOperation({ summary: 'Accept quotation' })
  async acceptQuotation(@Param('id') id: string) {
    return {
      success: true,
      data: await this.quotationsService.accept(id),
    };
  }

  @Post('quotations/:id/convert-to-so')
  @RequirePermission('sales_orders.create')
  @ApiOperation({ summary: 'Convert quotation to sales order' })
  async convertQuotationToSO(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.quotationsService.convertToSalesOrder(id, req.user.sub),
    };
  }

  // ===== SALES ORDER ENDPOINTS =====

  @Post('orders')
  @RequirePermission('sales_orders.create')
  @ApiOperation({ summary: 'Create sales order' })
  async createSalesOrder(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.salesOrdersService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('orders')
  @RequirePermission('sales_orders.view')
  @ApiOperation({ summary: 'Get all sales orders' })
  async getAllSalesOrders(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.salesOrdersService.findAll(paginationParams);
  }

  @Get('orders/:id')
  @RequirePermission('sales_orders.view')
  @ApiOperation({ summary: 'Get sales order by ID' })
  async getSalesOrder(@Param('id') id: string) {
    return {
      success: true,
      data: await this.salesOrdersService.findById(id),
    };
  }

  @Patch('orders/:id/approve')
  @RequirePermission('sales_orders.approve')
  @ApiOperation({ summary: 'Approve sales order' })
  async approveSalesOrder(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.salesOrdersService.approve(id, req.user.sub),
    };
  }

  @Post('orders/:id/convert-to-invoice')
  @RequirePermission('invoices.create')
  @ApiOperation({ summary: 'Convert sales order to invoice' })
  async convertSOToInvoice(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.salesOrdersService.convertToInvoice(id, req.user.sub),
    };
  }

  // ===== INVOICE ENDPOINTS =====

  @Post('invoices')
  @RequirePermission('invoices.create')
  @ApiOperation({ summary: 'Create invoice (direct or from SO)' })
  async createInvoice(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.invoicesService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('invoices')
  @RequirePermission('invoices.view')
  @ApiOperation({ summary: 'Get all invoices' })
  async getAllInvoices(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.invoicesService.findAll(paginationParams);
  }

  @Get('invoices/search')
  @RequirePermission('invoices.view')
  @ApiOperation({ summary: 'Search invoices' })
  async searchInvoices(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.invoicesService.search(query.q, paginationParams);
  }

  @Get('invoices/:id')
  @RequirePermission('invoices.view')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoice(@Param('id') id: string) {
    return {
      success: true,
      data: await this.invoicesService.findById(id),
    };
  }

  @Patch('invoices/:id/post')
  @RequirePermission('invoices.post')
  @ApiOperation({ summary: 'Post invoice (DEDUCT STOCK)' })
  async postInvoice(
    @Param('id') id: string,
    @Body() body: { locationId: string },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.invoicesService.post(id, body.locationId, req.user.sub),
    };
  }

  @Post('invoices/:id/record-payment')
  @RequirePermission('payments.record')
  @ApiOperation({ summary: 'Record payment for invoice' })
  async recordPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; paymentMethodId: string },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.invoicesService.recordPayment(
        id,
        body.amount,
        body.paymentMethodId,
        req.user.sub,
      ),
    };
  }

  @Get('customers/:customerId/balance')
  @RequirePermission('invoices.view')
  @ApiOperation({ summary: 'Get customer balance' })
  async getCustomerBalance(@Param('customerId') customerId: string) {
    return {
      success: true,
      data: await this.invoicesService.getCustomerBalance(customerId),
    };
  }

  // ===== SALES RETURN ENDPOINTS =====

  @Post('returns')
  @RequirePermission('sales_returns.create')
  @ApiOperation({ summary: 'Create sales return' })
  async createReturn(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.returnsService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('returns')
  @RequirePermission('sales_returns.view')
  @ApiOperation({ summary: 'Get all sales returns' })
  async getAllReturns(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.returnsService.findAll(paginationParams);
  }

  @Get('returns/:id')
  @RequirePermission('sales_returns.view')
  @ApiOperation({ summary: 'Get sales return by ID' })
  async getReturn(@Param('id') id: string) {
    return {
      success: true,
      data: await this.returnsService.findById(id),
    };
  }

  @Patch('returns/:id/approve')
  @RequirePermission('sales_returns.approve')
  @ApiOperation({ summary: 'Approve sales return' })
  async approveReturn(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.returnsService.approve(id, req.user.sub),
    };
  }

  @Patch('returns/:id/post')
  @RequirePermission('sales_returns.approve')
  @ApiOperation({ summary: 'Post sales return (return stock)' })
  async postReturn(
    @Param('id') id: string,
    @Body() body: { locationId: string },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.returnsService.post(id, body.locationId, req.user.sub),
    };
  }
}