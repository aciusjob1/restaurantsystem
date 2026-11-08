import { Controller, Get, Query } from '@nestjs/common';

@Controller('reports')
export class ReportsController {
  @Get('daily-summary')
  dailySummary(@Query('date') date?: string) {
    return {
      date: date ?? 'today',
      openingBalance: 0,
      grossSales: 480000,
      discounts: 20000,
      refunds: 0,
      netSales: 460000,
      paymentsReceived: 450000,
      outstandingBills: 30000,
      closingBalance: 450000,
    };
  }

  @Get('waiter-performance')
  waiterPerformance() {
    return [
      { waiter: 'John', orders: 22, salesTZS: 480000, payments: 450000 },
      { waiter: 'Mary', orders: 18, salesTZS: 350000, payments: 350000 },
      { waiter: 'Peter', orders: 15, salesTZS: 290000, payments: 260000 },
    ];
  }
}
