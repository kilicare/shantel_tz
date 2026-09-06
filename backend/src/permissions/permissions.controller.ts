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
import { PermissionsService } from './permissions.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../common/decorators/require-permission.decorator.js';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'Get all permissions' })
  async findAll(@Query('module') module?: string) {
    return this.permissionsService.findAll(module);
  }

  @Get('module/:module')
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'Get permissions by module' })
  async findByModule(@Param('module') module: string) {
    return this.permissionsService.findByModule(module);
  }

  @Get(':id')
  @RequirePermission('users.view')
  @ApiOperation({ summary: 'Get permission by ID' })
  async findById(@Param('id') id: string) {
    return this.permissionsService.findById(id);
  }

  @Post()
  @RequirePermission('users.create')
  @ApiOperation({ summary: 'Create new permission' })
  async create(@Body() createPermissionDto: any) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Patch(':id')
  @RequirePermission('users.edit')
  @ApiOperation({ summary: 'Update permission' })
  async update(@Param('id') id: string, @Body() updatePermissionDto: any) {
    return this.permissionsService.update(id, updatePermissionDto);
  }
}
