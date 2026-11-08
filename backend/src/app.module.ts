import { Module } from '@nestjs/common';
import { HealthController } from './modules/health/health.controller';
import { AuthController } from './modules/auth/auth.controller';
import { OrdersController } from './modules/orders/orders.controller';
import { PaymentsController } from './modules/payments/payments.controller';
import { ReportsController } from './modules/reports/reports.controller';
import { PrintersController } from './modules/printers/printers.controller';
import { SyncController } from './modules/sync/sync.controller';

@Module({
  imports: [],
  controllers: [
    HealthController,
    AuthController,
    OrdersController,
    PaymentsController,
    ReportsController,
    PrintersController,
    SyncController,
  ],
})
export class AppModule {}
