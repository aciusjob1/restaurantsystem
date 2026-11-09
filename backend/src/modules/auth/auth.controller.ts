import { BadRequestException, Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { createHmac } from 'crypto';
import { DatabaseService } from '../../services/database.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly db: DatabaseService) {}

  @Post('login')
  async login(@Body() body: any) {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) throw new BadRequestException('Email and password are required');

    const result = await this.db.query(`
      SELECT u.id, u.email, u.full_name, r.name AS role, u.is_active, u.password_hash
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE lower(u.email) = lower($1)
    `, [email]);
    const user = result.rows[0];
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    const token = this.createToken(user);
    return { token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } };
  }

  // Waiters authenticate with their unique PIN alone. Staff/admin accounts continue to use email and password.
  @Post('waiter-pin-login')
  async waiterPinLogin(@Body() body: any) {
    const pin = String(body.pin || '');
    if (!/^\d{4,8}$/.test(pin)) {
      throw new BadRequestException('Enter your 4–8 digit waiter PIN');
    }

    const fingerprint = this.pinFingerprint(pin);
    const result = await this.db.query(`
      SELECT u.id, u.email, u.full_name, u.is_active, w.id AS waiter_id,
             w.waiter_code, w.nickname, w.pin_hash
      FROM waiters w JOIN users u ON u.id = w.user_id
      WHERE w.pin_fingerprint = $1 AND w.status = 'ACTIVE'
    `, [fingerprint]);
    const waiter = result.rows[0];
    if (!waiter || !waiter.is_active || !waiter.pin_hash || !(await bcrypt.compare(pin, waiter.pin_hash))) {
      throw new UnauthorizedException('Invalid waiter PIN');
    }

    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [waiter.id]);
    const token = jwt.sign(
      { sub: waiter.id, email: waiter.email, full_name: waiter.full_name, role: 'WAITER', waiterId: waiter.waiter_id },
      process.env.JWT_SECRET || 'development-only-change-me',
      { expiresIn: '12h' },
    );
    return {
      token,
      user: {
        id: waiter.id,
        email: waiter.email,
        full_name: waiter.nickname || waiter.full_name,
        role: 'WAITER',
        waiterId: waiter.waiter_id,
        waiterCode: waiter.waiter_code,
      },
    };
  }

  @Get('me')
  async me(@Req() req: any) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token required');
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-only-change-me') as any;
      const result = await this.db.query(`
        SELECT u.id, u.email, u.full_name, r.name AS role, w.id AS waiter_id, w.waiter_code
        FROM users u JOIN roles r ON r.id = u.role_id
        LEFT JOIN waiters w ON w.user_id = u.id
        WHERE u.id = $1 AND u.is_active = true
      `, [payload.sub]);
      if (!result.rowCount) throw new UnauthorizedException('User not found');
      return result.rows[0];
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private createToken(user: any) {
    return jwt.sign(
      { sub: user.id, email: user.email, full_name: user.full_name, role: user.role },
      process.env.JWT_SECRET || 'development-only-change-me',
      { expiresIn: '12h' },
    );
  }

  private pinFingerprint(pin: string) {
    const pepper = process.env.WAITER_PIN_PEPPER || process.env.JWT_SECRET || 'development-only-change-me';
    return createHmac('sha256', pepper).update(pin).digest('hex');
  }
}
