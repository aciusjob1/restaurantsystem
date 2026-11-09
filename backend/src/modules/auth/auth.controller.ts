import { BadRequestException, Body, Controller, Get, HttpException, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  private static readonly pinAttempts = new Map<string, { startedAt: number; count: number }>();
  private static readonly pinWindowMs = 60_000;
  private static readonly pinAttemptsPerWindow = 10;

  constructor(private readonly db: DatabaseService) {}

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) throw new BadRequestException('Email and password are required');
    const result = await this.db.query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE lower(u.email) = lower($1) AND u.is_active = true`,
      [String(body.email).trim().toLowerCase()],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(body.password), user.password_hash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    const token = this.signToken({ sub: user.id, email: user.email, name: user.full_name, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.full_name, role: user.role } };
  }

  @Post('waiter-pin-login')
  async waiterPinLogin(@Body() body: any, @Req() request: Request) {
    const pin = String(body.pin || '').trim();
    if (!/^\d{4,8}$/.test(pin)) throw new BadRequestException('Enter a valid 4–8 digit waiter PIN');

    const clientKey = request.ip || request.socket.remoteAddress || 'unknown';
    this.consumePinAttempt(clientKey);

    const pepper = process.env.WAITER_PIN_PEPPER || process.env.JWT_SECRET || 'development-only-change-me';
    const fingerprint = createHmac('sha256', pepper).update(pin).digest('hex');
    const result = await this.db.query(
      `SELECT w.id AS waiter_id, w.waiter_code, w.nickname, w.pin_hash,
              u.id, u.email, u.full_name, u.is_active
       FROM waiters w JOIN users u ON u.id = w.user_id
       WHERE w.pin_fingerprint = $1 AND w.status = 'ACTIVE'`,
      [fingerprint],
    );

    const waiter = result.rows[0];
    if (!waiter || !waiter.is_active || !waiter.pin_hash || !(await bcrypt.compare(pin, waiter.pin_hash))) {
      throw new UnauthorizedException('Invalid waiter PIN');
    }

    AuthController.pinAttempts.delete(clientKey);
    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [waiter.id]);
    const token = this.signToken({
      sub: waiter.id,
      email: waiter.email,
      name: waiter.nickname || waiter.full_name,
      role: 'WAITER',
      waiterId: waiter.waiter_id,
    });

    return {
      token,
      user: {
        id: waiter.id,
        email: waiter.email,
        name: waiter.nickname || waiter.full_name,
        role: 'WAITER',
        waiterId: waiter.waiter_id,
        waiterCode: waiter.waiter_code,
      },
    };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: Request & { user?: any }) {
    const result = await this.db.query(
      `SELECT u.id, u.email, u.full_name, r.name AS role, w.id AS waiter_id, w.waiter_code
       FROM users u JOIN roles r ON r.id = u.role_id
       LEFT JOIN waiters w ON w.user_id = u.id
       WHERE u.id = $1 AND u.is_active = true`,
      [req.user.sub],
    );
    if (!result.rowCount) throw new UnauthorizedException();
    return { ...result.rows[0], role: req.user.role };
  }

  private consumePinAttempt(key: string) {
    const now = Date.now();
    const previous = AuthController.pinAttempts.get(key);
    if (!previous || now - previous.startedAt >= AuthController.pinWindowMs) {
      AuthController.pinAttempts.set(key, { startedAt: now, count: 1 });
      return;
    }
    if (previous.count >= AuthController.pinAttemptsPerWindow) {
      throw new HttpException('Too many PIN attempts. Wait one minute and try again.', 429);
    }
    previous.count += 1;
  }

  private signToken(payload: Record<string, unknown>) {
    return jwt.sign(payload, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: '12h' });
  }
}
