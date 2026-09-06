import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class FinancialReportsService {
  private readonly logger = new Logger(FinancialReportsService.name);

  constructor(private db: DatabaseService) {}

  /**
   * Get customer balance summary
   * Shows invoices, payments, returns, current balance
   */
  async getCustomerFinancialSummary(customerId: string) {
    // Get all invoices
    const invoices = await this.db.invoice.findMany({
      where: { customerId, status: { not: 'CANCELLED' } },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        amountPaid: true,
        balance: true,
        status: true,
      },
    });

    // Get all payments
    const payments = await this.db.payment.findMany({
      where: { customerId },
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        status: true,
        paymentDate: true,
      },
    });

    // Get all returns
    const returns = await this.db.salesReturn.findMany({
      where: { invoice: { customerId } },
      select: {
        refundAmount: true,
        status: true,
      },
    });

    // Calculate totals
    const totalInvoiced = invoices.reduce(
      (sum, inv) => sum + inv.totalAmount.toNumber(),
      0,
    );
    const totalPaid = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const totalReturned = returns.reduce((sum, r) => sum + r.refundAmount.toNumber(), 0);
    const totalBalance = totalInvoiced - totalPaid - totalReturned;

    return {
      customerId,
      totalInvoiced,
      totalPaid,
      totalReturned,
      totalBalance,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      returnCount: returns.length,
      details: {
        invoices,
        payments,
        returns,
      },
    };
  }

  /**
   * Get supplier liability
   */
  async getSupplierLiability(supplierId: string) {
    // Get all GRNs from this supplier
    const grns = await this.db.gRN.findMany({
      where: { supplierId },
      include: {
        items: true,
      },
    });

    // Calculate total received value
    const totalReceived = grns.reduce((sum, grn) => {
      const grnTotal = grn.items.reduce(
        (s, item) => s + item.acceptedQuantity.toNumber() * item.unitCost.toNumber(),
        0,
      );
      return sum + grnTotal;
    }, 0);

    // Get all supplier payments
    const payments = await this.db.payment.findMany({
      where: { customerId: supplierId }, // Using customerId field temporarily for suppliers
      select: {
        amount: true,
      },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const outstandingLiability = totalReceived - totalPaid;

    return {
      supplierId,
      totalReceived,
      totalPaid,
      outstandingLiability,
    };
  }

  /**
   * Get daily sales report
   */
  async getDailySalesReport(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const invoices = await this.db.invoice.findMany({
      where: {
        invoiceDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        customer: true,
      },
    });

    const totalSales = invoices.reduce(
      (sum, inv) => sum + inv.totalAmount.toNumber(),
      0,
    );
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + inv.amountPaid.toNumber(),
      0,
    );
    const totalOutstanding = invoices.reduce(
      (sum, inv) => sum + inv.balance.toNumber(),
      0,
    );

    return {
      date,
      invoiceCount: invoices.length,
      totalSales,
      totalPaid,
      totalOutstanding,
      invoices: invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer.name,
        totalAmount: inv.totalAmount.toNumber(),
        amountPaid: inv.amountPaid.toNumber(),
        balance: inv.balance.toNumber(),
        status: inv.status,
      })),
    };
  }

  /**
   * Get payment method summary
   */
  async getPaymentMethodSummary(startDate: Date, endDate: Date) {
    const payments = await this.db.payment.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        paymentMethod: true,
      },
    });

    const summary: any = {};

    for (const payment of payments) {
      const methodName = payment.paymentMethod.name;
      if (!summary[methodName]) {
        summary[methodName] = {
          count: 0,
          total: 0,
        };
      }

      summary[methodName].count += 1;
      summary[methodName].total += payment.amount.toNumber();
    }

    return {
      startDate,
      endDate,
      summary,
    };
  }

  /**
   * Get account receivables aging
   */
  async getAccountsReceivableAging() {
    const invoices = await this.db.invoice.findMany({
      where: {
        status: { in: ['PARTIALLY_PAID', 'ISSUED'] },
      },
      include: {
        customer: true,
      },
    });

    const today = new Date();
    const aging: {
      current: Array<{ invoiceNumber: string; customer: string; invoiceDate: Date; amount: number; daysOverdue: number }>;
      thirtyPlus: Array<{ invoiceNumber: string; customer: string; invoiceDate: Date; amount: number; daysOverdue: number }>;
      sixtyPlus: Array<{ invoiceNumber: string; customer: string; invoiceDate: Date; amount: number; daysOverdue: number }>;
      ninetyPlus: Array<{ invoiceNumber: string; customer: string; invoiceDate: Date; amount: number; daysOverdue: number }>;
    } = {
      current: [],
      thirtyPlus: [],
      sixtyPlus: [],
      ninetyPlus: [],
    };

    for (const invoice of invoices) {
      const daysOverdue = Math.floor(
        (today.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const item = {
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer.name,
        invoiceDate: invoice.invoiceDate,
        amount: invoice.balance.toNumber(),
        daysOverdue,
      };

      if (daysOverdue <= 30) {
        aging.current.push(item);
      } else if (daysOverdue <= 60) {
        aging.thirtyPlus.push(item);
      } else if (daysOverdue <= 90) {
        aging.sixtyPlus.push(item);
      } else {
        aging.ninetyPlus.push(item);
      }
    }

    const totals = {
      current: aging.current.reduce((sum, item) => sum + item.amount, 0),
      thirtyPlus: aging.thirtyPlus.reduce((sum, item) => sum + item.amount, 0),
      sixtyPlus: aging.sixtyPlus.reduce((sum, item) => sum + item.amount, 0),
      ninetyPlus: aging.ninetyPlus.reduce((sum, item) => sum + item.amount, 0),
    };

    return {
      aging,
      totals,
    };
  }
}