import { Controller, Get, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('sync')
@UseGuards(AuthGuard)
export class SyncController {
  constructor(private readonly db: DatabaseService) {}

  @Get('events')
  async list(@Req() req: any) {
    return (await this.db.query(
      `SELECT * FROM sync_events WHERE device_id = $1 OR actor_id = $2 ORDER BY created_at DESC LIMIT 100`,
      [req.headers['x-device-id'] || null, req.user.sub],
    )).rows;
  }

  @Post('events')
  async record(@Req() req: any, @Body() body: any) {
    if (!body.eventType) {
      throw new BadRequestException('eventType is required');
    }

    const result = await this.db.query(
      `INSERT INTO sync_events (device_id, order_id, event_type, payload, status, idempotency_key)
       VALUES ($1, $2, $3, $4, 'QUEUED', $5)
       RETURNING *`,
      [req.headers['x-device-id'] || null, body.orderId || null, body.eventType, JSON.stringify(body.payload || {}), body.idempotencyKey || null],
    );

    return result.rows[0];
  }
}
