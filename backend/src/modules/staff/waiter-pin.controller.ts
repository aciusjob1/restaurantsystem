import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Param, Post, Req, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('staff/waiters')
@UseGuards(AuthGuard)
export class WaiterPinController {
  constructor(private readonly db: DatabaseService) {}

  @Post(':waiterId/pin')
  async setPin(@Param('waiterId') waiterId: string, @Body() body: any, @Req() req: any) {
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      throw new ForbiddenException('Only a manager or administrator can set waiter PINs');
    }
    const pin = String(body.pin || '');
    if (!/^\d{4,8}$/.test(pin)) {
      throw new BadRequestException('PIN must contain 4–8 digits');
    }

    const pepper = process.env.WAITER_PIN_PEPPER || process.env.JWT_SECRET || 'development-only-change-me';
    const fingerprint = createHmac('sha256', pepper).update(pin).digest('hex');
    const pinHash = await bcrypt.hash(pin, 12);
    try {
      const result = await this.db.query(`
        UPDATE waiters SET pin_hash = $2, pin_fingerprint = $3, updated_at = NOW()
        WHERE id = $1 AND status = 'ACTIVE'
        RETURNING id, waiter_code, nickname
      `, [waiterId, pinHash, fingerprint]);
      if (!result.rowCount) throw new BadRequestException('Active waiter was not found');

      await this.db.query(
        "INSERT INTO audit_logs(entity_type, entity_id, action, actor_id, details) VALUES('WAITER', $1, 'PIN_SET', $2, $3)",
        [waiterId, req.user.sub, JSON.stringify({ waiterCode: result.rows[0].waiter_code })],
      );
      return { waiterId: result.rows[0].id, waiterCode: result.rows[0].waiter_code, pinSet: true };
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('That PIN is already assigned to another waiter. Choose a unique PIN.');
      }
      throw error;
    }
  }
}
