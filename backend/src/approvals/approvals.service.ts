import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PaginationService, PaginationParams } from '../shared/services/pagination.service.js';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private db: DatabaseService,
    private paginationService: PaginationService,
  ) {}

  /**
   * Submit document for approval
   * Creates approval steps for each approver
   */
  async submitForApproval(data: {
    documentType: string;
    documentId: string;
    approverIds: string[];
    notes?: string;
    userId: string;
  }) {
    if (data.approverIds.length === 0) {
      throw new BadRequestException('At least one approver required');
    }

    if (new Set(data.approverIds).size !== data.approverIds.length) {
      throw new BadRequestException('Approvers must be unique');
    }

    // Validate all approvers exist
    for (const approverId of data.approverIds) {
      const user = await this.db.user.findUnique({
        where: { id: approverId },
      });

      if (!user) {
        throw new NotFoundException(`Approver ${approverId} not found`);
      }

      // Check if current user is trying to self-approve
      if (approverId === data.userId) {
        throw new BadRequestException('Self-approval is not permitted');
      }
    }

    // Check if document already has pending approvals
    const existingPending = await this.db.approval.findFirst({
      where: {
        documentType: data.documentType,
        documentId: data.documentId,
        approvalDecision: 'PENDING',
      },
    });

    if (existingPending) {
      throw new BadRequestException('Document already has pending approvals');
    }

    const approvals = await this.db.$transaction(
      data.approverIds.map((approverId, index) =>
        this.db.approval.create({
          data: {
            documentType: data.documentType,
            documentId: data.documentId,
            approvalStep: index + 1,
            approvalDecision: 'PENDING',
            approverId,
            approverComment: data.notes,
          },
        }),
      ),
    );

    this.logger.log(
      `Approval submitted: ${data.documentType} ${data.documentId} with ${approvals.length} steps`,
    );
    return approvals;
  }

  /**
   * Approve document at a specific step
   */
  async approve(data: {
    documentType: string;
    documentId: string;
    approvalStep: number;
    approverId: string;
    comments?: string;
  }) {
    // Get the approval record for this step
    const approval = await this.db.approval.findFirst({
      where: {
        documentType: data.documentType,
        documentId: data.documentId,
        approvalStep: data.approvalStep,
      },
    });

    if (!approval) {
      throw new NotFoundException(`Approval step ${data.approvalStep} not found`);
    }

    if (approval.approvalDecision !== 'PENDING') {
      throw new BadRequestException(
        `Step ${data.approvalStep} already ${approval.approvalDecision.toLowerCase()}`,
      );
    }

    if (approval.approverId !== data.approverId) {
      throw new ForbiddenException('You are not assigned to this approval step');
    }

    if (data.approvalStep > 1) {
      const previousStep = await this.db.approval.findFirst({
        where: {
          documentType: data.documentType,
          documentId: data.documentId,
          approvalStep: data.approvalStep - 1,
        },
      });

      if (!previousStep || previousStep.approvalDecision !== 'APPROVED') {
        throw new BadRequestException('Previous approval step must be approved first');
      }
    }

    // Update approval
    const updated = await this.db.approval.update({
      where: { id: approval.id },
      data: {
        approvalDecision: 'APPROVED',
        approverComment: data.comments || approval.approverComment,
        actedById: data.approverId,
        actedAt: new Date(),
      },
    });

    this.logger.log(
      `Approval step ${data.approvalStep} approved by ${data.approverId} for ${data.documentType}`,
    );
    return updated;
  }

  /**
   * Reject document at a specific step
   */
  async reject(data: {
    documentType: string;
    documentId: string;
    approvalStep: number;
    approverId: string;
    rejectionReason: string;
  }) {
    const approval = await this.db.approval.findFirst({
      where: {
        documentType: data.documentType,
        documentId: data.documentId,
        approvalStep: data.approvalStep,
      },
    });

    if (!approval) {
      throw new NotFoundException(`Approval step ${data.approvalStep} not found`);
    }

    if (approval.approvalDecision !== 'PENDING') {
      throw new BadRequestException(
        `Step ${data.approvalStep} already ${approval.approvalDecision.toLowerCase()}`,
      );
    }

    if (approval.approverId !== data.approverId) {
      throw new ForbiddenException('You are not assigned to this approval step');
    }

    if (!data.rejectionReason.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await this.db.approval.update({
      where: { id: approval.id },
      data: {
        approvalDecision: 'REJECTED',
        approverComment: data.rejectionReason,
        actedById: data.approverId,
        actedAt: new Date(),
      },
    });

    this.logger.log(
      `Approval step ${data.approvalStep} rejected by ${data.approverId} for ${data.documentType}`,
    );
    return updated;
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovals(approverId: string, paginationParams: PaginationParams) {
    const { skip = 0, take = 10 } = paginationParams;

    const candidates = await this.db.approval.findMany({
      where: {
        approvalDecision: 'PENDING',
        approverId,
      },
      include: {
        approver: { select: { id: true, name: true, email: true } },
        actedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const approvals = [];
    for (const candidate of candidates) {
      if (candidate.approvalStep === 1) {
        approvals.push(candidate);
        continue;
      }

      const previousPending = await this.db.approval.findFirst({
        where: {
          documentType: candidate.documentType,
          documentId: candidate.documentId,
          approvalStep: { lt: candidate.approvalStep },
          approvalDecision: { not: 'APPROVED' },
        },
      });

      if (!previousPending) {
        approvals.push(candidate);
      }
    }

    const total = approvals.length;
    const paginatedApprovals = approvals.slice(skip, skip + take);

    return this.paginationService.formatPaginatedResponse(
      paginatedApprovals,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 10,
    );
  }

  /**
   * Get approval by ID
   */
  async findById(id: string) {
    const approval = await this.db.approval.findUnique({
      where: { id },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        actedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException(`Approval not found`);
    }

    return approval;
  }

  /**
   * Get approval history for document
   */
  async getDocumentApprovalHistory(documentType: string, documentId: string) {
    const approvals = await this.db.approval.findMany({
      where: {
        documentType,
        documentId,
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        actedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { approvalStep: 'asc' },
    });

    if (approvals.length === 0) {
      return null;
    }

    return {
      documentType,
      documentId,
      totalSteps: approvals.length,
      completedSteps: approvals.filter((a: any) => a.approvalDecision !== 'PENDING').length,
      history: approvals.map((approval: any) => ({
        step: approval.approvalStep,
        approver: approval.approver?.name,
        decision: approval.approvalDecision,
        actedBy: approval.actedBy?.name,
        actedAt: approval.actedAt,
        comments: approval.approverComment,
      })),
    };
  }

  /**
   * Get all approvals
   */
  async findAll(paginationParams: PaginationParams) {
    const { skip, take } = paginationParams;

    const [approvals, total] = await Promise.all([
      this.db.approval.findMany({
        skip,
        take,
        include: {
          actedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.approval.count(),
    ]);

    return this.paginationService.formatPaginatedResponse(
      approvals,
      total,
      paginationParams.page || 1,
      paginationParams.limit || 10,
    );
  }
}
