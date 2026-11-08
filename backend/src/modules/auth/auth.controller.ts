import { Body, Controller, Get, Post, Req, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../services/database.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly db: DatabaseService) {}

  @Post('login')
  async login(@Body() body: any) {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const result = await this.db.query(
      `SELECT u.id, u.email, u.full_name, u.role_id, r.name AS role, u.is_active,
              u.password_hash
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1`,
      [email],
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, full_name: user.full_name, role: user.role },
      process.env.JWT_SECRET || 'development-only-change-me',
      { expiresIn: '12h' },
    );

    return { token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } };
  }

  @Get('me')
  async me(@Req() req: any) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw new UnauthorizedException('Bearer token required');
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-only-change-me') as any;
      const result = await this.db.query(
        `SELECT u.id, u.email, u.full_name, r.name AS role
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1`,
        [payload.sub],
      );
      if (!result.rowCount) {
        throw new UnauthorizedException('User not found');
      }
      return result.rows[0];
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post('register')
  async register(@Body() body: any) {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    const roleName = String(body.role || 'CASHIER');

    if (!email || !password || !fullName) {
      throw new BadRequestException('email, password, and fullName are required');
    }

    const role = await this.db.query("SELECT id, name FROM roles WHERE name = $1", [roleName.toUpperCase()]);
    if (!role.rowCount) {
      throw new BadRequestException('Unsupported role');
    }

    const exists = await this.db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rowCount) {
      throw new ConflictException('User already exists');
    }

    const created = await this.db.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, full_name`,
      [email, await bcrypt.hash(password, 12), fullName, role.rows[0].id],
    );

    return { id: created.rows[0].id, email: created.rows[0].email, full_name: created.rows[0].full_name, role: roleName.toUpperCase() };
  }
}
