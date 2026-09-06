import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { PaginationService } from '../shared/services/pagination.service.js';

import { ProjectsService } from './projects/projects.service.js';
import { SerialNumbersService } from './serial-numbers/serial-numbers.service.js';
import { AssetsService } from './assets/assets.service.js';

@ApiTags('Projects, Assets & Serial Numbers')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(
    private projectsService: ProjectsService,
    private serialNumbersService: SerialNumbersService,
    private assetsService: AssetsService,
    private paginationService: PaginationService,
  ) {}

  // ====================================================================
  // STATIC ROUTES (must come before parameterized :id routes)
  // ====================================================================

  // ===== PROJECT STATIC ROUTES =====

  @Post()
  @RequirePermission('projects.create')
  @ApiOperation({ summary: 'Create project' })
  async createProject(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.projectsService.create({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get()
  @RequirePermission('projects.view')
  @ApiOperation({ summary: 'Get all projects' })
  async getAllProjects(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.projectsService.findAll(paginationParams);
  }

  // ===== SERIAL NUMBER STATIC ROUTES =====

  @Post('serial-numbers/register')
  @RequirePermission('serial_numbers.create')
  @ApiOperation({ summary: 'Register serial number' })
  async registerSerialNumber(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.serialNumbersService.register({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('serial-numbers')
  @RequirePermission('serial_numbers.view')
  @ApiOperation({ summary: 'Get all serial numbers' })
  async getAllSerialNumbers(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.serialNumbersService.findAll(paginationParams);
  }

  @Get('serial-numbers/status/:status')
  @RequirePermission('serial_numbers.view')
  @ApiOperation({ summary: 'Get serial numbers by status' })
  async getSerialNumbersByStatus(
    @Param('status') status: string,
    @Query() query: any,
  ) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.serialNumbersService.findByStatus(status, paginationParams);
  }

  @Get('serial-numbers/search')
  @RequirePermission('serial_numbers.view')
  @ApiOperation({ summary: 'Search serial numbers' })
  async searchSerialNumbers(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.serialNumbersService.search(query.q, paginationParams);
  }

  // ===== ASSET STATIC ROUTES =====

  @Post('assets')
  @RequirePermission('assets.create')
  @ApiOperation({ summary: 'Register asset' })
  async registerAsset(@Body() body: any, @Request() req: any) {
    return {
      success: true,
      data: await this.assetsService.register({
        ...body,
        userId: req.user.sub,
      }),
    };
  }

  @Get('assets')
  @RequirePermission('assets.view')
  @ApiOperation({ summary: 'Get all assets' })
  async getAllAssets(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.assetsService.findAll(paginationParams);
  }

  @Get('assets/project/:projectId')
  @RequirePermission('assets.view')
  @ApiOperation({ summary: 'Get project assets' })
  async getProjectAssets(
    @Param('projectId') projectId: string,
    @Query() query: any,
  ) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.assetsService.findByProject(projectId, paginationParams);
  }

  @Patch('assets/:id/transfer')
  @RequirePermission('assets.edit')
  @ApiOperation({ summary: 'Transfer asset' })
  async transferAsset(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.assetsService.transfer({
        ...body,
        assetId: id,
        userId: req.user.sub,
      }),
    };
  }

  @Patch('assets/:id/deactivate')
  @RequirePermission('assets.edit')
  @ApiOperation({ summary: 'Deactivate asset' })
  async deactivateAsset(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.assetsService.deactivate(id, req.user.sub),
    };
  }

  // ====================================================================
  // PARAMETERIZED ROUTES (must come after static routes)
  // ====================================================================

  // ===== PROJECT PARAMETERIZED ROUTES =====

  @Get(':id')
  @RequirePermission('projects.view')
  @ApiOperation({ summary: 'Get project by ID' })
  async getProject(@Param('id') id: string) {
    return {
      success: true,
      data: await this.projectsService.findById(id),
    };
  }

  @Post(':id/items')
  @RequirePermission('projects.edit')
  @ApiOperation({ summary: 'Add item to project' })
  async addProjectItem(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.projectsService.addItem({
        ...body,
        projectId: id,
        userId: req.user.sub,
      }),
    };
  }

  @Post(':id/consume-stock')
  @RequirePermission('projects.edit')
  @ApiOperation({ summary: 'Consume stock for project' })
  async consumeStock(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.projectsService.consumeStock({
        ...body,
        projectId: id,
        userId: req.user.sub,
      }),
    };
  }

  @Patch(':id/close')
  @RequirePermission('projects.edit')
  @ApiOperation({ summary: 'Close project' })
  async closeProject(@Param('id') id: string, @Request() req: any) {
    return {
      success: true,
      data: await this.projectsService.close(id, req.user.sub),
    };
  }

  @Get(':id/summary')
  @RequirePermission('projects.view')
  @ApiOperation({ summary: 'Get project financial summary' })
  async getProjectSummary(@Param('id') id: string) {
    return {
      success: true,
      data: await this.projectsService.getFinancialSummary(id),
    };
  }

  // ===== SERIAL NUMBER PARAMETERIZED ROUTES =====

  @Post('serial-numbers/:id/assign')
  @RequirePermission('serial_numbers.edit')
  @ApiOperation({ summary: 'Assign serial number' })
  async assignSerialNumber(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return {
      success: true,
      data: await this.serialNumbersService.assign({
        ...body,
        serialNumberId: id,
        userId: req.user.sub,
      }),
    };
  }

  @Get('serial-numbers/:id/history')
  @RequirePermission('serial_numbers.view')
  @ApiOperation({ summary: 'Get serial number history' })
  async getSerialNumberHistory(@Param('id') id: string) {
    return {
      success: true,
      data: await this.serialNumbersService.getHistory(id),
    };
  }

  @Get('serial-numbers/:id')
  @RequirePermission('serial_numbers.view')
  @ApiOperation({ summary: 'Get serial number by ID' })
  async getSerialNumber(@Param('id') id: string) {
    return {
      success: true,
      data: await this.serialNumbersService.findById(id),
    };
  }

  @Patch('serial-numbers/:id/status')
  @RequirePermission('serial_numbers.edit')
  @ApiOperation({ summary: 'Update serial number status' })
  async updateSerialNumberStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return {
      success: true,
      data: await this.serialNumbersService.updateStatus(id, body.status),
    };
  }

  // ===== ASSET PARAMETERIZED ROUTES =====

  @Get('assets/:id')
  @RequirePermission('assets.view')
  @ApiOperation({ summary: 'Get asset by ID' })
  async getAsset(@Param('id') id: string) {
    return {
      success: true,
      data: await this.assetsService.findById(id),
    };
  }
}
