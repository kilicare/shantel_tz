import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private reflector: Reflector,
    private db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get required permissions from decorator
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    // Get user's permissions from database
    const userId = user.id ?? user.sub;
    if (!userId) {
      throw new ForbiddenException('Authenticated user identity is missing');
    }

    const userPermissions = await this.getUserPermissions(userId);

    // Check if user has required permissions
    const hasPermission = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      this.logger.warn(
        `User ${userId} denied access. Required: ${requiredPermissions.join(', ')}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    const permissions = await this.db.permission.findMany({
      where: {
        rolePermissions: {
          some: {
            role: {
              userRoles: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
      select: {
        code: true,
      },
    });

    return permissions.map((p: { code: string }) => p.code);
  }
}