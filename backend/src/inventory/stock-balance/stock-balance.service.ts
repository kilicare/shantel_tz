import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class StockBalanceService {
  private readonly logger = new Logger(StockBalanceService.name);

  constructor(private db: DatabaseService) {}

  /**
   * Get stock balance for a product at a specific location
   * Returns 0 if no balance record exists
   */
  async getBalance(productId: string, locationId: string) {
    const balance = await this.db.stockBalance.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      include: {
        product: true,
        location: true,
      },
    });

    if (!balance) {
      return {
        productId,
        locationId,
        quantity: 0,
        product: await this.db.product.findUnique({ where: { id: productId } }),
        location: await this.db.location.findUnique({ where: { id: locationId } }),
      };
    }

    return balance;
  }

  /**
   * Get total stock for a product across all locations
   */
  async getTotalStock(productId: string) {
    const balances = await this.db.stockBalance.findMany({
      where: { productId },
    });

    const total = balances.reduce((sum, b) => sum + b.quantity.toNumber(), 0);

    return {
      productId,
      totalQuantity: total,
      byLocation: balances,
    };
  }

  /**
   * Get all stock balances for a location
   */
  async getLocationStock(locationId: string) {
    return this.db.stockBalance.findMany({
      where: { locationId },
      include: {
        product: true,
        location: true,
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  /**
   * Update stock balance (INTERNAL USE ONLY)
   * Used by inventory movements
   */
  async updateBalance(productId: string, locationId: string, quantity: number) {
    const balance = await this.db.stockBalance.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
    });

    if (!balance) {
      // Create new balance if doesn't exist
      return this.db.stockBalance.create({
        data: {
          productId,
          locationId,
          quantity: new Prisma.Decimal(quantity),
        },
      });
    }

    // Update existing balance
    return this.db.stockBalance.update({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      data: {
        quantity: new Prisma.Decimal(quantity),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(locationId?: string) {
    const where = locationId
      ? { locationId }
      : {};

    return this.db.stockBalance.findMany({
      where,
      include: {
        product: true,
        location: true,
      },
      orderBy: { quantity: 'asc' },
    });
  }

  /**
   * Get stock summary for dashboard
   */
  async getStockSummary() {
    const balances = await this.db.stockBalance.findMany({
      include: {
        product: true,
        location: true,
      },
    });

    const totalItems = balances.length;
    const totalQuantity = balances.reduce((sum, b) => sum + b.quantity.toNumber(), 0);
    const lowStockItems = balances.filter(
      (b) => b.quantity.toNumber() <= b.product.minimumStockLevel,
    );
    const outOfStockItems = balances.filter((b) => b.quantity.toNumber() === 0);

    return {
      totalItems,
      totalQuantity,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems: lowStockItems.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        currentStock: item.quantity.toNumber(),
        minimumLevel: item.product.minimumStockLevel,
        location: item.location.name,
      })),
    };
  }
}