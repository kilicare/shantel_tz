import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly db: DatabaseService) {}

  async getDashboardMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todaySales, openInvoices, pendingApprovals, balances, recentInvoices, recentPOs] =
      await Promise.all([
        this.db.invoice.findMany({
          where: {
            invoiceDate: { gte: today, lt: tomorrow },
            status: { in: ['ISSUED', 'PARTIALLY_PAID', 'PAID'] },
          },
          select: { totalAmount: true, amountPaid: true },
        }),
        this.db.invoice.findMany({
          where: { status: { in: ['PARTIALLY_PAID', 'ISSUED'] } },
          select: { balance: true },
        }),
        this.db.approval.count({ where: { approvalDecision: 'PENDING' } }),
        this.db.stockBalance.findMany({
          include: { product: true, location: true },
          orderBy: { quantity: 'asc' },
        }),
        this.db.invoice.findMany({
          take: 5,
          include: { customer: true },
          orderBy: { invoiceDate: 'desc' },
        }),
        this.db.purchaseOrder.findMany({
          take: 5,
          include: { supplier: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const lowStockItems = balances
      .filter((item) => item.quantity.toNumber() <= item.product.minimumStockLevel)
      .slice(0, 10);

    return {
      todaySales: {
        count: todaySales.length,
        totalAmount: todaySales.reduce((sum, invoice) => sum + invoice.totalAmount.toNumber(), 0),
        totalPaid: todaySales.reduce((sum, invoice) => sum + invoice.amountPaid.toNumber(), 0),
      },
      openInvoices: {
        count: openInvoices.length,
        totalBalance: openInvoices.reduce((sum, invoice) => sum + invoice.balance.toNumber(), 0),
      },
      pendingApprovals,
      lowStockItems: lowStockItems.map((item) => ({
        product: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity.toNumber(),
        minimumStockLevel: item.product.minimumStockLevel,
        location: item.location.name,
      })),
      stock: {
        totalItems: new Set(balances.map((item) => item.productId)).size,
        totalQuantity: balances.reduce((sum, item) => sum + item.quantity.toNumber(), 0),
      },
      recentTransactions: {
        invoices: recentInvoices.map((invoice) => ({
          number: invoice.invoiceNumber,
          customer: invoice.customer.name,
          amount: invoice.totalAmount.toNumber(),
          date: invoice.invoiceDate,
        })),
        purchaseOrders: recentPOs.map((order) => ({
          number: order.poNumber,
          supplier: order.supplier.name,
          amount: order.totalAmount.toNumber(),
          date: order.orderDate,
        })),
      },
    };
  }

  async getSalesTrend() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await this.db.invoice.findMany({
      where: {
        invoiceDate: { gte: start, lte: end },
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'PAID'] },
      },
      select: { invoiceDate: true, totalAmount: true },
    });
    const totals = new Map<string, number>();
    for (const invoice of invoices) {
      const key = invoice.invoiceDate.toISOString().slice(0, 10);
      totals.set(key, (totals.get(key) ?? 0) + invoice.totalAmount.toNumber());
    }

    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, sales: totals.get(key) ?? 0 };
    });
  }

  async getTopCustomers(limit = 10) {
    const customers = await this.db.customer.findMany({
      include: { invoices: { where: { status: { not: 'CANCELLED' } }, select: { totalAmount: true, balance: true } } },
    });
    return customers
      .map((customer) => ({
        name: customer.name,
        totalSales: customer.invoices.reduce((sum, invoice) => sum + invoice.totalAmount.toNumber(), 0),
        outstandingBalance: customer.invoices.reduce((sum, invoice) => sum + invoice.balance.toNumber(), 0),
        invoiceCount: customer.invoices.length,
      }))
      .filter((customer) => customer.invoiceCount > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit);
  }

  async getTopProducts(limit = 10) {
    const products = await this.db.product.findMany({
      include: { invoiceItems: { include: { invoice: { select: { status: true } } } } },
    });
    return products
      .map((product) => {
        const items = product.invoiceItems.filter((item) => item.invoice.status !== 'CANCELLED');
        return {
          name: product.name,
          sku: product.sku,
          quantitySold: items.reduce((sum, item) => sum + item.quantity.toNumber(), 0),
          totalSales: items.reduce((sum, item) => sum + item.lineTotal.toNumber(), 0),
        };
      })
      .filter((product) => product.quantitySold > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit);
  }
}
