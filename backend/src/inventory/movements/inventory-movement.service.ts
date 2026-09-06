import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';
import { StockBalanceService } from '../stock-balance/stock-balance.service.js';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InventoryMovementService {
  private readonly logger = new Logger(InventoryMovementService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
    private stockBalanceService: StockBalanceService,
    private configService: ConfigService,
  ) {}

  /**
   * Record a stock in movement (from GRN, purchase, etc)
   */
  async stockIn(data: {
    productId: string;
    locationId: string;
    quantity: number;
    unitCost: number;
    referenceType: string;
    referenceId: string;
    reason?: string;
    userId: string;
  }) {
    // Validate product exists
    const product = await this.db.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${data.productId} not found`);
    }

    // Validate location exists
    const location = await this.db.location.findUnique({
      where: { id: data.locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${data.locationId} not found`);
    }

    if (data.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    // Get current balance
    const currentBalance = await this.stockBalanceService.getBalance(
      data.productId,
      data.locationId,
    );

    const newQuantity = (typeof currentBalance.quantity === 'number' ? currentBalance.quantity : currentBalance.quantity.toNumber()) + data.quantity;

    // Update stock balance
    await this.stockBalanceService.updateBalance(data.productId, data.locationId, newQuantity);

    // Record movement
    const movement = await this.db.inventoryMovement.create({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        movementType: 'STOCK_IN',
        quantityIn: new Prisma.Decimal(data.quantity),
        quantityOut: new Prisma.Decimal(0),
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        unitCost: new Prisma.Decimal(data.unitCost),
        reason: data.reason,
        createdById: data.userId,
      },
      include: {
        product: true,
        location: true,
      },
    });

    this.logger.log(
      `Stock In: Product ${product.sku}, Qty ${data.quantity}, Location ${location.code}`,
    );

    return movement;
  }

  /**
   * Record a stock out movement (sale, adjustment, etc)
   * WITH VALIDATION - prevents negative stock
   */
  async stockOut(data: {
    productId: string;
    locationId: string;
    quantity: number;
    unitCost: number;
    referenceType: string;
    referenceId: string;
    reason?: string;
    userId: string;
  }) {
    // Validate product exists
    const product = await this.db.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${data.productId} not found`);
    }

    // Validate location exists
    const location = await this.db.location.findUnique({
      where: { id: data.locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location ${data.locationId} not found`);
    }

    if (data.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    // Get current balance
    const currentBalance = await this.stockBalanceService.getBalance(
      data.productId,
      data.locationId,
    );

    const allowNegativeStock = this.configService.get('features.allowNegativeStock');

    // CHECK FOR NEGATIVE STOCK
    if (!allowNegativeStock && (typeof currentBalance.quantity === 'number' ? currentBalance.quantity : currentBalance.quantity.toNumber()) < data.quantity) {
      this.logger.warn(
        `Insufficient stock: Product ${product.sku}, Available ${currentBalance.quantity}, Requested ${data.quantity}`,
      );

      throw new BadRequestException(
        `Insufficient stock for ${product.name}. Available: ${currentBalance.quantity}, Requested: ${data.quantity}`,
      );
    }

    const newQuantity = (typeof currentBalance.quantity === 'number' ? currentBalance.quantity : currentBalance.quantity.toNumber()) - data.quantity;

    // Update stock balance
    await this.stockBalanceService.updateBalance(data.productId, data.locationId, newQuantity);

    // Record movement
    const movement = await this.db.inventoryMovement.create({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        movementType: 'STOCK_OUT',
        quantityIn: new Prisma.Decimal(0),
        quantityOut: new Prisma.Decimal(data.quantity),
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        unitCost: new Prisma.Decimal(data.unitCost),
        reason: data.reason,
        createdById: data.userId,
      },
      include: {
        product: true,
        location: true,
      },
    });

    this.logger.log(
      `Stock Out: Product ${product.sku}, Qty ${data.quantity}, Location ${location.code}`,
    );

    return movement;
  }

  /**
   * Get all movements for a product
   */
  async getMovementsByProduct(productId: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [movements, total] = await Promise.all([
      this.db.inventoryMovement.findMany({
        where: { productId },
        skip,
        take,
        include: {
          product: true,
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.inventoryMovement.count({ where: { productId } }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      movements,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get all movements for a location
   */
  async getMovementsByLocation(locationId: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [movements, total] = await Promise.all([
      this.db.inventoryMovement.findMany({
        where: { locationId },
        skip,
        take,
        include: {
          product: true,
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.inventoryMovement.count({ where: { locationId } }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      movements,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get inventory ledger (all movements)
   */
  async getLedger(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [movements, total] = await Promise.all([
      this.db.inventoryMovement.findMany({
        skip,
        take,
        include: {
          product: true,
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.inventoryMovement.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      movements,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }
}