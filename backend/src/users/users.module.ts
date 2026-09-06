import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [UsersService, PaginationService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
