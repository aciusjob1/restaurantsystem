import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly db: DatabaseService) {}
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) throw new UnauthorizedException('Email and password are required');
    const result = await this.db.query('SELECT u.id,u.email,u.password_hash,u.full_name,r.name AS role FROM users u JOIN roles r ON r.id=u.role_id WHERE lower(u.email)=lower($1) AND u.is_active=true', [body.email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) throw new UnauthorizedException('Incorrect email or password');
    await this.db.query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [user.id]);
    const token = jwt.sign({ sub: user.id, email: user.email, name: user.full_name, role: user.role }, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: '12h' });
    return { token, user: { id: user.id, email: user.email, name: user.full_name, role: user.role } };
  }
  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: Request & { user?: any }) {
    const result = await this.db.query('SELECT id,email,full_name FROM users WHERE id=$1 AND is_active=true', [req.user.sub]);
    if (!result.rowCount) throw new UnauthorizedException();
    return { ...result.rows[0], role: req.user.role };
  }
}
