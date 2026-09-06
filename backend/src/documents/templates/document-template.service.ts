import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class DocumentTemplateService {
  constructor(private readonly db: DatabaseService) {}

  async getCompanyInfo() {
    const settings = await this.db.companySetting.findFirst();
    return {
      name: settings?.companyName ?? 'SHANTEL SYSTEMS',
      tin: settings?.tinNumber ?? 'TIN: 123-456-789',
      address: settings?.address ?? 'Dar es Salaam, Tanzania',
      phone: settings?.phone ?? '+255 xxx xxx xxx',
      email: settings?.email ?? 'info@shantel.local',
      website: settings?.website ?? 'www.shantel.local',
      logo: settings?.logo ?? null,
      currency: settings?.currency ?? 'TZS',
    };
  }

  private customer(customer: any) {
    return {
      name: customer.name,
      address: customer.address,
      phone: customer.phone,
      email: customer.email,
    };
  }

  private productItems(items: any[], priceField = 'unitPrice') {
    return items.map((item) => ({
      productName: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity?.toNumber(),
      unitPrice: item[priceField]?.toNumber(),
      discount: item.discountPercent?.toNumber() ?? 0,
      lineTotal: item.lineTotal?.toNumber(),
    }));
  }

  private totals(document: any) {
    return {
      subtotal: document.subtotal?.toNumber() ?? 0,
      discount: document.discountAmount?.toNumber() ?? 0,
      tax: document.taxAmount?.toNumber() ?? 0,
      total: document.totalAmount?.toNumber() ?? 0,
    };
  }

  async buildQuotationTemplate(id: string) {
    const quotation = await this.db.quotation.findUnique({
      where: { id }, include: { customer: true, items: { include: { product: true } } },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return {
      documentType: 'QUOTATION', documentNumber: quotation.quotationNumber,
      date: quotation.quotationDate, company: await this.getCompanyInfo(),
      customer: this.customer(quotation.customer), items: this.productItems(quotation.items),
      ...this.totals(quotation), validUntil: quotation.validUntil, notes: quotation.notes,
      terms: 'Payment terms: Net 30 days from invoice date', footer: 'Thank you for your business!',
    };
  }

  async buildSalesOrderTemplate(id: string) {
    const order = await this.db.salesOrder.findUnique({
      where: { id }, include: { customer: true, items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Sales order not found');
    return {
      documentType: 'SALES_ORDER', documentNumber: order.orderNumber,
      date: order.orderDate, company: await this.getCompanyInfo(),
      customer: this.customer(order.customer), items: this.productItems(order.items),
      ...this.totals(order), dueDate: order.dueDate, notes: order.notes,
      terms: 'Payment terms: Net 30 days from invoice date', footer: 'Thank you for your order!',
    };
  }

  async buildInvoiceTemplate(id: string) {
    const invoice = await this.db.invoice.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } }, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const amountPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    return {
      documentType: 'INVOICE', documentNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate, dueDate: invoice.dueDate,
      company: await this.getCompanyInfo(), customer: this.customer(invoice.customer),
      items: this.productItems(invoice.items), ...this.totals(invoice),
      amountPaid, balance: invoice.balance.toNumber(), status: invoice.status,
      paymentMethods: 'Bank Transfer, Mobile Money, Cash',
      bankDetails: 'Bank: Tanzania Commercial Bank (TCB)\nAccount: 1234567890\nBranch: Dar es Salaam',
      terms: 'Payment terms: Net 30 days from invoice date', footer: 'Thank you for your business!',
    };
  }

  async buildReceiptTemplate(id: string) {
    const receipt = await this.db.receipt.findUnique({
      where: { id }, include: { customer: true, payment: true, invoice: true },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return {
      documentType: 'RECEIPT', documentNumber: receipt.receiptNumber,
      date: receipt.receiptDate, company: await this.getCompanyInfo(),
      customer: this.customer(receipt.customer), paymentMethod: receipt.payment.transactionReference ?? 'Not specified',
      invoiceNumber: receipt.invoice?.invoiceNumber ?? 'N/A', amount: receipt.amount.toNumber(),
      amountInWords: this.numberToWords(receipt.amount.toNumber()), notes: receipt.notes,
      footer: 'This is an official receipt. Please keep for your records.',
    };
  }

  async buildPurchaseOrderTemplate(id: string) {
    const order = await this.db.purchaseOrder.findUnique({
      where: { id }, include: { supplier: true, items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    return {
      documentType: 'PURCHASE_ORDER', documentNumber: order.poNumber,
      date: order.orderDate, expectedDate: order.expectedDate, company: await this.getCompanyInfo(),
      supplier: this.customer(order.supplier), items: this.productItems(order.items, 'unitCost'),
      ...this.totals(order), deliveryAddress: (await this.getCompanyInfo()).address,
      paymentTerms: order.terms ?? 'Net 30 days from delivery', notes: order.notes,
      footer: 'Please confirm receipt of this order',
    };
  }

  async buildGRNTemplate(id: string) {
    const grn = await this.db.gRN.findUnique({
      where: { id }, include: { supplier: true, purchaseOrder: true, items: { include: { product: true } } },
    });
    if (!grn) throw new NotFoundException('GRN not found');
    return {
      documentType: 'GRN', documentNumber: grn.grnNumber, date: grn.receivedDate,
      company: await this.getCompanyInfo(), supplier: this.customer(grn.supplier),
      poNumber: grn.purchaseOrder.poNumber,
      items: grn.items.map((item) => ({ productName: item.product.name, sku: item.product.sku,
        orderedQty: item.orderedQuantity.toNumber(), receivedQty: item.receivedQuantity.toNumber(),
        acceptedQty: item.acceptedQuantity.toNumber(), rejectedQty: item.rejectedQuantity.toNumber(),
        unitPrice: item.unitCost.toNumber(), lineTotal: item.lineTotal.toNumber() })),
      reference: grn.reference, notes: grn.notes, footer: 'Goods Received Note - Sign and stamp',
    };
  }

  async buildSalesReturnTemplate(id: string) {
    const salesReturn = await this.db.salesReturn.findUnique({
      where: { id }, include: { customer: true, invoice: true, items: { include: { product: true } } },
    });
    if (!salesReturn) throw new NotFoundException('Sales return not found');
    return {
      documentType: 'SALES_RETURN', documentNumber: salesReturn.returnNumber,
      date: salesReturn.returnDate, company: await this.getCompanyInfo(), customer: this.customer(salesReturn.customer),
      originalInvoice: salesReturn.invoice.invoiceNumber,
      items: salesReturn.items.map((item) => ({ productName: item.product.name, sku: item.product.sku,
        returnedQty: item.returnedQuantity.toNumber(), acceptedQty: item.acceptedQuantity.toNumber(),
        unitPrice: item.unitPrice.toNumber(), lineTotal: item.lineTotal.toNumber(), reason: item.reason })),
      refundAmount: salesReturn.refundAmount.toNumber(), total: salesReturn.refundAmount.toNumber(),
      notes: salesReturn.notes, footer: 'Sales Return Note - Original invoice must be provided',
    };
  }

  private numberToWords(value: number) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (number: number): string => {
      if (number < 20) return ones[number];
      if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ''}`;
      if (number < 1000) return `${ones[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${convert(number % 100)}` : ''}`;
      if (number < 1_000_000) return `${convert(Math.floor(number / 1000))} Thousand${number % 1000 ? ` ${convert(number % 1000)}` : ''}`;
      return `${convert(Math.floor(number / 1_000_000))} Million${number % 1_000_000 ? ` ${convert(number % 1_000_000)}` : ''}`;
    };
    return `${convert(Math.floor(value)) || 'Zero'} Only`;
  }
}
