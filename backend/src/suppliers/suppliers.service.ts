import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PaginationService, PaginationParams } from '../shared/services/pagination.service.js';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    tinNumber?: string;
    paymentTerms?: string;
    bankAccount?: string;
  }) {
    // Check email uniqueness if provided
    if (data.email) {
      const existing = await this.db.supplier.findFirst({
        where: { email: data.email },
      });

      if (existing) {
        throw new ConflictException(`Email ${data.email} already in use`);
      }
    }

    const supplier = await this.db.supplier.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tinNumber: data.tinNumber,
        paymentTerms: data.paymentTerms,
        bankAccount: data.bankAccount,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Supplier created: ${data.name}`);
    return supplier;
  }

  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [suppliers, total] = await Promise.all([
      this.db.supplier.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.db.supplier.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      suppliers,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async findById(id: string) {
    const supplier = await this.db.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          select: { id: true, orderNumber: true, totalAmount: true, status: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    return supplier;
  }

  async search(query: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [suppliers, total] = await Promise.all([
      this.db.supplier.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { tinNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        skip,
        take,
      }),
      this.db.supplier.count({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { tinNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return this.paginationService.formatPaginatedResponse(
      suppliers,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async update(id: string, data: Partial<any>) {
    const supplier = await this.db.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    if (data.email && data.email !== supplier.email) {
      const existing = await this.db.supplier.findFirst({
        where: { email: data.email },
      });

      if (existing) {
        throw new ConflictException(`Email ${data.email} already in use`);
      }
    }

    const updated = await this.db.supplier.update({
      where: { id },
      data,
    });

    this.logger.log(`Supplier updated: ${id}`);
    return updated;
  }

  async deactivate(id: string) {
    return this.update(id, { status: 'INACTIVE' });
  }
}