import { Module } from '@nestjs/common';
import { ProductsModule as ProductsServiceModule } from './products/products.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { BrandsModule } from './brands/brands.module.js';
import { UnitsModule } from './units/units.module.js';

@Module({
  imports: [
    CategoriesModule,
    BrandsModule,
    UnitsModule,
    ProductsServiceModule,
  ],
  exports: [
    CategoriesModule,
    BrandsModule,
    UnitsModule,
    ProductsServiceModule,
  ],
})
export class ProductsModule {}
