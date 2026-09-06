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
import { CustomersService } from './customers.service.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/index.js';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private customersService: CustomersService,
    private paginationService: PaginationService,
  ) {}

  @Get()
  @RequirePermission('customers.view')
  @ApiOperation({ summary: 'Get all customers' })
  async findAll(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.customersService.findAll(paginationParams);
  }

  @Get('search')
  @RequirePermission('customers.view')
  @ApiOperation({ summary: 'Search customers' })
  async search(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.customersService.search(query.q, paginationParams);
  }

  @Get(':id')
  @RequirePermission('customers.view')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Get(':id/balance')
  @RequirePermission('customers.view')
  @ApiOperation({ summary: 'Get customer balance' })
  async getBalance(@Param('id') id: string) {
    return this.customersService.getBalance(id);
  }

  @Post()
  @RequirePermission('customers.create')
  @ApiOperation({ summary: 'Create customer' })
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Patch(':id')
  @RequirePermission('customers.edit')
  @ApiOperation({ summary: 'Update customer' })
  async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Patch(':id/deactivate')
  @RequirePermission('customers.edit')
  @ApiOperation({ summary: 'Deactivate customer' })
  async deactivate(@Param('id') id: string) {
    return this.customersService.deactivate(id);
  }
}