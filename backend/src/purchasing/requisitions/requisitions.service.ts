import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class RequisitionsService {
  private readonly logger = new Logger(RequisitionsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create requisition (purchase request)
   */
  async create(data: {
    items: Array<{
      productId: string;
      quantity: number;
      description?: string;
      notes?: string;
    }>;
    notes?: string;
    userId: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Requisition must have at least one item');
    }

    // Validate all products exist
    for (const item of data.items) {
      const product = await this.db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (item.quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }
    }

    // Get next requisition number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'REQUISITION' },
    });

    const latestRequisition = await this.db.requisition.findFirst({
      orderBy: { requisitionNumber: 'desc' },
      select: { requisitionNumber: true },
    });
    const latestNumber = Number(latestRequisition?.requisitionNumber.split('-').pop() || 0);
    const nextNumber = Math.max(Number(seq?.currentNumber || 0), latestNumber) + 1;
    const requisitionNumber = `REQ-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create requisition
    const requisition = await this.db.requisition.create({
      data: {
        requisitionNumber,
        requestDate: new Date(),
        notes: data.notes,
        status: 'DRAFT',
        createdById: data.userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Create requisition items
    for (const item of data.items) {
      await this.db.requisitionItem.create({
        data: {
          requisitionId: requisition.id,
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          description: item.description,
          notes: item.notes,
        },
      });
    }

    // Update document sequence
    await this.db.documentSequence.upsert({
      where: { documentType: 'REQUISITION' },
      update: { currentNumber: nextNumber },
      create: { documentType: 'REQUISITION', prefix: 'REQ', currentNumber: nextNumber, padding: 6, year: 2026, status: 'ACTIVE' },
    });

    this.logger.log(`Requisition created: ${requisitionNumber}`);
    return requisition;
  }

  /**
   * Approve requisition
   */
  async approve(requisitionId: string, userId: string) {
    const requisition = await this.db.requisition.findUnique({
      where: { id: requisitionId },
    });

    if (!requisition) {
      throw new NotFoundException(`Requisition ${requisitionId} not found`);
    }

    if (requisition.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT requisitions can be approved`);
    }

    return this.db.requisition.update({
      where: { id: requisitionId },
      data: {
        status: 'APPROVED',
      },
    });
  }

  /**
   * Convert requisition to PO
   */
  async convertToPO(requisitionId: string, supplierId: string, userId: string) {
    const requisition = await this.db.requisition.findUnique({
      where: { id: requisitionId },
      include: {
        items: true,
      },
    });

    if (!requisition) {
      throw new NotFoundException(`Requisition ${requisitionId} not found`);
    }

    if (requisition.status !== 'APPROVED') {
      throw new BadRequestException(`Only APPROVED requisitions can be converted`);
    }

    // Validate supplier
    const supplier = await this.db.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }

    // Calculate totals
    let subtotal = 0;
    const poItems = [];

    for (const item of requisition.items) {
      const product = await this.db.product.findUnique({
        where: { id: item.productId },
      });

      // Use product cost price as default unit cost
      const unitCost = product?.costPrice?.toNumber() || 0;
      const lineTotal = item.quantity.toNumber() * unitCost;

      subtotal += lineTotal;

      poItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: new Prisma.Decimal(unitCost),
        lineTotal: new Prisma.Decimal(lineTotal),
      });
    }

    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    // Get next PO number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'PURCHASE_ORDER' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const poNumber = `PO-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create PO
    const po = await this.db.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        requisitionId: requisitionId,
        orderDate: new Date(),
        subtotal: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(totalAmount),
        status: 'DRAFT',
        createdById: userId,
      },
      include: {
        supplier: true,
      },
    });

    // Create PO items
    for (const item of poItems) {
      await this.db.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          lineTotal: item.lineTotal,
        },
      });
    }

    // Update requisition status
    await this.db.requisition.update({
      where: { id: requisitionId },
      data: { status: 'CONVERTED_TO_PO' },
    });

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'PURCHASE_ORDER' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`PO created from Requisition: ${poNumber}`);
    return po;
  }

  /**
   * Get all requisitions
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [requisitions, total] = await Promise.all([
      this.db.requisition.findMany({
        skip,
        take,
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.requisition.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      requisitions,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get requisition by ID
   */
  async findById(id: string) {
    const requisition = await this.db.requisition.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!requisition) {
      throw new NotFoundException(`Requisition ${id} not found`);
    }

    return requisition;
  }
}