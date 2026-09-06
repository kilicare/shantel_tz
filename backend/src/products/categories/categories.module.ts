import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CategoriesController } from './categories.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PaginationService } from '../../shared/services/pagination.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [CategoriesService, PaginationService],
  controllers: [CategoriesController],
  exports: [CategoriesService],
})
export class CategoriesModule {}