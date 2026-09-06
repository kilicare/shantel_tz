import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum LocationType {
  MAIN_STORE = 'MAIN_STORE',
  BRANCH = 'BRANCH',
  PROJECT_STORE = 'PROJECT_STORE',
  OTHER = 'OTHER',
}

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(LocationType)
  locationType: LocationType;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'INACTIVE';
}