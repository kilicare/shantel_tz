import { Module } from '@nestjs/common';
import { BrandsService } from './brands.service.js';
import { BrandsController } from './brands.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PaginationService } from '../../shared/services/pagination.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [BrandsService, PaginationService],
  controllers: [BrandsController],
  exports: [BrandsService],
})
export class BrandsModule {}