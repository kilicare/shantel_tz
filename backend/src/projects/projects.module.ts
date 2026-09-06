import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PaginationService } from '../shared/services/pagination.service.js';

import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects/projects.service.js';
import { SerialNumbersService } from './serial-numbers/serial-numbers.service.js';
import { AssetsService } from './assets/assets.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    PaginationService,
    ProjectsService,
    SerialNumbersService,
    AssetsService,
  ],
  controllers: [ProjectsController],
  exports: [ProjectsService, SerialNumbersService, AssetsService],
})
export class ProjectsModule {}
