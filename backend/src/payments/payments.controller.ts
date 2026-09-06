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

import { PaymentsService } from './payments.service.js';
import { ReceiptsService } from './receipts/receipts.service.js';
import { RefundsService } from './refunds/refunds.service.js';
import { FinancialReportsService } from './financial-reports.service.js';

@ApiTags('Payments & Financial Flows')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private receiptsService: ReceiptsService,
    private refundsService: RefundsService,
    private reportsService: FinancialReportsService,
    private paginationService: PaginationService,
  ) {}

  // ===== CUSTOMER PAYMENT ENDPOINTS =====

  @Post('customer')
  @RequirePermission('payments.record')
  @ApiOperation({ summary: 'Record customer payment' })
  async recordCustomerPayment(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.paymentsService.recordCustomerPayment({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Post('supplier')
  @RequirePermission('payments.record')
  @ApiOperation({ summary: 'Record supplier payment' })
  async recordSupplierPayment(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.paymentsService.recordSupplierPayment({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('customer/:customerId/payments')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get customer payments' })
  async getCustomerPayments(
    @Param('customerId') customerId: string,
    @Query() query: any,
  ) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.paymentsService.getCustomerPayments(customerId, paginationParams);
  }

  @Get(':id')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get payment by ID' })
  async getPayment(@Param('id') id: string) {
    return {
      success: true,
      data: await this.paymentsService.findById(id),
    };
  }

  @Get()
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get all payments' })
  async getAllPayments(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.paymentsService.findAll(paginationParams);
  }

  @Patch(':id/post')
  @RequirePermission('payments.record')
  @ApiOperation({ summary: 'Post payment' })
  async postPayment(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.paymentsService.post(id, req.user.sub),
    };
  }

  // ===== RECEIPT ENDPOINTS =====

  @Post('receipts')
  @RequirePermission('payments.record')
  @ApiOperation({ summary: 'Generate receipt from payment' })
  async generateReceipt(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.receiptsService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('receipts/all')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get all receipts' })
  async getAllReceipts(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.receiptsService.findAll(paginationParams);
  }

  @Get('receipts/:id')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get receipt by ID' })
  async getReceipt(@Param('id') id: string) {
    return {
      success: true,
      data: await this.receiptsService.findById(id),
    };
  }

  // ===== REFUND ENDPOINTS =====

  @Post('refunds')
  @RequirePermission('payments.record')
  @ApiOperation({ summary: 'Create refund' })
  async createRefund(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.refundsService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('refunds/all')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get all refunds' })
  async getAllRefunds(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.refundsService.findAll(paginationParams);
  }

  @Get('refunds/:id')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get refund by ID' })
  async getRefund(@Param('id') id: string) {
    return {
      success: true,
      data: await this.refundsService.findById(id),
    };
  }

  // ===== FINANCIAL REPORTS ENDPOINTS =====

  @Get('reports/customer/:customerId/summary')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get customer financial summary' })
  async getCustomerSummary(@Param('customerId') customerId: string) {
    return {
      success: true,
      data: await this.reportsService.getCustomerFinancialSummary(customerId),
    };
  }

  @Get('reports/supplier/:supplierId/liability')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get supplier liability' })
  async getSupplierLiability(@Param('supplierId') supplierId: string) {
    return {
      success: true,
      data: await this.reportsService.getSupplierLiability(supplierId),
    };
  }

  @Get('reports/daily/:date')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get daily sales report' })
  async getDailySalesReport(@Param('date') date: string) {
    return {
      success: true,
      data: await this.reportsService.getDailySalesReport(new Date(date)),
    };
  }

  @Get('reports/payment-methods')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get payment method summary' })
  async getPaymentMethodSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return {
      success: true,
      data: await this.reportsService.getPaymentMethodSummary(
        new Date(startDate),
        new Date(endDate),
      ),
    };
  }

  @Get('reports/aging')
  @RequirePermission('payments.view')
  @ApiOperation({ summary: 'Get accounts receivable aging' })
  async getAgingReport() {
    return {
      success: true,
      data: await this.reportsService.getAccountsReceivableAging(),
    };
  }
}