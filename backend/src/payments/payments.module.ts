import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { ApprovalsModule } from '../approvals/approvals.module.js';
import { AuditModule } from '../audit/audit.module.js';

import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { ReceiptsService } from './receipts/receipts.service.js';
import { RefundsService } from './refunds/refunds.service.js';
import { FinancialReportsService } from './financial-reports.service.js';

@Module({
  imports: [DatabaseModule, ApprovalsModule, AuditModule],
  providers: [
    PaginationService,
    PaymentsService,
    ReceiptsService,
    RefundsService,
    FinancialReportsService,
  ],
  controllers: [PaymentsController],
  exports: [PaymentsService, ReceiptsService, RefundsService, FinancialReportsService],
})
export class PaymentsModule {}