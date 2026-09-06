import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'Get all roles' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'Get role by ID' })
  async findById(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @RequirePermission('users.create')
  @ApiOperation({ summary: 'Create new role' })
  async create(@Body() createRoleDto: any) {
    return this.rolesService.create(createRoleDto);
  }

  @Patch(':id')
  @RequirePermission('users.edit')
  @ApiOperation({ summary: 'Update role' })
  async update(@Param('id') id: string, @Body() updateRoleDto: any) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Post(':id/permissions/:permissionId')
  @RequirePermission('users.edit')
  @ApiOperation({ summary: 'Assign permission to role' })
  async assignPermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.assignPermission(id, permissionId);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermission('users.edit')
  @ApiOperation({ summary: 'Remove permission from role' })
  async removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.removePermission(id, permissionId);
  }
}
