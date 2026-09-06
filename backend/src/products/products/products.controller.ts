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
import { ProductsService } from './products.service.js';
import { PaginationService } from '../../shared/services/pagination.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CreateProductDto, UpdateProductDto } from './dto/index.js';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private paginationService: PaginationService,
  ) {}

  @Get()
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get all products' })
  async findAll(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    const filters = {
      categoryId: query.categoryId,
      status: query.status,
    };
    return this.productsService.findAll(paginationParams, filters);
  }

  @Get('search')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Search products by name, SKU, or barcode' })
  async search(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.productsService.search(query.q, paginationParams);
  }

  @Get('sku/:sku')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get product by SKU' })
  async findBySku(@Param('sku') sku: string) {
    return this.productsService.findBySku(sku);
  }

  @Get('units')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get all units (static route)' })
  async getUnits(@Query() query: any) {
    // This is a proxy to the units controller
    // Redirect or just return empty to avoid route conflict
    return { success: true, message: 'Use /products/units endpoint', data: [] };
  }

  @Get('categories')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get all categories (static route)' })
  async getCategories(@Query() query: any) {
    // This is a proxy to the categories controller
    return { success: true, message: 'Use /products/categories endpoint', data: [] };
  }

  @Get(':id')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get product by ID' })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Get(':id/stock')
  @RequirePermission('products.view')
  @ApiOperation({ summary: 'Get product stock balance' })
  async getStockBalance(@Param('id') id: string, @Query('locationId') locationId?: string) {
    return this.productsService.getStockBalance(id, locationId);
  }

  @Post()
  @RequirePermission('products.create')
  @ApiOperation({ summary: 'Create product' })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Update product' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/deactivate')
  @RequirePermission('products.edit')
  @ApiOperation({ summary: 'Deactivate product' })
  async deactivate(@Param('id') id: string) {
    return this.productsService.deactivate(id);
  }
}