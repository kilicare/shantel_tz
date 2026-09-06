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
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Create project
   */
  async create(data: {
    name: string;
    customerId?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    userId: string;
  }) {
    // If customer specified, validate exists
    if (data.customerId) {
      const customer = await this.db.customer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer ${data.customerId} not found`);
      }
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('Project name is required');
    }

    // Check for duplicate project name for same customer
    const where: any = { name: data.name };
    if (data.customerId) {
      where.customerId = data.customerId;
    }

    const existing = await this.db.project.findFirst({ where });

    if (existing) {
      throw new ConflictException(
        `Project "${data.name}" already exists`,
      );
    }

    // Get next project number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'PROJECT' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const projectNumber = `PRJ-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create project
    const project = await this.db.project.create({
      data: {
        projectNumber,
        name: data.name,
        customerId: data.customerId,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'PLANNING' as any,
        createdById: data.userId,
      },
      include: {
        customer: true,
      },
    });

    // Update document sequence (create if not exists)
    await this.db.documentSequence.upsert({
      where: { documentType: 'PROJECT' },
      create: { documentType: 'PROJECT', prefix: 'PRJ', currentNumber: nextNumber },
      update: { currentNumber: nextNumber },
    });

    this.logger.log(`Project created: ${projectNumber}`);
    return project;
  }

  /**
   * Add product/item to project
   */
  async addItem(data: {
    projectId: string;
    productId: string;
    quantity: number;
    unitCost: number;
    locationId: string;
    userId: string;
  }) {
    // Validate project exists
    const project = await this.db.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${data.projectId} not found`);
    }

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

    if (data.unitCost <= 0) {
      throw new BadRequestException('Unit cost must be greater than 0');
    }

    // Check if product already in project
    const existing = await this.db.projectItem.findFirst({
      where: {
        projectId: data.projectId,
        productId: data.productId,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Product "${product.name}" already assigned to this project`,
      );
    }

    const totalCost = data.quantity * data.unitCost;

    // Create project item
    const projectItem = await this.db.projectItem.create({
      data: {
        projectId: data.projectId,
        productId: data.productId,
        locationId: data.locationId,
        quantity: new Prisma.Decimal(data.quantity),
        unitCost: new Prisma.Decimal(data.unitCost),
        totalCost: new Prisma.Decimal(totalCost),
      },
      include: {
        product: true,
        location: true,
      },
    });

    this.logger.log(
      `Product added to project: ${project.projectNumber}, Product: ${product.name}`,
    );
    return projectItem;
  }

  /**
   * Consume stock for project
   * Mark item as consumed
   */
  async consumeStock(data: {
    projectId: string;
    productId: string;
    quantity: number;
    locationId: string;
    userId: string;
  }) {
    // Validate project exists
    const project = await this.db.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${data.projectId} not found`);
    }

    // Get project item
    const projectItem = await this.db.projectItem.findFirst({
      where: {
        projectId: data.projectId,
        productId: data.productId,
      },
      include: {
        product: true,
      },
    });

    if (!projectItem) {
      throw new NotFoundException(
        `Product not assigned to this project`,
      );
    }

    if (data.quantity <= 0) {
      throw new BadRequestException('Consumption quantity must be greater than 0');
    }

    const itemQuantity = projectItem.quantity.toNumber();

    if (data.quantity > itemQuantity) {
      throw new BadRequestException(
        `Cannot consume ${data.quantity} units. Project item quantity: ${itemQuantity}`,
      );
    }

    // ATOMIC TRANSACTION: Mark project item as consumed + deduct stock + record movement
    try {
      const result = await this.db.$transaction(async (tx) => {
        // 1. Mark project item as consumed
        const updated = await tx.projectItem.update({
          where: { id: projectItem.id },
          data: {
            consumedAt: new Date(),
          },
        });

        // 2. Deduct stock
        const balance = await tx.stockBalance.findUnique({
          where: {
            productId_locationId: {
              productId: data.productId,
              locationId: data.locationId,
            },
          },
        });

        if (!balance) {
          throw new BadRequestException(
            `Stock balance not found for product at location`,
          );
        }

        const newQuantity = balance.quantity.toNumber() - data.quantity;

        if (newQuantity < 0) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${balance.quantity.toNumber()}, Required: ${data.quantity}`,
          );
        }

        await tx.stockBalance.update({
          where: {
            productId_locationId: {
              productId: data.productId,
              locationId: data.locationId,
            },
          },
          data: {
            quantity: new Prisma.Decimal(newQuantity),
          },
        });

        // 3. Record inventory movement
        await tx.inventoryMovement.create({
          data: {
            productId: data.productId,
            locationId: data.locationId,
            movementType: 'PROJECT_CONSUMPTION',
            quantityOut: new Prisma.Decimal(data.quantity),
            referenceType: 'PROJECT',
            referenceId: data.projectId,
            createdById: data.userId,
          },
        });

        return updated;
      });

      this.logger.log(
        `Stock consumed for project: ${project.projectNumber}, Product: ${projectItem.product.name}, Qty: ${data.quantity}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Project consumption failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Project consumption failed: ${error instanceof Error ? error.message : String(error)}. No changes made.`,
      );
    }
  }

  /**
   * Close project
   */
  async close(projectId: string, userId: string) {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return this.db.project.update({
      where: { id: projectId },
      data: {
        status: 'COMPLETED' as any,
      },
    });
  }

  /**
   * Get all projects
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [projects, total] = await Promise.all([
      this.db.project.findMany({
        skip,
        take,
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              location: true,
            },
          },
          assets: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.project.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      projects,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 20,
    );
  }

  /**
   * Get project by ID
   */
  async findById(id: string) {
    const project = await this.db.project.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            location: true,
          },
        },
        assets: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  /**
   * Get project financial summary
   */
  async getFinancialSummary(projectId: string) {
    const project = await this.db.project.findUnique({
      where: { id: projectId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const totalCost = project.items.reduce(
      (sum, item) => sum + item.totalCost.toNumber(),
      0,
    );

    const totalQuantity = project.items.reduce(
      (sum, item) => sum + item.quantity.toNumber(),
      0,
    );

    const consumedCount = project.items.filter(
      (item) => item.consumedAt !== null,
    ).length;

    return {
      projectId,
      projectNumber: project.projectNumber,
      name: project.name,
      totalCost,
      totalQuantity,
      consumedCount,
      remainingCount: project.items.length - consumedCount,
      items: project.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity.toNumber(),
        unitCost: item.unitCost.toNumber(),
        totalCost: item.totalCost.toNumber(),
        consumedAt: item.consumedAt,
        locationId: item.locationId,
      })),
    };
  }
}
