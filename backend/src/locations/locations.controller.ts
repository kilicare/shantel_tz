import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { CreateLocationDto, UpdateLocationDto } from './dto/index.js';

@ApiTags('Locations')
@Controller('locations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationsController {
  constructor(
    private locationsService: LocationsService,
    private paginationService: PaginationService,
  ) {}

  @Get()
  @RequirePermission('locations.view')
  @ApiOperation({ summary: 'Get all locations' })
  async findAll(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.locationsService.findAll(paginationParams);
  }

  @Get(':id')
  @RequirePermission('locations.view')
  @ApiOperation({ summary: 'Get location by ID' })
  async findById(@Param('id') id: string) {
    return this.locationsService.findById(id);
  }

  @Get(':id/stock-summary')
  @RequirePermission('locations.view')
  @ApiOperation({ summary: 'Get location stock summary' })
  async getStockSummary(@Param('id') id: string) {
    return this.locationsService.getStockSummary(id);
  }

  @Post()
  @RequirePermission('locations.create')
  @ApiOperation({ summary: 'Create location' })
  async create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationsService.create(createLocationDto);
  }

  @Patch(':id')
  @RequirePermission('locations.edit')
  @ApiOperation({ summary: 'Update location' })
  async update(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto) {
    return this.locationsService.update(id, updateLocationDto);
  }
}