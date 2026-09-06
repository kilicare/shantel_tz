import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service.js';
import { PermissionsController } from './permissions.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [PermissionsService],
  controllers: [PermissionsController],
  exports: [PermissionsService],
})
export class PermissionsModule {}
