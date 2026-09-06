import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { PaginationService, PaginationParams } from '../../shared/services/pagination.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create PO manually or from requisition
   */
  async create(data: {
    supplierId: string;
    requisitionId?: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitCost: number;
      discountPercent?: number;
    }>;
    notes?: string;
    userId: string;
  }) {
    // Validate supplier
    const supplier = await this.db.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier ${data.supplierId} not found`);
    }

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('PO must have at least one item');
    }

    // Validate all products and calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const poItems = await Promise.all(
      data.items.map(async (item) => {
        const product = await this.db.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        if (item.quantity <= 0 || item.unitCost <= 0) {
          throw new BadRequestException('Quantity and cost must be greater than 0');
        }

        const lineTotal = item.quantity * item.unitCost;
        const discount = lineTotal * ((item.discountPercent || 0) / 100);
        const taxableAmount = lineTotal - discount;
        const lineTax = taxableAmount * 0.18;

        subtotal += lineTotal;
        taxAmount += lineTax;

        return {
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          unitCost: new Prisma.Decimal(item.unitCost),
          discountPercent: new Prisma.Decimal(item.discountPercent || 0),
          discountAmount: new Prisma.Decimal(discount),
          taxAmount: new Prisma.Decimal(lineTax),
          lineTotal: new Prisma.Decimal(lineTotal - discount + lineTax),
        };
      }),
    );

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
        supplierId: data.supplierId,
        requisitionId: data.requisitionId,
        orderDate: new Date(),
        subtotal: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(totalAmount),
        notes: data.notes,
        status: 'DRAFT',
        createdById: data.userId,
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
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
        },
      });
    }

    // Update document sequence
    await this.db.documentSequence.update({
      where: { documentType: 'PURCHASE_ORDER' },
      data: { currentNumber: nextNumber },
    });

    this.logger.log(`PO created: ${poNumber}`);
    return po;
  }

  /**
   * Approve PO
   */
  async approve(poId: string, userId: string) {
    const po = await this.db.purchaseOrder.findUnique({
      where: { id: poId },
    });

    if (!po) {
      throw new NotFoundException(`PO ${poId} not found`);
    }

    if (po.status !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT POs can be approved`);
    }

    return this.db.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'SUBMITTED',
        approvedById: userId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Post PO (ready for receiving)
   */
  async post(poId: string, userId: string) {
    const po = await this.db.purchaseOrder.findUnique({
      where: { id: poId },
    });

    if (!po) {
      throw new NotFoundException(`PO ${poId} not found`);
    }

    if (po.status !== 'SUBMITTED') {
      throw new BadRequestException(`PO must be SUBMITTED to post`);
    }

    return this.db.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'SENT',
        postedById: userId,
        postedAt: new Date(),
      },
    });
  }

  /**
   * Get all POs
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [pos, total] = await Promise.all([
      this.db.purchaseOrder.findMany({
        skip,
        take,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.purchaseOrder.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      pos,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get PO by ID
   */
  async findById(id: string) {
    const po = await this.db.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
      },
    });

    if (!po) {
      throw new NotFoundException(`PO ${id} not found`);
    }

    return po;
  }

  /**
   * Get receiving status for a PO
   */
  async getReceivingStatus(poId: string) {
    const po = await this.db.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        items: true,
        grns: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`PO ${poId} not found`);
    }

    // Calculate received vs ordered
    const itemsStatus = po.items.map((item) => {
      const grnItems = po.grns.flatMap((grn) =>
        grn.items.filter((gi) => gi.purchaseOrderItemId === item.id),
      );

      const receivedQuantity = grnItems.reduce(
        (sum, gi) => sum + gi.receivedQuantity.toNumber(),
        0,
      );

      return {
        productId: item.productId,
        orderedQuantity: item.quantity.toNumber(),
        receivedQuantity,
        outstandingQuantity: item.quantity.toNumber() - receivedQuantity,
      };
    });

    const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity.toNumber(), 0);
    const totalReceived = itemsStatus.reduce((sum, item) => sum + item.receivedQuantity, 0);

    return {
      poNumber: po.poNumber,
      totalOrdered,
      totalReceived,
      totalOutstanding: totalOrdered - totalReceived,
      items: itemsStatus,
      status:
        totalReceived === 0
          ? 'NOT_RECEIVED'
          : totalReceived < totalOrdered
            ? 'PARTIALLY_RECEIVED'
            : 'FULLY_RECEIVED',
    };
  }
}