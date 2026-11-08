import { BadRequestException, Body, ConflictException, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list() {
    const result = await this.db.query(`
      SELECT o.id, o.order_number, o.status, o.order_type, o.currency, o.total_amount, o.created_at,
        COALESCE(w.nickname, u.full_name, 'Unassigned') AS waiter_name,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id AND p.status = 'PAID'), 0) AS paid_amount
      FROM orders o
      LEFT JOIN waiters w ON w.id = o.waiter_id
      LEFT JOIN users u ON u.id = w.user_id
      ORDER BY o.created_at DESC LIMIT 200
    `);
    return result.rows;
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const user = req.user;
    const key = String(body.idempotencyKey || randomUUID());

    try {
      return await this.db.transaction(async (client) => {
        const existing = await client.query('SELECT * FROM orders WHERE idempotency_key = $1', [key]);
        if (existing.rowCount) {
          return existing.rows[0];
        }

        const waiterResult = user.role === 'WAITER'
          ? await client.query("SELECT id FROM waiters WHERE user_id = $1 AND status = 'ACTIVE'", [user.sub])
          : await client.query("SELECT id FROM waiters WHERE id = $1 AND status = 'ACTIVE'", [body.waiterId || null]);

        if (user.role === 'WAITER' && !waiterResult.rowCount) {
          throw new BadRequestException('Your waiter profile is inactive');
        }

        if (user.role !== 'WAITER' && body.waiterId && !waiterResult.rowCount) {
          throw new BadRequestException('Selected waiter is not active');
        }

        const waiterId = waiterResult.rows[0]?.id || null;
        let subtotal = 0;
        const itemLines: any[] = [];

        for (const item of body.items) {
          const quantity = Number(item.quantity);
          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new BadRequestException('Quantity must be a positive whole number');
          }

          const productResult = await client.query(
            'SELECT id, name, selling_price, preparation_station, is_available FROM products WHERE id = $1 FOR SHARE',
            [item.productId],
          );
          const product = productResult.rows[0];

          if (!product || !product.is_available) {
            throw new BadRequestException(`Product is unavailable: ${item.productId}`);
          }

          const unitPrice = Number(product.selling_price);
          subtotal += unitPrice * quantity;
          itemLines.push({
            id: product.id,
            name: product.name,
            quantity,
            unitPrice,
            notes: item.notes || null,
            preparation_station: product.preparation_station,
          });
        }

        const discount = Number(body.discountAmount || 0);
        if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
          throw new BadRequestException('Invalid discount');
        }

        if (discount > 0 && !['ADMIN', 'MANAGER'].includes(user.role)) {
          throw new BadRequestException('Manager approval is required for discounts');
        }

        const total = subtotal - discount;
        const id = body.id || randomUUID();
        const orderNumber = `CS-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now().toString().slice(-6)}`;

        const inserted = await client.query(`
          INSERT INTO orders (
            id, order_number, waiter_id, original_waiter_id, table_id, order_type, status,
            currency, subtotal, discount_amount, total_amount, notes, created_by, updated_by, idempotency_key
          )
          VALUES ($1, $2, $3, $3, $4, $5, 'SENT_TO_KITCHEN', 'TZS', $6, $7, $8, $9, $10, $10, $11)
          RETURNING *
        `, [
          id,
          orderNumber,
          waiterId,
          body.tableId || null,
          body.orderType || 'DINE_IN',
          subtotal,
          discount,
          total,
          body.notes || null,
          user.sub,
          key,
        ]);

        for (const line of itemLines) {
          await client.query(
            'INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_amount, notes) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, line.id, line.quantity, line.unitPrice, line.quantity * line.unitPrice, line.notes],
          );
        }

        const stations = [...new Set(itemLines.map((line) => line.preparation_station))];
        for (const station of stations) {
          const printer = await client.query(
            'SELECT id FROM printers WHERE type = $1 AND is_active = true ORDER BY name LIMIT 1',
            [station],
          );

          if (printer.rowCount) {
            await client.query(
              'INSERT INTO print_jobs (order_id, printer_id, ticket_type, payload) VALUES ($1, $2, $3, $4)',
              [
                id,
                printer.rows[0].id,
                station,
                JSON.stringify({
                  orderNumber,
                  items: itemLines.filter((line) => line.preparation_station === station).map((line) => ({
                    name: line.name,
                    quantity: line.quantity,
                    notes: line.notes,
                  })),
                  notes: body.notes || null,
                }),
              ],
            );
          }
        }

        await client.query(
          "INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, details) VALUES ('ORDER', $1, 'CREATED', $2, $3)",
          [id, user.sub, JSON.stringify({ orderNumber, total, waiterId })],
        );

        return inserted.rows[0];
      });
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('This order was already submitted');
      }
      throw error;
    }
  }
}
