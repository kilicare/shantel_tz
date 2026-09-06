import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfGeneratorService {
  async generateDocumentPdf(data: Record<string, any> = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', (error) => {
        reject(error);
      });

      const companyName = data.companyName ?? 'Shantel Sales & Store';
      const documentType = data.documentType ?? 'DOCUMENT';
      const documentNumber = data.documentNumber ?? 'DOC-000001';
      const issuedAt = data.issuedAt ? new Date(data.issuedAt).toLocaleString() : new Date().toLocaleString();

      doc.fontSize(18).text(companyName, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`${documentType} DOCUMENT`, { underline: true });
      doc.text(`Document Number: ${documentNumber}`);
      doc.text(`Issued At: ${issuedAt}`);
      doc.text(`Status: ${data.status ?? 'DRAFT'}`);
      doc.moveDown();

      if (data.customerName) {
        doc.text(`Customer: ${data.customerName}`);
      }

      if (data.totalAmount !== undefined) {
        doc.text(`Total Amount: ${Number(data.totalAmount).toLocaleString()} ${data.currency ?? 'TZS'}`);
      }

      doc.moveDown();
      doc.text('Summary', { underline: true });
      if (Array.isArray(data.lines) && data.lines.length > 0) {
        data.lines.forEach((line: any, index: number) => {
          doc.text(`${index + 1}. ${line.label ?? 'Item'} - ${line.value ?? ''}`);
        });
      } else {
        doc.text('No line items available.');
      }

      doc.end();
    });
  }
}
