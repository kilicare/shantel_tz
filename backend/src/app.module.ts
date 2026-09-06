import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import configuration from './config/configuration.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';
import { ProductsModule } from './products/products.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { SalesModule } from './sales/sales.module.js';
import { PurchasingModule } from './purchasing/purchasing.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ApprovalsModule } from './approvals/approvals.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { HealthController } from './health.controller.js';

import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    DatabaseModule,

    // Auth & Users
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,

    // Master Data
    ProductsModule,
    CustomersModule,
    SuppliersModule,
    LocationsModule,

    // Business Modules
    SalesModule,
    PurchasingModule,
    InventoryModule,
    ProjectsModule,
    ReportsModule,
    ApprovalsModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
