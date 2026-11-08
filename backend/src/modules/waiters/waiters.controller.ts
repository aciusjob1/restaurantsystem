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
      SELECT w.id,w.waiter_code,w.nickname,w.status,u.full_name,
        COUNT(o.id)::int AS total_orders,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status <> 'CANCELLED'),0) AS total_sales
      FROM waiters w JOIN users u ON u.id=w.user_id
      LEFT JOIN orders o ON o.waiter_id=w.id
      WHERE w.status='ACTIVE' AND u.is_active=true
      GROUP BY w.id,u.full_name ORDER BY u.full_name
    `)).rows;
  }

  @Get('summary')
  async summary() {
    const result = await this.db.query(`
      SELECT COUNT(DISTINCT w.id)::int AS active_waiters,
        COUNT(o.id)::int AS today_orders,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status <> 'CANCELLED'),0) AS total_waiter_sales
      FROM waiters w LEFT JOIN orders o ON o.waiter_id=w.id AND o.created_at::date=(NOW() AT TIME ZONE 'Africa/Dar_es_Salaam')::date
      WHERE w.status='ACTIVE'
    `);
    return { ...result.rows[0], currency:'TZS' };
  }
}
