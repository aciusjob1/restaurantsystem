import { BadRequestException, Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { createHmac } from 'crypto';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly db: DatabaseService) {}

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }

    const result = await this.db.query(
      `SELECT u.id, u.email, u.password_hash, u.full_name, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE lower(u.email) = lower($1) AND u.is_active = true`,
      [String(body.email).trim().toLowerCase()],
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(body.password), user.password_hash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.full_name, role: user.role },
      process.env.JWT_SECRET || 'development-only-change-me',
      { expiresIn: '12h' },
    );

    return { token, user: { id: user.id, email: user.email, name: user.full_name, role: user.role } };
  }

  @Post('waiter-pin-login')
  async waiterPinLogin(@Body() body: any) {
    const pin = String(body.pin || '').trim();
    if (!/^\d{4,8}$/.test(pin)) {
      throw new BadRequestException('Enter a valid 4–8 digit waiter PIN');
    }

    const pepper = process.env.WAITER_PIN_PEPPER || process.env.JWT_SECRET || 'development-only-change-me';
    const fingerprint = createHmac('sha256', pepper).update(pin).digest('hex');

    const result = await this.db.query(
      `SELECT w.id AS waiter_id, w.waiter_code, w.nickname, w.pin_hash,
              u.id, u.email, u.full_name, u.is_active
       FROM waiters w
       JOIN users u ON u.id = w.user_id
       WHERE w.pin_fingerprint = $1 AND w.status = 'ACTIVE'`,
      [fingerprint],
    );

    const waiter = result.rows[0];
    if (!waiter || !waiter.is_active || !waiter.pin_hash || !(await bcrypt.compare(pin, waiter.pin_hash))) {
      throw new UnauthorizedException('Invalid waiter PIN');
    }

    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [waiter.id]);

    const token = jwt.sign(
      {
        sub: waiter.id,
        email: waiter.email,
        name: waiter.full_name,
        role: 'WAITER',
        waiterId: waiter.waiter_id,
      },
      process.env.JWT_SECRET || 'development-only-change-me',
      { expiresIn: '12h' },
    );

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
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN waiters w ON w.user_id = u.id
       WHERE u.id = $1 AND u.is_active = true`,
      [req.user.sub],
    );

    if (!result.rowCount) {
      throw new UnauthorizedException();
    }

    return { ...result.rows[0], role: req.user.role };
  }
}
