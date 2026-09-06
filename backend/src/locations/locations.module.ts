import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service.js';
import { LocationsController } from './locations.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [LocationsService, PaginationService],
  controllers: [LocationsController],
  exports: [LocationsService],
})
export class LocationsModule {}
