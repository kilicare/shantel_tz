import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  exportToExcel(data: Record<string, unknown>[], sheetName = 'Report'): Buffer {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
      return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown export error';
      this.logger.error(`Excel export failed: ${message}`);
      throw new BadRequestException('Excel export failed');
    }
  }

  exportToCsv(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const escape = (value: unknown) => {
      const text = value instanceof Date ? value.toISOString() : String(value ?? '');
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return [headers, ...data.map((row) => headers.map((header) => row[header]))]
      .map((row) => row.map(escape).join(','))
      .join('\n');
  }

  exportToPdf(title: string, data: Record<string, unknown>[], columns: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
      document.moveDown(0.5).fontSize(9).font('Helvetica').text(`Generated: ${new Date().toISOString()}`, { align: 'right' });
      document.moveDown();
      const width = document.page.width - 80;
      const columnWidth = width / columns.length;
      let y = document.y;
      const drawHeader = () => {
        document.font('Helvetica-Bold').fontSize(8);
        columns.forEach((column, index) => document.text(column, 40 + index * columnWidth, y, { width: columnWidth - 4 }));
        y += 18;
      };
      drawHeader();
      document.font('Helvetica').fontSize(7);
      for (const row of data) {
        if (y > document.page.height - 50) {
          document.addPage();
          y = 40;
          drawHeader();
        }
        columns.forEach((column, index) => {
          const value = row[column] ?? row[column.charAt(0).toLowerCase() + column.slice(1)] ?? '';
          document.text(String(value), 40 + index * columnWidth, y, { width: columnWidth - 4, height: 14, ellipsis: true });
        });
        y += 15;
      }
      document.end();
    });
  }
}
