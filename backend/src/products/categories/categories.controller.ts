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
import { CategoriesService } from './categories.service.js';
import { PaginationService } from '../../shared/services/pagination.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/index.js';

@ApiTags('Products - Categories')
@Controller('products/categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoriesController {
  constructor(
    private categoriesService: CategoriesService,
    private paginationService: PaginationService,
  ) {}

  @Get()
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get all categories' })
  async findAll(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.categoriesService.findAll(paginationParams);
  }

  @Get(':id')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get category by ID' })
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Create category' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Update category' })
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Delete category' })
  async delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}