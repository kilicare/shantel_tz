import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PaginationService, PaginationParams } from '../shared/services/pagination.service.js';
import { ApprovalsService } from '../approvals/approvals.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
    @Inject(forwardRef(() => ApprovalsService))
    private approvalsService: ApprovalsService,
  ) {}

  /**
   * Create expense
   */
  async create(data: {
    categoryId: string;
    description: string;
    amount: number;
    expenseDate?: Date;
    paymentMethodId: string;
    reference?: string;
    attachment?: string;
    notes?: string;
    projectId?: string;
    userId: string;
  }) {
    // Validate category
    const category = await this.db.expenseCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Expense category not found`);
    }

    // Validate payment method
    const paymentMethod = await this.db.paymentMethod.findUnique({
      where: { id: data.paymentMethodId },
    });

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method not found`);
    }

    if (data.amount <= 0) {
      throw new BadRequestException('Expense amount must be greater than 0');
    }

    if (!data.description || data.description.trim().length === 0) {
      throw new BadRequestException('Description is required');
    }

    // Get next expense number
    const seq = await this.db.documentSequence.findUnique({
      where: { documentType: 'EXPENSE' },
    });

    const nextNumber = Number(seq?.currentNumber || 0) + 1;
    const expenseNumber = `EXP-2026-${String(nextNumber).padStart(6, '0')}`;

    // Create expense
    const expense = await this.db.expense.create({
      data: {
        expenseNumber,
        categoryId: data.categoryId,
        description: data.description,
        amount: new Prisma.Decimal(data.amount),
        expenseDate: data.expenseDate || new Date(),
        paymentMethodId: data.paymentMethodId,
        reference: data.reference,
        attachment: data.attachment,
        notes: data.notes,
        projectId: data.projectId,
        status: 'DRAFT',
        createdById: data.userId,
      },
      include: {
        category: true,
        paymentMethod: true,
        project: true,
      },
    });

    // Update document sequence
    await this.db.documentSequence.upsert({
      where: { documentType: 'EXPENSE' },
      create: { documentType: 'EXPENSE', prefix: 'EXP', currentNumber: nextNumber },
      update: { currentNumber: nextNumber },
    });

    this.logger.log(`Expense created: ${expenseNumber}`);
    return expense;
  }

  /**
   * Submit expense for approval
   */
  async submitForApproval(data: {
    expenseId: string;
    approverIds: string[];
    notes?: string;
    userId: string;
  }) {
    const expense = await this.db.expense.findUnique({
      where: { id: data.expenseId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense not found`);
    }

    if (expense.status !== 'DRAFT') {
      throw new BadRequestException(
        `Expense must be DRAFT to submit for approval`,
      );
    }

    // Submit for approval using the step-based system
    await this.approvalsService.submitForApproval({
      documentType: 'EXPENSE',
      documentId: data.expenseId,
      approverIds: data.approverIds,
      notes: data.notes,
      userId: data.userId,
    });

    // Update expense status
    await this.db.expense.update({
      where: { id: data.expenseId },
      data: { status: 'SUBMITTED' },
    });

    return { success: true, message: 'Expense submitted for approval' };
  }

  /**
   * Approve expense at a specific step
   */
  async approve(expenseId: string, approverId: string, comments?: string) {
    const expense = await this.db.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense not found`);
    }

    // Get all pending approvals for this expense
    const pendingApprovals = await this.db.approval.findMany({
      where: {
        documentType: 'EXPENSE',
        documentId: expenseId,
        approvalDecision: 'PENDING',
      },
      orderBy: { approvalStep: 'asc' },
    });

    if (pendingApprovals.length === 0) {
      throw new BadRequestException(`No pending approvals found for this expense`);
    }

    // Approve the first pending step
    const firstPending = pendingApprovals[0];
    const result = await this.approvalsService.approve({
      documentType: 'EXPENSE',
      documentId: expenseId,
      approvalStep: firstPending.approvalStep,
      approverId,
      comments,
    });

    // Check if all steps are approved
    const allApprovals = await this.db.approval.findMany({
      where: {
        documentType: 'EXPENSE',
        documentId: expenseId,
      },
    });

    const allApproved = allApprovals.every((a: any) => a.approvalDecision === 'APPROVED');

    if (allApproved) {
      await this.db.expense.update({
        where: { id: expenseId },
        data: {
          status: 'APPROVED',
          approvedById: approverId,
          approvedAt: new Date(),
        },
      });
    }

    return result;
  }

  /**
   * Reject expense at a specific step
   */
  async reject(expenseId: string, approverId: string, rejectionReason: string) {
    const expense = await this.db.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense not found`);
    }

    const pendingApprovals = await this.db.approval.findMany({
      where: {
        documentType: 'EXPENSE',
        documentId: expenseId,
        approvalDecision: 'PENDING',
      },
      orderBy: { approvalStep: 'asc' },
    });

    if (pendingApprovals.length === 0) {
      throw new BadRequestException(`No pending approvals found for this expense`);
    }

    const firstPending = pendingApprovals[0];
    const result = await this.approvalsService.reject({
      documentType: 'EXPENSE',
      documentId: expenseId,
      approvalStep: firstPending.approvalStep,
      approverId,
      rejectionReason,
    });

    // Update expense status
    await this.db.expense.update({
      where: { id: expenseId },
      data: { status: 'REJECTED' },
    });

    return result;
  }

  /**
   * Get all expenses
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [expenses, total] = await Promise.all([
      this.db.expense.findMany({
        skip,
        take,
        include: {
          category: true,
          paymentMethod: true,
          project: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.expense.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      expenses,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 10,
    );
  }

  /**
   * Get expense by ID
   */
  async findById(id: string) {
    const expense = await this.db.expense.findUnique({
      where: { id },
      include: {
        category: true,
        paymentMethod: true,
        project: true,
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense not found`);
    }

    return expense;
  }
}
