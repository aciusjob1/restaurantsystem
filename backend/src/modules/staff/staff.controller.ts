import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('staff')
@UseGuards(AuthGuard)
export class StaffController {
  constructor(private readonly db: DatabaseService) {}

  @Get('waiters')
  async waiters() {
    return (await this.db.query(`
      SELECT w.id, w.waiter_code, w.nickname, w.status,
             u.id AS user_id, u.email, u.full_name,
             (w.pin_hash IS NOT NULL) AS pin_set
      FROM waiters w
      JOIN users u ON u.id = w.user_id
      ORDER BY u.full_name
    `)).rows;
  }

  @Post('waiters')
  async createWaiter(@Body() body: any, @Req() req: any) {
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      throw new ForbiddenException('Manager authorization required');
    }
    const fullName = String(body.fullName || '').trim();
    const waiterCode = String(body.waiterCode || '').trim().toUpperCase();
    if (!fullName || !waiterCode) {
      throw new BadRequestException('fullName and waiterCode are required');
    }

    return this.db.transaction(async (client) => {
      const role = await client.query("SELECT id FROM roles WHERE name = 'WAITER'");
      if (!role.rowCount) throw new BadRequestException('WAITER role is not configured');

      // Waiters authenticate with their PIN only. Create an unshared random password for the required users record.
      const email = body.email
        ? String(body.email).trim().toLowerCase()
        : `waiter.${waiterCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@waiters.local`;
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
      const user = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name`,
        [email, passwordHash, fullName, body.phone || null, role.rows[0].id],
      );
      const waiter = await client.query(
        `INSERT INTO waiters (user_id, waiter_code, nickname)
         VALUES ($1, $2, $3) RETURNING id, waiter_code, nickname, status`,
        [user.rows[0].id, waiterCode, body.nickname || fullName],
      );
      await client.query(
        "INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, details) VALUES ('WAITER', $1, 'CREATED', $2, $3)",
        [waiter.rows[0].id, req.user.sub, JSON.stringify({ waiterCode, fullName })],
      );
      return { ...waiter.rows[0], full_name: fullName, pin_set: false };
    });
  }
}
