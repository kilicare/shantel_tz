import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class TraceabilityService {
  constructor(private readonly db: DatabaseService) {}

  async getSalesTraceChain(invoiceId: string) {
    const invoice = await this.db.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, items: { include: { product: true } }, payments: true, receipts: true, salesReturns: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return {
      type: 'SALES_CHAIN',
      invoice: {
        id: invoice.id, number: invoice.invoiceNumber, date: invoice.invoiceDate,
        customer: invoice.customer.name, total: invoice.totalAmount.toNumber(),
        items: invoice.items.map((item) => ({ product: item.product.name, sku: item.product.sku, quantity: item.quantity.toNumber() })),
      },
      payments: invoice.payments.map((payment) => ({ number: payment.paymentNumber, amount: payment.amount.toNumber(), date: payment.paymentDate, method: payment.paymentMethodId, status: payment.status })),
      receipts: invoice.receipts.map((receipt) => ({ number: receipt.receiptNumber, amount: receipt.amount.toNumber(), date: receipt.receiptDate })),
      returns: invoice.salesReturns.map((salesReturn) => ({ number: salesReturn.returnNumber, refund: salesReturn.refundAmount.toNumber(), date: salesReturn.returnDate, status: salesReturn.status })),
    };
  }

  async getPurchasingTraceChain(poId: string) {
    const order = await this.db.purchaseOrder.findUnique({
      where: { id: poId },
      include: { supplier: true, items: { include: { product: true } }, grns: { include: { items: true } }, payments: true },
    });
    if (!order) throw new NotFoundException('PO not found');
    return {
      type: 'PURCHASING_CHAIN',
      requisition: order.requisitionId ? { id: order.requisitionId } : null,
      po: {
        id: order.id, number: order.poNumber, date: order.orderDate, supplier: order.supplier.name,
        total: order.totalAmount.toNumber(), items: order.items.map((item) => ({ product: item.product.name, sku: item.product.sku, orderedQty: item.quantity.toNumber() })),
      },
      grns: order.grns.map((grn) => ({ number: grn.grnNumber, date: grn.receivedDate, items: grn.items.map((item) => ({ receivedQty: item.receivedQuantity.toNumber(), acceptedQty: item.acceptedQuantity.toNumber() })) })),
      payments: order.payments.map((payment) => ({ number: payment.paymentNumber, amount: payment.amount.toNumber(), date: payment.paymentDate, status: payment.status })),
    };
  }

  async getStockMovementHistory(productId: string, locationId?: string) {
    const movements = await this.db.inventoryMovement.findMany({
      where: { productId, ...(locationId ? { locationId } : {}) },
      include: { product: true, location: true },
      orderBy: { createdAt: 'asc' },
    });
    let runningBalance = 0;
    const history = movements.map((movement) => {
      const quantityIn = movement.quantityIn.toNumber();
      const quantityOut = movement.quantityOut.toNumber();
      const net = quantityIn - quantityOut;
      runningBalance += net;
      return {
        date: movement.createdAt, type: movement.movementType,
        quantity: Math.abs(net), direction: net >= 0 ? 'IN' : 'OUT',
        quantityIn, quantityOut, referenceType: movement.referenceType,
        referenceId: movement.referenceId, locationId: movement.locationId, balance: runningBalance,
      };
    });
    return { product: movements[0]?.product.name ?? 'Unknown', location: locationId ?? 'All Locations', movements: history };
  }

  async getSerialNumberLifecycle(serialNumberId: string) {
    const serial = await this.db.serialNumber.findUnique({ where: { id: serialNumberId }, include: { product: true, project: true, asset: true } });
    if (!serial) throw new NotFoundException('Serial number not found');
    const lifecycle = [{ date: serial.createdAt, event: 'REGISTERED', status: serial.serialStatus }];
    if (serial.soldAt) lifecycle.push({ date: serial.soldAt, event: 'SOLD', status: 'SOLD' as any });
    return { serialNumber: serial.serialNumber, product: serial.product.name, currentStatus: serial.serialStatus, lifecycle: lifecycle.sort((a, b) => a.date.getTime() - b.date.getTime()) };
  }

  async getEntityHistory(entityType: string, entityId: string) {
    const history = await this.db.auditLog.findMany({ where: { entityType, entityId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { timestamp: 'asc' } });
    return { entityType, entityId, history, entries: history.length };
  }

  async getRecentChanges(limit = 25) {
    return this.db.auditLog.findMany({ take: Math.min(Math.max(limit, 1), 100), orderBy: { timestamp: 'desc' }, include: { user: { select: { id: true, name: true, email: true } } } });
  }
}
