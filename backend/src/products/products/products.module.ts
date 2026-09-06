import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PaginationService } from '../../shared/services/pagination.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [ProductsService, PaginationService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}