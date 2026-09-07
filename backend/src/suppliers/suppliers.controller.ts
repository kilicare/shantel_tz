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
import { SuppliersService } from './suppliers.service.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/index.js';

@ApiTags('Suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(
    private suppliersService: SuppliersService,
    private paginationService: PaginationService,
  ) {}

  @Get()
  @RequirePermission('suppliers.view')
  @ApiOperation({ summary: 'Get all suppliers' })
  async findAll(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.suppliersService.findAll(paginationParams);
  }

  @Get('search')
  @RequirePermission('suppliers.view')
  @ApiOperation({ summary: 'Search suppliers' })
  async search(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.suppliersService.search(query.q, paginationParams);
  }

  @Get(':id/balance')
  @RequirePermission('suppliers.view')
  @ApiOperation({ summary: 'Get supplier balance' })
  async getBalance(@Param('id') id: string) {
    return this.suppliersService.getBalance(id);
  }

  @Get(':id')
  @RequirePermission('suppliers.view')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async findById(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Post()
  @RequirePermission('suppliers.create')
  @ApiOperation({ summary: 'Create supplier' })
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Patch(':id')
  @RequirePermission('suppliers.edit')
  @ApiOperation({ summary: 'Update supplier' })
  async update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Patch(':id/deactivate')
  @RequirePermission('suppliers.edit')
  @ApiOperation({ summary: 'Deactivate supplier' })
  async deactivate(@Param('id') id: string) {
    return this.suppliersService.deactivate(id);
  }

}