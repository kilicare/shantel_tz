import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { PaginationService } from '../shared/services/pagination.service.js';

import { ApprovalsService } from './approvals.service.js';
import { ExpensesService } from '../expenses/expenses.service.js';

@ApiTags('Approvals & Expenses')
@Controller('approvals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApprovalsController {
  constructor(
    private approvalsService: ApprovalsService,
    private expensesService: ExpensesService,
    private paginationService: PaginationService,
  ) {}

  // ===== APPROVAL ENDPOINTS =====

  @Get('pending')
  @RequirePermission('approvals.view')
  @ApiOperation({ summary: 'Get pending approvals for user' })
  async getPendingApprovals(@Request() req: any, @Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.approvalsService.getPendingApprovals(req.user.sub, paginationParams);
  }

  @Get(':id')
  @RequirePermission('approvals.view')
  @ApiOperation({ summary: 'Get approval by ID' })
  async getApproval(@Param('id') id: string) {
    return {
      success: true,
      data: await this.approvalsService.findById(id),
    };
  }

  @Post('submit')
  @RequirePermission('approvals.create')
  @ApiOperation({ summary: 'Submit document for approval' })
  async submitForApproval(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.approvalsService.submitForApproval({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Patch('approve')
  @RequirePermission('approvals.approve')
  @ApiOperation({ summary: 'Approve document at a step' })
  async approve(
    @Body() body: {
      documentType: string;
      documentId: string;
      approvalStep: number;
      comments?: string;
    },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.approvalsService.approve({
        ...body,
        approverId: req.user.sub,
      }),
    };
  }

  @Patch('reject')
  @RequirePermission('approvals.approve')
  @ApiOperation({ summary: 'Reject document at a step' })
  async reject(
    @Body() body: {
      documentType: string;
      documentId: string;
      approvalStep: number;
      rejectionReason: string;
    },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.approvalsService.reject({
        ...body,
        approverId: req.user.sub,
      }),
    };
  }

  @Get('document/:documentType/:documentId/history')
  @RequirePermission('approvals.view')
  @ApiOperation({ summary: 'Get document approval history' })
  async getApprovalHistory(
    @Param('documentType') documentType: string,
    @Param('documentId') documentId: string,
  ) {
    return {
      success: true,
      data: await this.approvalsService.getDocumentApprovalHistory(
        documentType,
        documentId,
      ),
    };
  }

  @Get()
  @RequirePermission('approvals.view')
  @ApiOperation({ summary: 'Get all approvals' })
  async getAllApprovals(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.approvalsService.findAll(paginationParams);
  }

  // ===== EXPENSE ENDPOINTS =====

  @Post('expenses')
  @RequirePermission('expenses.create')
  @ApiOperation({ summary: 'Create expense' })
  async createExpense(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.expensesService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('expenses')
  @RequirePermission('expenses.view')
  @ApiOperation({ summary: 'Get all expenses' })
  async getAllExpenses(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.expensesService.findAll(paginationParams);
  }

  @Get('expenses/:id')
  @RequirePermission('expenses.view')
  @ApiOperation({ summary: 'Get expense by ID' })
  async getExpense(@Param('id') id: string) {
    return {
      success: true,
      data: await this.expensesService.findById(id),
    };
  }

  @Post('expenses/:id/submit')
  @RequirePermission('expenses.approve')
  @ApiOperation({ summary: 'Submit expense for approval' })
  async submitExpenseForApproval(
    @Param('id') id: string,
    @Body() body: { approverIds: string[]; notes?: string },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.expensesService.submitForApproval({
        expenseId: id,
        approverIds: body.approverIds,
        notes: body.notes,
        userId: req.user.sub,
      }),
    };
  }

  @Patch('expenses/:id/approve')
  @RequirePermission('approvals.approve')
  @ApiOperation({ summary: 'Approve expense' })
  async approveExpense(
    @Param('id') id: string,
    @Body() body: { comments?: string },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.expensesService.approve(id, req.user.sub, body.comments),
    };
  }

  @Patch('expenses/:id/reject')
  @RequirePermission('approvals.approve')
  @ApiOperation({ summary: 'Reject expense' })
  async rejectExpense(
    @Param('id') id: string,
    @Body() body: { rejectionReason: string },
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.expensesService.reject(id, req.user.sub, body.rejectionReason),
    };
  }
}
