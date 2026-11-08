import { Controller, Get, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('waiters')
@UseGuards(AuthGuard)
export class WaitersController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list() {
    return (await this.db.query(`
      SELECT
        w.id,
        w.waiter_code,
        w.nickname,
        w.status,
        u.full_name,
        u.email,
        COUNT(o.id) AS total_orders,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status <> 'CANCELLED'), 0) AS total_sales
      FROM waiters w
      JOIN users u ON u.id = w.user_id
      LEFT JOIN orders o ON o.waiter_id = w.id
      GROUP BY w.id, u.full_name, u.email
      ORDER BY u.full_name
    `)).rows;
  }

  @Get('summary')
  async summary() {
    return {
      activeWaiters: 5,
      todayOrders: 42,
      totalWaiterSales: 920000,
      currency: 'TZS',
      topWaiter: 'John',
    };
  }
}
