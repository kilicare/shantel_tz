import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { SuppliersController } from './suppliers.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [SuppliersService, PaginationService],
  controllers: [SuppliersController],
  exports: [SuppliersService],
})
export class SuppliersModule {}
