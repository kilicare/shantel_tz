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
import { BrandsService } from './brands.service.js';
import { PaginationService } from '../../shared/services/pagination.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CreateBrandDto, UpdateBrandDto } from './dto/index.js';

@ApiTags('Products - Brands')
@Controller('products/brands')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BrandsController {
  constructor(
    private brandsService: BrandsService,
    private paginationService: PaginationService,
  ) {}

  @Get()
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get all brands' })
  async findAll(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.brandsService.findAll(paginationParams);
  }

  @Get(':id')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get brand by ID' })
  async findById(@Param('id') id: string) {
    return this.brandsService.findById(id);
  }

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Create brand' })
  async create(@Body() createBrandDto: CreateBrandDto) {
    return this.brandsService.create(createBrandDto);
  }

  @Patch(':id')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Update brand' })
  async update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.brandsService.update(id, updateBrandDto);
  }

  @Delete(':id')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Delete brand' })
  async delete(@Param('id') id: string) {
    return this.brandsService.delete(id);
  }
}