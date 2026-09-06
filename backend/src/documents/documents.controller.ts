import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RbacGuard } from '../common/guards/rbac.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { DocumentSequenceService } from './document-sequence.service.js';
import { DocumentTemplateService } from './templates/document-template.service.js';
import { PDFGeneratorService } from './pdf/pdf-generator.service.js';

@ApiTags('Documents, Printing & Numbering')
@Controller('documents')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(
    private readonly sequenceService: DocumentSequenceService,
    private readonly templateService: DocumentTemplateService,
    private readonly pdfService: PDFGeneratorService,
  ) {}

  @Get('sequences')
  @RequirePermission('documents.view')
  @ApiOperation({ summary: 'Get all document sequences' })
  async listSequences() {
    return { success: true, data: await this.sequenceService.getAllSequences() };
  }

  @Get('sequences/:type')
  @RequirePermission('documents.view')
  async getSequence(@Param('type') type: string) {
    return { success: true, data: await this.sequenceService.getSequence(type) };
  }

  @Patch('sequences/:type/prefix')
  @RequirePermission('documents.configure')
  async updatePrefix(@Param('type') type: string, @Body() body: { prefix: string }) {
    return { success: true, data: await this.sequenceService.updatePrefix(type, body.prefix) };
  }

  @Patch('sequences/:type/reset')
  @RequirePermission('documents.configure')
  async resetSequence(@Param('type') type: string) {
    return { success: true, data: await this.sequenceService.resetSequence(type) };
  }

  @Get('quotations/:id/preview')
  @RequirePermission('quotations.view')
  previewQuotation(@Param('id') id: string) { return this.templateService.buildQuotationTemplate(id); }

  @Get('sales-orders/:id/preview')
  @RequirePermission('sales_orders.view')
  previewSalesOrder(@Param('id') id: string) { return this.templateService.buildSalesOrderTemplate(id); }

  @Get('invoices/:id/preview')
  @RequirePermission('invoices.view')
  previewInvoice(@Param('id') id: string) { return this.templateService.buildInvoiceTemplate(id); }

  @Get('receipts/:id/preview')
  @RequirePermission('payments.view')
  previewReceipt(@Param('id') id: string) { return this.templateService.buildReceiptTemplate(id); }

  @Get('purchase-orders/:id/preview')
  @RequirePermission('purchase_orders.view')
  previewPurchaseOrder(@Param('id') id: string) { return this.templateService.buildPurchaseOrderTemplate(id); }

  @Get('grns/:id/preview')
  @RequirePermission('grns.view')
  previewGRN(@Param('id') id: string) { return this.templateService.buildGRNTemplate(id); }

  @Get('sales-returns/:id/preview')
  @RequirePermission('sales_returns.view')
  previewSalesReturn(@Param('id') id: string) { return this.templateService.buildSalesReturnTemplate(id); }

  @Get(':type/:id/print-pdf')
  @RequirePermission('documents.print')
  async printPDF(@Param('type') type: string, @Param('id') id: string, @Res() response: Response) {
    const builders: Record<string, (value: string) => Promise<any>> = {
      quotations: (value) => this.templateService.buildQuotationTemplate(value),
      'sales-orders': (value) => this.templateService.buildSalesOrderTemplate(value),
      invoices: (value) => this.templateService.buildInvoiceTemplate(value),
      receipts: (value) => this.templateService.buildReceiptTemplate(value),
      'purchase-orders': (value) => this.templateService.buildPurchaseOrderTemplate(value),
      grns: (value) => this.templateService.buildGRNTemplate(value),
      'sales-returns': (value) => this.templateService.buildSalesReturnTemplate(value),
    };
    const builder = builders[type.toLowerCase()];
    if (!builder) throw new BadRequestException(`Unsupported document type: ${type}`);
    const template = await builder(id);
    const pdf = await this.pdfService.generatePDF(template);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${type}-${template.documentNumber}.pdf"`,
      'Content-Length': pdf.length,
    });
    return response.send(pdf);
  }

  @Post('sequences/ensure')
  @RequirePermission('documents.view')
  async ensureSequence(@Body() body: { documentType: string; prefix?: string; padding?: number }) {
    return this.sequenceService.ensureSequence(body.documentType, body.prefix, body.padding ?? 6);
  }

  @Get('sequence/:documentType/next')
  @RequirePermission('documents.view')
  async nextSequenceNumber(@Param('documentType') documentType: string) {
    return { success: true, data: await this.sequenceService.getNextNumber(documentType) };
  }
}
