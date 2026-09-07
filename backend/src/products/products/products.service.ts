import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  async create(data: {
    name: string;
    sku: string;
    barcode?: string;
    description?: string;
    productType: 'STOCK_ITEM' | 'SERVICE' | 'SERIALIZED_ITEM';
    categoryId: string;
    brandId?: string;
    unitId: string;
    costPrice: number;
    sellingPrice: number;
    minimumStockLevel?: number;
    reorderLevel?: number;
    trackStock?: boolean;
    trackSerialNumber?: boolean;
    tax?: number;
  }) {
    // Validate prices
    if (data.costPrice <= 0 || data.sellingPrice <= 0) {
      throw new BadRequestException('Prices must be greater than 0');
    }

    if (data.sellingPrice < data.costPrice) {
      throw new BadRequestException('Selling price must be >= cost price');
    }

    // Check SKU uniqueness
    const existingSku = await this.db.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      throw new ConflictException(`SKU ${data.sku} already exists`);
    }

    // Check barcode uniqueness (if provided)
    if (data.barcode) {
      const existingBarcode = await this.db.product.findUnique({
        where: { barcode: data.barcode },
      });

      if (existingBarcode) {
        throw new ConflictException(`Barcode ${data.barcode} already exists`);
      }
    }

    // Validate category exists
    const category = await this.db.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category ${data.categoryId} not found`);
    }

    // Validate unit exists
    const unit = await this.db.unit.findUnique({
      where: { id: data.unitId },
    });

    if (!unit) {
      throw new NotFoundException(`Unit ${data.unitId} not found`);
    }

    const product = await this.db.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        description: data.description,
        productType: data.productType,
        categoryId: data.categoryId,
        brandId: data.brandId,
        unitId: data.unitId,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        minimumStockLevel: data.minimumStockLevel || 0,
        reorderLevel: data.reorderLevel || 0,
        trackStock: data.trackStock !== false,
        trackSerialNumber: data.trackSerialNumber || false,
        tax: data.tax || 18,
        status: 'ACTIVE',
      },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });

    this.logger.log(`Product created: ${data.sku}`);
    return product;
  }

  async findAll(paginationParams: PaginationParams, filters?: { categoryId?: string; status?: string }) {
    const { skip, take } = paginationParams;

    const where: any = {};
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where,
        skip,
        take,
        include: {
          category: true,
          brand: true,
          unit: true,
          serialNumbers: { select: { serialNumber: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.db.product.count({ where }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      products,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async findById(id: string) {
    const product = await this.db.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async findBySku(sku: string) {
    const product = await this.db.product.findUnique({
      where: { sku },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${sku} not found`);
    }

    return product;
  }

  async search(query: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            { barcode: { contains: query, mode: 'insensitive' } },
            { serialNumbers: { some: { serialNumber: { contains: query, mode: 'insensitive' } } } },
          ],
        },
        skip,
        take,
        include: {
          category: true,
          brand: true,
          unit: true,
          serialNumbers: { select: { serialNumber: true } },
        },
      }),
      this.db.product.count({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            { barcode: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      products,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async update(id: string, data: Partial<any>) {
    const product = await this.db.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    // Validate prices
    if (data.costPrice && data.costPrice <= 0) {
      throw new BadRequestException('Cost price must be greater than 0');
    }

    if (data.sellingPrice && data.sellingPrice <= 0) {
      throw new BadRequestException('Selling price must be greater than 0');
    }

    if (data.costPrice && data.sellingPrice && data.sellingPrice < data.costPrice) {
      throw new BadRequestException('Selling price must be >= cost price');
    }

    const updated = await this.db.product.update({
      where: { id },
      data,
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });

    this.logger.log(`Product updated: ${id}`);
    return updated;
  }

  async deactivate(id: string) {
    return this.update(id, { status: 'INACTIVE' });
  }

  async getStockBalance(productId: string, locationId?: string) {
    const where = { productId };
    if (locationId) {
      (where as any).locationId = locationId;
    }

    return this.db.stockBalance.findMany({
      where,
      include: {
        location: true,
        product: true,
      },
    });
  }
}