import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CustomersController } from './customers.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [CustomersService, PaginationService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
