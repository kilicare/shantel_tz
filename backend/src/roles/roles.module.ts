import { Module } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { RolesController } from './roles.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
