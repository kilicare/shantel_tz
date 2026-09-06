import { Module } from '@nestjs/common';
import { UnitsService } from './units.service.js';
import { UnitsController } from './units.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PaginationService } from '../../shared/services/pagination.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [UnitsService, PaginationService],
  controllers: [UnitsController],
  exports: [UnitsService],
})
export class UnitsModule {}