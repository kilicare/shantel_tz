import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class InventoryReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getCurrentStock(locationId?: string) {
    const balances = await this.db.stockBalance.findMany({
      where: locationId ? { locationId } : undefined,
      include: { product: true, location: true },
      orderBy: { product: { name: 'asc' } },
    });
    const details = balances.map((balance) => {
      const quantity = balance.quantity.toNumber();
      const costPrice = balance.product.costPrice.toNumber();
      const sellingPrice = balance.product.sellingPrice.toNumber();
      return {
        productSku: balance.product.sku,
        productName: balance.product.name,
        quantity,
        costPrice,
        sellingPrice,
        valueAtCost: quantity * costPrice,
        location: balance.location.name,
      };
    });
    return {
      location: locationId ? 'Specific Location' : 'All Locations',
      reportDate: new Date(),
      summary: {
        totalItems: details.length,
        totalQuantity: details.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: details.reduce((sum, item) => sum + item.valueAtCost, 0),
      },
      details,
    };
  }

  async getLowStockItems() {
    const balances = await this.db.stockBalance.findMany({ include: { product: true, location: true } });
    const items = balances
      .filter((balance) => balance.quantity.toNumber() <= balance.product.minimumStockLevel)
      .map((balance) => ({
        productSku: balance.product.sku,
        productName: balance.product.name,
        currentQuantity: balance.quantity.toNumber(),
        minimumLevel: balance.product.minimumStockLevel,
        shortage: balance.product.minimumStockLevel - balance.quantity.toNumber(),
        location: balance.location.name,
      }))
      .sort((a, b) => a.currentQuantity - b.currentQuantity);
    return { reportDate: new Date(), totalLowStockItems: items.length, items };
  }

  async getMovementReport(startDate: Date, endDate: Date, productId?: string) {
    const movements = await this.db.inventoryMovement.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, ...(productId ? { productId } : {}) },
      include: { product: true, location: true },
      orderBy: { createdAt: 'desc' },
    });
    const totalIn = movements.reduce((sum, movement) => sum + movement.quantityIn.toNumber(), 0);
    const totalOut = movements.reduce((sum, movement) => sum + movement.quantityOut.toNumber(), 0);
    return {
      period: { start: startDate, end: endDate },
      summary: { totalMovements: movements.length, totalIn, totalOut, net: totalIn - totalOut },
      movements: movements.map((movement) => ({
        date: movement.createdAt,
        movementType: movement.movementType,
        product: movement.product.name,
        quantityIn: movement.quantityIn.toNumber(),
        quantityOut: movement.quantityOut.toNumber(),
        location: movement.location.name,
        referenceType: movement.referenceType,
        referenceId: movement.referenceId,
      })),
    };
  }

  async getStockValuation() {
    const balances = await this.db.stockBalance.findMany({ include: { product: true, location: true } });
    const items = balances.map((balance) => {
      const quantity = balance.quantity.toNumber();
      const costPerUnit = balance.product.costPrice.toNumber();
      const sellingPerUnit = balance.product.sellingPrice.toNumber();
      const costValue = quantity * costPerUnit;
      const sellingValue = quantity * sellingPerUnit;
      return {
        productSku: balance.product.sku,
        productName: balance.product.name,
        quantity,
        costPerUnit,
        costValue,
        sellingPerUnit,
        sellingValue,
        grossProfit: sellingValue - costValue,
        location: balance.location.name,
      };
    });
    const totalCostValue = items.reduce((sum, item) => sum + item.costValue, 0);
    const totalSellingValue = items.reduce((sum, item) => sum + item.sellingValue, 0);
    return {
      reportDate: new Date(),
      summary: {
        totalCostValue,
        totalSellingValue,
        potentialGrossProfit: totalSellingValue - totalCostValue,
        profitMarginPercent: totalSellingValue ? ((totalSellingValue - totalCostValue) / totalSellingValue) * 100 : 0,
      },
      items: items.sort((a, b) => b.costValue - a.costValue),
    };
  }
}
