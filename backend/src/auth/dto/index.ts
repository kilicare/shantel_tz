import { IsEmail, IsString, MinLength, IsOptional, IsPhoneNumber } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsPhoneNumber('TZ')
  phone?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
