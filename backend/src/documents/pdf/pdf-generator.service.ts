import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PDFGeneratorService {
  private readonly logger = new Logger(PDFGeneratorService.name);

  generatePDF(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(Buffer.from(chunk)));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
        this.buildDocument(doc, data);
        doc.end();
      } catch (error) {
        this.logger.error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
        reject(new BadRequestException('PDF generation failed'));
      }
    });
  }

  private buildDocument(doc: InstanceType<typeof PDFDocument>, data: any) {
    const company = data.company ?? {};
    doc.font('Helvetica-Bold').fontSize(16).text(company.name ?? 'SHANTEL SYSTEMS', { align: 'center' });
    doc.font('Helvetica').fontSize(9).text(company.tin ?? '', { align: 'center' });
    doc.text(company.address ?? '', { align: 'center' });
    doc.text(`Tel: ${company.phone ?? ''} | Email: ${company.email ?? ''}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.font('Helvetica-Bold').fontSize(14).text(data.documentType ?? 'DOCUMENT', { align: 'center' });
    doc.font('Helvetica').fontSize(10).text(`Document #: ${data.documentNumber ?? ''}`, { align: 'center' });
    doc.text(`Date: ${this.formatDate(data.date)}`, { align: 'center' });
    if (data.dueDate) doc.text(`Due Date: ${this.formatDate(data.dueDate)}`, { align: 'center' });

    const party = data.customer ?? data.supplier;
    if (party) {
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(10).text(data.customer ? 'CUSTOMER' : 'SUPPLIER');
      doc.font('Helvetica').fontSize(9).text(party.name ?? '').text(party.address ?? '')
        .text(`Tel: ${party.phone ?? ''}`).text(`Email: ${party.email ?? ''}`);
    }

    if (Array.isArray(data.items) && data.items.length > 0) {
      doc.moveDown(1);
      this.addItemsTable(doc, data.items);
    }

    if (data.total !== undefined || data.subtotal !== undefined || data.amount !== undefined) {
      doc.moveDown(1);
      this.addTotals(doc, data);
    }

    if (data.notes) {
      doc.moveDown(1).font('Helvetica-Bold').fontSize(9).text('Notes:');
      doc.font('Helvetica').fontSize(8).text(data.notes);
    }
    if (data.terms || data.paymentTerms) {
      doc.moveDown(1).font('Helvetica-Bold').fontSize(8).text('Terms & Conditions:');
      doc.font('Helvetica').fontSize(7).text(data.terms ?? data.paymentTerms);
    }

    doc.moveDown(2).font('Helvetica-Oblique').fontSize(8).text(data.footer ?? 'Thank you for your business!', { align: 'center' });
    doc.font('Helvetica').fontSize(7).text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
  }

  private addItemsTable(doc: InstanceType<typeof PDFDocument>, items: any[]) {
    const columns = { item: 50, qty: 260, price: 350, total: 470 };
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(9)
      .text('Item', columns.item, startY).text('Qty', columns.qty, startY)
      .text('Unit Price', columns.price, startY).text('Total', columns.total, startY);
    let y = startY + 18;
    doc.font('Helvetica').fontSize(8);
    for (const item of items) {
      if (y > 730) { doc.addPage(); y = 50; }
      doc.text(item.productName ?? item.description ?? 'Item', columns.item, y, { width: 190 });
      doc.text(String(item.quantity ?? item.returnedQty ?? item.acceptedQty ?? 1), columns.qty, y);
      doc.text(this.money(item.unitPrice ?? item.amount), columns.price, y);
      doc.text(this.money(item.lineTotal ?? item.total), columns.total, y);
      y += 16;
    }
    doc.y = y;
  }

  private addTotals(doc: InstanceType<typeof PDFDocument>, data: any) {
    const rows = [
      ['Subtotal', data.subtotal], ['Discount', data.discount], ['Tax', data.tax],
      ['TOTAL', data.total ?? data.amount], ['Amount Paid', data.amountPaid], ['BALANCE', data.balance],
    ].filter(([, value]) => value !== undefined);
    let y = doc.y;
    for (const [label, value] of rows) {
      doc.font(label === 'TOTAL' || label === 'BALANCE' ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(label === 'TOTAL' ? 11 : 9).text(`${label}:`, 400, y)
        .text(this.money(value), 500, y, { align: 'right' });
      y += 15;
    }
  }

  private money(value: any) {
    return value === undefined || value === null ? '' : Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 });
  }

  private formatDate(value: Date | string | undefined) {
    return value ? new Date(value).toLocaleDateString() : '';
  }
}
