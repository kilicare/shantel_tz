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
import { AuditLogService } from '../../audit/audit-log.service.js';

@Injectable()
export class RequisitionsService {
  private readonly logger = new Logger(RequisitionsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
    private auditLogService: AuditLogService,
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
    const items = data.items ?? [];
    await this.validateItems(items);

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

    const requisition = await this.db.$transaction(async (transaction) => {
      const created = await transaction.requisition.create({
        data: {
          requisitionNumber,
          requestDate: new Date(),
          notes: data.notes,
          status: 'DRAFT',
          createdById: data.userId,
          items: { create: items.map((item) => ({ productId: item.productId, quantity: new Prisma.Decimal(item.quantity), description: item.description, notes: item.notes })) },
        },
      });
      await transaction.documentSequence.upsert({
        where: { documentType: 'REQUISITION' },
        update: { currentNumber: nextNumber },
        create: { documentType: 'REQUISITION', prefix: 'REQ', currentNumber: nextNumber, padding: 6, year: 2026, status: 'ACTIVE' },
      });
      return transaction.requisition.findUniqueOrThrow({ where: { id: created.id }, include: { items: { include: { product: true } } } });
    });
    await this.auditLogService.logAction({ entityType: 'REQUISITION', entityId: requisition.id, action: 'CREATE', afterData: { requisitionNumber, itemCount: items.length }, userId: data.userId });

    this.logger.log(`Requisition created: ${requisitionNumber}`);
    return requisition;
  }

  private async validateItems(items: Array<{ productId: string; quantity: number; description?: string; notes?: string }>) {
    for (const item of items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new BadRequestException('Quantity must be greater than 0');
      const product = await this.db.product.findUnique({ where: { id: item.productId }, select: { id: true } });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
    }
  }

  async addItems(requisitionId: string, items: Array<{ productId: string; quantity: number; description?: string; notes?: string }>, userId: string) {
    const requisition = await this.db.requisition.findUnique({ where: { id: requisitionId } });
    if (!requisition) throw new NotFoundException(`Requisition ${requisitionId} not found`);
    if (!['DRAFT', 'RETURNED_FOR_CORRECTION'].includes(requisition.status)) throw new BadRequestException('Items can only be added to a draft or returned requisition');
    if (!items.length) throw new BadRequestException('At least one item is required');
    await this.validateItems(items);
    const updated = await this.db.requisition.update({ where: { id: requisitionId }, data: { items: { create: items.map((item) => ({ productId: item.productId, quantity: new Prisma.Decimal(item.quantity), description: item.description, notes: item.notes })) } }, include: { items: { include: { product: true } } } });
    await this.auditLogService.logAction({ entityType: 'REQUISITION', entityId: requisitionId, action: 'UPDATE', afterData: { addedItemCount: items.length }, userId });
    return updated;
  }

  async submit(requisitionId: string, userId: string) {
    const requisition = await this.db.requisition.findUnique({ where: { id: requisitionId }, include: { items: true } });
    if (!requisition) throw new NotFoundException(`Requisition ${requisitionId} not found`);
    if (!['DRAFT', 'RETURNED_FOR_CORRECTION'].includes(requisition.status)) throw new BadRequestException('Only draft or returned requisitions can be submitted');
    if (!requisition.items.length) throw new BadRequestException('Requisition must have at least one item before submission');
    const updated = await this.db.$transaction(async (transaction) => {
      const previousSteps = await transaction.approval.count({ where: { documentType: 'REQUISITION', documentId: requisitionId } });
      await transaction.approval.create({ data: { documentType: 'REQUISITION', documentId: requisitionId, approvalStep: previousSteps + 1, approvalDecision: 'PENDING' } });
      return transaction.requisition.update({ where: { id: requisitionId }, data: { status: 'SUBMITTED' }, include: { items: { include: { product: true } } } });
    });
    await this.auditLogService.logAction({ entityType: 'REQUISITION', entityId: requisitionId, action: 'UPDATE', afterData: { status: 'SUBMITTED' }, userId });
    return updated;
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

    if (requisition.status !== 'SUBMITTED') throw new BadRequestException('Only SUBMITTED requisitions can be approved');
    const approval = await this.db.approval.findFirst({ where: { documentType: 'REQUISITION', documentId: requisitionId, approvalDecision: 'PENDING' } });
    if (!approval) throw new BadRequestException('Requisition has no pending approval step');
    const updated = await this.db.$transaction(async (transaction) => {
      await transaction.approval.update({ where: { id: approval.id }, data: { approvalDecision: 'APPROVED', actedById: userId, actedAt: new Date() } });
      return transaction.requisition.update({ where: { id: requisitionId }, data: { status: 'APPROVED' }, include: { items: { include: { product: true } } } });
    });
    await this.auditLogService.logAction({ entityType: 'REQUISITION', entityId: requisitionId, action: 'APPROVE', afterData: { status: 'APPROVED' }, userId });
    return updated;
  }

  async reject(requisitionId: string, userId: string, reason: string) { return this.decide(requisitionId, userId, reason, 'REJECTED', 'REJECT'); }
  async returnForCorrection(requisitionId: string, userId: string, reason: string) { return this.decide(requisitionId, userId, reason, 'RETURNED_FOR_CORRECTION', 'UPDATE'); }

  private async decide(requisitionId: string, userId: string, reason: string, status: 'REJECTED' | 'RETURNED_FOR_CORRECTION', action: 'REJECT' | 'UPDATE') {
    if (!reason?.trim()) throw new BadRequestException('A decision reason is required');
    const requisition = await this.db.requisition.findUnique({ where: { id: requisitionId } });
    if (!requisition) throw new NotFoundException(`Requisition ${requisitionId} not found`);
    if (requisition.status !== 'SUBMITTED') throw new BadRequestException('Only SUBMITTED requisitions can be decided');
    const approval = await this.db.approval.findFirst({ where: { documentType: 'REQUISITION', documentId: requisitionId, approvalDecision: 'PENDING' } });
    if (!approval) throw new BadRequestException('Requisition has no pending approval step');
    const updated = await this.db.$transaction(async (transaction) => {
      await transaction.approval.update({ where: { id: approval.id }, data: { approvalDecision: status === 'REJECTED' ? 'REJECTED' : 'RETURNED', approverComment: reason, actedById: userId, actedAt: new Date() } });
      return transaction.requisition.update({ where: { id: requisitionId }, data: { status }, include: { items: { include: { product: true } } } });
    });
    await this.auditLogService.logAction({ entityType: 'REQUISITION', entityId: requisitionId, action, afterData: { status, reason }, userId });
    return updated;
  }

  async approvalHistory(requisitionId: string) {
    const requisition = await this.db.requisition.findUnique({ where: { id: requisitionId }, select: { id: true } });
    if (!requisition) throw new NotFoundException(`Requisition ${requisitionId} not found`);
    return this.db.approval.findMany({ where: { documentType: 'REQUISITION', documentId: requisitionId }, include: { actedBy: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } });
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