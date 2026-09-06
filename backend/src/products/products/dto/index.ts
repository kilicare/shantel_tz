import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, IsUUID } from 'class-validator';

export enum ProductType {
  STOCK_ITEM = 'STOCK_ITEM',
  SERVICE = 'SERVICE',
  SERIALIZED_ITEM = 'SERIALIZED_ITEM',
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ProductType)
  productType: ProductType;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsUUID()
  unitId: string;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @IsBoolean()
  trackSerialNumber?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @IsBoolean()
  trackSerialNumber?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'INACTIVE';
}