import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UnitsService } from './units.service.js';
import { PaginationService } from '../../shared/services/pagination.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CreateUnitDto, UpdateUnitDto } from './dto/index.js';

@ApiTags('Products - Units')
@Controller('products/units')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UnitsController {
  constructor(
    private unitsService: UnitsService,
    private paginationService: PaginationService,
  ) {}

  @Get()
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get all units' })
  async findAll(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.unitsService.findAll(paginationParams);
  }

  @Get(':id')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get unit by ID' })
  async findById(@Param('id') id: string) {
    return this.unitsService.findById(id);
  }

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Create unit' })
  async create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @Patch(':id')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Update unit' })
  async update(@Param('id') id: string, @Body() updateUnitDto: UpdateUnitDto) {
    return this.unitsService.update(id, updateUnitDto);
  }

  @Delete(':id')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Delete unit' })
  async delete(@Param('id') id: string) {
    return this.unitsService.delete(id);
  }
}