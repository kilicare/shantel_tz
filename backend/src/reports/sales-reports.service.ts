import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class SalesReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getSalesByDateRange(startDate: Date, endDate: Date) {
    const invoices = await this.db.invoice.findMany({
      where: { invoiceDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { invoiceDate: 'desc' },
    });
    const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.totalAmount.toNumber(), 0);
    const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.amountPaid.toNumber(), 0);
    const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balance.toNumber(), 0);
    return {
      period: { start: startDate, end: endDate },
      summary: {
        invoiceCount: invoices.length,
        totalRevenue,
        totalPaid,
        totalOutstanding,
        averageInvoiceValue: invoices.length ? totalRevenue / invoices.length : 0,
      },
      invoices: invoices.map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer.name,
        invoiceDate: invoice.invoiceDate,
        totalAmount: invoice.totalAmount.toNumber(),
        amountPaid: invoice.amountPaid.toNumber(),
        balance: invoice.balance.toNumber(),
        itemCount: invoice.items.length,
      })),
    };
  }

  async getSalesBySalesperson(startDate: Date, endDate: Date) {
    const invoices = await this.db.invoice.findMany({
      where: { invoiceDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      include: { createdBy: true },
    });
    const grouped = new Map<string, { invoiceCount: number; totalRevenue: number; totalPaid: number; totalOutstanding: number }>();
    for (const invoice of invoices) {
      const name = invoice.createdBy.name ?? 'Unknown';
      const current = grouped.get(name) ?? { invoiceCount: 0, totalRevenue: 0, totalPaid: 0, totalOutstanding: 0 };
      current.invoiceCount += 1;
      current.totalRevenue += invoice.totalAmount.toNumber();
      current.totalPaid += invoice.amountPaid.toNumber();
      current.totalOutstanding += invoice.balance.toNumber();
      grouped.set(name, current);
    }
    return { period: { start: startDate, end: endDate }, bySalesperson: Array.from(grouped, ([name, data]) => ({ name, ...data })) };
  }

  async getSalesByProduct(startDate: Date, endDate: Date) {
    const items = await this.db.invoiceItem.findMany({
      where: { invoice: { invoiceDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } } },
      include: { product: true },
    });
    const grouped = new Map<string, { name: string; quantity: number; totalSales: number }>();
    for (const item of items) {
      const current = grouped.get(item.productId) ?? { name: item.product.name, quantity: 0, totalSales: 0 };
      current.quantity += item.quantity.toNumber();
      current.totalSales += item.lineTotal.toNumber();
      grouped.set(item.productId, current);
    }
    return { period: { start: startDate, end: endDate }, byProduct: Array.from(grouped.values()).sort((a, b) => b.totalSales - a.totalSales) };
  }

  async getSalesByCustomer(startDate: Date, endDate: Date) {
    const invoices = await this.db.invoice.findMany({
      where: { invoiceDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      include: { customer: true },
    });
    const grouped = new Map<string, { name: string; invoiceCount: number; totalSales: number; totalPaid: number; balance: number }>();
    for (const invoice of invoices) {
      const current = grouped.get(invoice.customerId) ?? { name: invoice.customer.name, invoiceCount: 0, totalSales: 0, totalPaid: 0, balance: 0 };
      current.invoiceCount += 1;
      current.totalSales += invoice.totalAmount.toNumber();
      current.totalPaid += invoice.amountPaid.toNumber();
      current.balance += invoice.balance.toNumber();
      grouped.set(invoice.customerId, current);
    }
    return { period: { start: startDate, end: endDate }, byCustomer: Array.from(grouped.values()).sort((a, b) => b.totalSales - a.totalSales) };
  }
}
