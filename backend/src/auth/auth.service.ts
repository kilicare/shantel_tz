import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service.js';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/index.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // LOGIN
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    this.logger.debug(`Login attempt: ${email}`);

    // Find user
    const user = await this.db.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`Login failed: User not found - ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      this.logger.warn(`Login failed: User inactive - ${email}`);
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify password
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      this.logger.warn(`Login failed: Invalid password - ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Get permissions
    const permissions = user.userRoles.flatMap((ur) =>
      ur.role.rolePermissions.map((rp) => rp.permission.code),
    );

    // Generate tokens
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        permissions,
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.refreshTokenExpiry'),
      },
    );

    // Update last login
    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log audit
    await this.db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entityType: 'USER',
        timestamp: new Date(),
      },
    });

    this.logger.log(`Login successful: ${email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        roles: user.userRoles.map((ur) => ur.role.name),
        permissions,
      },
    };
  }

  // REFRESH TOKEN
  async refreshAccessToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.secret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.db.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User not found or inactive');
      }

      const permissions = user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.code),
      );

      const newAccessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          permissions,
        },
        {
          secret: this.configService.get('jwt.secret'),
          expiresIn: this.configService.get('jwt.expiresIn'),
        },
      );

      return {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
      };
    } catch (error) {
      this.logger.warn(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // REGISTER (Admin only)
  async register(registerDto: RegisterDto) {
    const { email, username, password, name, phone } = registerDto;

    this.logger.debug(`Register attempt: ${email}`);

    // Check if user exists
    const existingUser = await this.db.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    // Hash password
    const passwordHash: string = await bcrypt.hash(
      password,
      this.configService.get('security.bcryptRounds') || 10,
    );

    // Create user
    const user = await this.db.user.create({
      data: {
        email,
        username,
        name,
        phone,
        passwordHash: passwordHash,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`User registered: ${email}`);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
    };
  }

  // CHANGE PASSWORD
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    this.logger.debug(`Password change request for user: ${userId}`);

    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash: string = await bcrypt.hash(
      newPassword,
      this.configService.get('security.bcryptRounds') || 10,
    );

    // Update password
    await this.db.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        lastPasswordChangeAt: new Date(),
      },
    });

    // Log audit
    await this.db.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'USER',
        entityId: userId,
        afterData: { action: 'PASSWORD_CHANGED' },
      },
    });

    this.logger.log(`Password changed for user: ${userId}`);

    return {
      message: 'Password changed successfully',
    };
  }

  // VALIDATE TOKEN
  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.secret'),
      });

      const user = await this.db.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
