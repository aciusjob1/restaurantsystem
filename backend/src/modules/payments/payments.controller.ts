import { BadRequestException, Body, ConflictException, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly db: DatabaseService) {}

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const amount = Number(body.amount);
    if (!body.orderId || !body.methodCode || !Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('orderId, methodCode and a positive amount are required');
    }

    const key = String(body.idempotencyKey || `${body.orderId}:${body.methodCode}:${amount}:${body.paymentReference || ''}`);

    try {
      return await this.db.transaction(async (client) => {
        const duplicate = await client.query('SELECT * FROM payments WHERE idempotency_key = $1', [key]);
        if (duplicate.rowCount) {
          return duplicate.rows[0];
        }

        const orderResult = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [body.orderId]);
        const order = orderResult.rows[0];
        if (!order || ['CANCELLED', 'REFUNDED', 'CANCELLATION_REQUESTED'].includes(order.status)) {
          throw new BadRequestException('Order is not payable');
        }

        const paidResult = await client.query(
          "SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE order_id = $1 AND status = 'PAID'",
          [order.id],
        );
        const paid = Number(paidResult.rows[0].paid);
        const outstanding = Number(order.total_amount) - paid;
        if (amount > outstanding) {
          throw new BadRequestException('Payment exceeds the outstanding balance');
        }

        const method = await client.query('SELECT id FROM payment_methods WHERE code = $1 AND active = true', [body.methodCode]);
        if (!method.rowCount) {
          throw new BadRequestException('Payment method is unavailable');
        }

        const payment = await client.query(
          `INSERT INTO payments (order_id, payment_method_id, amount, paid_by, payment_reference, status, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, 'PAID', $6)
           RETURNING *`,
          [order.id, method.rows[0].id, amount, req.user.sub, body.paymentReference || null, key],
        );

        if (paid + amount >= Number(order.total_amount)) {
          await client.query(
            'UPDATE orders SET status = ' + "'PAID'" + ', updated_by = $2, updated_at = NOW() WHERE id = $1',
            [order.id, req.user.sub],
          );
        }

        await client.query(
          "INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, details) VALUES ('PAYMENT', $1, 'RECORDED', $2, $3)",
          [payment.rows[0].id, req.user.sub, JSON.stringify({ orderId: order.id, amount, methodCode: body.methodCode })],
        );

        return payment.rows[0];
      });
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('Payment was already recorded');
      }
      throw error;
    }
  }
}
