import { Module } from '@nestjs/common';
import { DatabaseService } from './services/database.service';
import { AuthGuard } from './modules/auth/auth.guard';
import { HealthController } from './modules/health/health.controller';
import { AuthController } from './modules/auth/auth.controller';
import { OrdersController } from './modules/orders/orders.controller';
import { OrderActionsController } from './modules/orders/order-actions.controller';
import { PaymentsController } from './modules/payments/payments.controller';
import { ReportsController } from './modules/reports/reports.controller';
import { PrintersController } from './modules/printers/printers.controller';
import { SyncController } from './modules/sync/sync.controller';
import { CatalogController } from './modules/catalog/catalog.controller';
import { StaffController } from './modules/staff/staff.controller';
import { WaitersController } from './modules/waiters/waiters.controller';

@Module({
  controllers: [
    HealthController,
    AuthController,
    OrdersController,
    OrderActionsController,
    PaymentsController,
    ReportsController,
    PrintersController,
    SyncController,
    CatalogController,
    StaffController,
    WaitersController,
  ],
  providers: [DatabaseService, AuthGuard],
})
export class AppModule {}
