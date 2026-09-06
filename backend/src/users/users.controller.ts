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
import { UsersService } from './users.service.js';
import { PaginationService } from '../shared/services/pagination.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private usersService: UsersService,
    private paginationService: PaginationService,
  ) {}

  @Get()
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'Get all users' })
  async findAll(@Query() query: any) {
    const paginationParams = this.paginationService.parsePaginationParams(query);
    return this.usersService.findAll(paginationParams);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@Request() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Get(':id')
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermission('users.create')
  @ApiOperation({ summary: 'Create new user' })
  async create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @RequirePermission('users.edit')
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/roles/:roleId')
  @RequirePermission('users.edit')
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.usersService.assignRole(id, roleId);
  }

  @Post(':id/deactivate')
  @RequirePermission('users.deactivate')
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
