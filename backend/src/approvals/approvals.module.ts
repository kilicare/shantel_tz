import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { ExpensesModule } from '../expenses/expenses.module.js';

import { ApprovalsController } from './approvals.controller.js';
import { ApprovalsService } from './approvals.service.js';

@Module({
  imports: [DatabaseModule, forwardRef(() => ExpensesModule)],
  providers: [PaginationService, ApprovalsService],
  controllers: [ApprovalsController],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
