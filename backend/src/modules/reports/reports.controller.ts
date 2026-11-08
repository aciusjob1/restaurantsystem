import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly db: DatabaseService) {}
  @Get('daily-summary')
  async dailySummary(@Query('date') date?: string) {
    const day = date || new Date().toISOString().slice(0,10);
    const result = await this.db.query(`SELECT COALESCE(SUM(o.subtotal),0) gross_sales,COALESCE(SUM(o.discount_amount),0) discounts,COALESCE(SUM(o.total_amount),0) net_sales,COALESCE((SELECT SUM(amount) FROM payments WHERE status='PAID' AND created_at::date=$1::date),0) payments_received,COALESCE((SELECT SUM(o2.total_amount-COALESCE(p.paid,0)) FROM orders o2 LEFT JOIN (SELECT order_id,SUM(amount) paid FROM payments WHERE status='PAID' GROUP BY order_id) p ON p.order_id=o2.id WHERE o2.created_at::date=$1::date AND o2.status<>'CANCELLED'),0) outstanding_orders,COUNT(*) FILTER(WHERE o.status='CANCELLED') cancelled_orders FROM orders o WHERE o.created_at::date=$1::date`, [day]);
    return { date:day,currency:'TZS',...result.rows[0] };
  }
  @Get('waiter-performance')
  async waiterPerformance(@Query('date') date?: string) {
    const day=date || new Date().toISOString().slice(0,10);
    return (await this.db.query(`SELECT w.id,w.waiter_code,COALESCE(w.nickname,u.full_name) waiter,COUNT(o.id) FILTER(WHERE o.status<>'CANCELLED') orders,COALESCE(SUM(o.total_amount) FILTER(WHERE o.status<>'CANCELLED'),0) sales_tzs,COALESCE(SUM(p.amount),0) payments_tzs FROM waiters w JOIN users u ON u.id=w.user_id LEFT JOIN orders o ON o.waiter_id=w.id AND o.created_at::date=$1::date LEFT JOIN payments p ON p.order_id=o.id AND p.status='PAID' GROUP BY w.id,u.full_name ORDER BY sales_tzs DESC`, [day])).rows;
  }
  @Get('products')
  async productPerformance(@Query('from') from?: string, @Query('to') to?: string) {
    const start=from || new Date().toISOString().slice(0,10), end=to || start;
    return (await this.db.query(`SELECT p.id,p.name,COALESCE(SUM(i.quantity),0) quantity_sold,COALESCE(SUM(i.total_amount),0) revenue_tzs FROM order_items i JOIN orders o ON o.id=i.order_id JOIN products p ON p.id=i.product_id WHERE o.status<>'CANCELLED' AND o.created_at::date BETWEEN $1::date AND $2::date GROUP BY p.id,p.name ORDER BY revenue_tzs DESC`, [start,end])).rows;
  }
}
