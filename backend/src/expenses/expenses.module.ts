import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ApprovalsModule } from '../approvals/approvals.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';

import { ExpensesService } from './expenses.service.js';

@Module({
  imports: [DatabaseModule, forwardRef(() => ApprovalsModule)],
  providers: [PaginationService, ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
