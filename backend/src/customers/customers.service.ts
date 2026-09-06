import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PaginationService, PaginationParams } from '../shared/services/pagination.service.js';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

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
    customerType: 'INDIVIDUAL' | 'BUSINESS';
    creditLimit?: number;
    creditDays?: number;
    paymentTerms?: string;
  }) {
    // Check email uniqueness if provided
    if (data.email) {
      const existing = await this.db.customer.findFirst({
        where: { email: data.email },
      });

      if (existing) {
        throw new ConflictException(`Email ${data.email} already in use`);
      }
    }

    const customer = await this.db.customer.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        tinNumber: data.tinNumber,
        customerType: data.customerType,
        creditLimit: data.creditLimit || 0,
        creditDays: data.creditDays || 30,
        paymentTerms: data.paymentTerms,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Customer created: ${data.name}`);
    return customer;
  }

  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [customers, total] = await Promise.all([
      this.db.customer.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.db.customer.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      customers,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async findById(id: string) {
    const customer = await this.db.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          select: { id: true, invoiceNumber: true, totalAmount: true, balance: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        salesReturns: {
          select: { id: true, returnNumber: true, returnDate: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    // Calculate total balance
    const invoices = await this.db.invoice.findMany({
      where: { customerId: id },
      select: { balance: true },
    });

    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance.toNumber(), 0);

    return {
      ...customer,
      totalBalance,
    };
  }

  async search(query: string, paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [customers, total] = await Promise.all([
      this.db.customer.findMany({
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
      this.db.customer.count({
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
      customers,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  async update(id: string, data: Partial<any>) {
    const customer = await this.db.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    if (data.email && data.email !== customer.email) {
      const existing = await this.db.customer.findFirst({
        where: { email: data.email },
      });

      if (existing) {
        throw new ConflictException(`Email ${data.email} already in use`);
      }
    }

    const updated = await this.db.customer.update({
      where: { id },
      data,
    });

    this.logger.log(`Customer updated: ${id}`);
    return updated;
  }

  async deactivate(id: string) {
    return this.update(id, { status: 'INACTIVE' });
  }

  async getBalance(id: string) {
    const invoices = await this.db.invoice.findMany({
      where: { customerId: id },
      select: { balance: true },
    });

    const totalBalance = invoices.reduce((sum, inv) => sum + inv.balance.toNumber(), 0);

    return {
      customerId: id,
      totalBalance,
      invoiceCount: invoices.length,
    };
  }
}