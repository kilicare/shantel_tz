import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class DataIntegrityService {
  private readonly logger = new Logger(DataIntegrityService.name);

  constructor(private readonly db: DatabaseService) {}

  async verifyFinancialConsistency() {
    const invoices = await this.db.invoice.findMany({ include: { payments: true } });
    const issues: Array<Record<string, unknown>> = [];
    for (const invoice of invoices) {
      const totalPayments = invoice.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
      const expectedBalance = invoice.totalAmount.toNumber() - totalPayments;
      const actualBalance = invoice.balance.toNumber();
      if (Math.abs(expectedBalance - actualBalance) > 0.01) {
        issues.push({ type: 'INVOICE_BALANCE_MISMATCH', invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, expectedBalance, actualBalance });
      }
      if (totalPayments > invoice.totalAmount.toNumber() + 0.01) {
        issues.push({ type: 'INVOICE_OVERPAYMENT', invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, totalPayments, invoiceTotal: invoice.totalAmount.toNumber() });
      }
    }
    return { status: issues.length === 0 ? 'OK' : 'ISSUES_FOUND', issueCount: issues.length, issues };
  }

  async verifyInventoryConsistency() {
    const [products, movements] = await Promise.all([
      this.db.product.findMany({ select: { id: true, sku: true } }),
      this.db.inventoryMovement.findMany(),
    ]);
    const balances = await this.db.stockBalance.findMany();
    const issues: Array<Record<string, unknown>> = [];
    for (const product of products) {
      const productMovements = movements.filter((movement) => movement.productId === product.id);
      const productBalances = balances.filter((balance) => balance.productId === product.id);
      const calculatedBalance = productMovements.reduce((sum, movement) => sum + movement.quantityIn.toNumber() - movement.quantityOut.toNumber(), 0);
      const actualBalance = productBalances.reduce((sum, balance) => sum + balance.quantity.toNumber(), 0);
      if (Math.abs(calculatedBalance - actualBalance) > 0.01) {
        issues.push({ type: 'STOCK_BALANCE_MISMATCH', productId: product.id, sku: product.sku, calculatedBalance, actualBalance });
      }
    }
    return { status: issues.length === 0 ? 'OK' : 'ISSUES_FOUND', issueCount: issues.length, issues };
  }

  async verifyUniqueConstraints() {
    const [products, serials] = await Promise.all([
      this.db.product.findMany({ select: { id: true, sku: true, barcode: true } }),
      this.db.serialNumber.findMany({ select: { id: true, productId: true, serialNumber: true } }),
    ]);
    const issues: Array<Record<string, unknown>> = [];
    const duplicates = (values: Array<{ key: string; id: string }>, type: string) => {
      const grouped = new Map<string, string[]>();
      for (const value of values) grouped.set(value.key, [...(grouped.get(value.key) ?? []), value.id]);
      for (const [key, ids] of grouped) if (ids.length > 1) issues.push({ type, key, ids });
    };
    duplicates(products.map((product) => ({ key: product.sku, id: product.id })), 'DUPLICATE_SKU');
    duplicates(products.filter((product) => product.barcode).map((product) => ({ key: product.barcode as string, id: product.id })), 'DUPLICATE_BARCODE');
    duplicates(serials.map((serial) => ({ key: `${serial.productId}:${serial.serialNumber}`, id: serial.id })), 'DUPLICATE_SERIAL');
    return { status: issues.length === 0 ? 'OK' : 'ISSUES_FOUND', issueCount: issues.length, issues };
  }

  async runFullIntegrityCheck() {
    const checks = {
      financial: await this.verifyFinancialConsistency(),
      inventory: await this.verifyInventoryConsistency(),
      constraints: await this.verifyUniqueConstraints(),
    };
    const hasIssues = Object.values(checks).some((check) => check.status !== 'OK');
    return { timestamp: new Date(), checks, overallStatus: hasIssues ? 'ISSUES_FOUND' : 'OK' };
  }

  async checkInventoryConsistency() {
    const result = await this.verifyInventoryConsistency();
    return { checkedAt: new Date().toISOString(), ...result, mismatches: result.issues };
  }

  async checkDocumentNumbering() {
    const sequences = await this.db.documentSequence.findMany({ orderBy: { documentType: 'asc' } });
    const invalidSequences = sequences.map((sequence) => {
      const issues: string[] = [];
      if (!sequence.documentType.trim()) issues.push('missing document type');
      if (!sequence.prefix.trim()) issues.push('blank prefix');
      if (Number(sequence.currentNumber) < 0) issues.push('negative current number');
      if (sequence.padding < 1 || sequence.padding > 12) issues.push('padding is outside supported range');
      return issues.length ? { documentType: sequence.documentType, prefix: sequence.prefix, issue: issues.join('; ') } : null;
    }).filter((value): value is { documentType: string; prefix: string; issue: string } => value !== null);
    return { checkedAt: new Date().toISOString(), totalSequences: sequences.length, sequences, invalidSequences, isHealthy: invalidSequences.length === 0 };
  }

  async checkUserRoleIntegrity() {
    const users = await this.db.user.findMany({ include: { userRoles: true } });
    const usersWithoutRole = users.filter((user) => user.userRoles.length === 0).map((user) => ({ id: user.id, email: user.email, name: user.name }));
    return { checkedAt: new Date().toISOString(), usersWithoutRole, totalUsers: users.length, isHealthy: usersWithoutRole.length === 0 };
  }
}
