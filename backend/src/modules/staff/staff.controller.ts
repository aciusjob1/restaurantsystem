import { Body, Controller, Get, Post, Query, Req, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

@Controller('staff')
@UseGuards(AuthGuard)
export class StaffController {
  constructor(private readonly db: DatabaseService) {}
  @Get('waiters')
  async waiters() { return (await this.db.query(`SELECT w.id,w.waiter_code,w.nickname,w.status,u.id AS user_id,u.email,u.full_name FROM waiters w JOIN users u ON u.id=w.user_id ORDER BY u.full_name`)).rows; }
  @Post('waiters')
  async createWaiter(@Body() body:any, @Req() req:any) {
    if (!['ADMIN','MANAGER'].includes(req.user.role)) throw new ForbiddenException('Manager authorization required');
    if (!body.email || !body.password || !body.fullName || !body.waiterCode) throw new BadRequestException('email, password, fullName, and waiterCode are required');
    return this.db.transaction(async (client) => {
      const role = await client.query("SELECT id FROM roles WHERE name='WAITER'");
      if (!role.rowCount) throw new BadRequestException('WAITER role missing');
      const user = await client.query('INSERT INTO users(email,password_hash,full_name,phone,role_id) VALUES($1,$2,$3,$4,$5) RETURNING id,email,full_name', [body.email.toLowerCase(),await bcrypt.hash(body.password,12),body.fullName,body.phone || null,role.rows[0].id]);
      const waiter = await client.query('INSERT INTO waiters(user_id,waiter_code,nickname) VALUES($1,$2,$3) RETURNING *', [user.rows[0].id,body.waiterCode,body.nickname || body.fullName]);
      await client.query("INSERT INTO audit_logs(entity_type,entity_id,action,actor_id,details) VALUES('WAITER',$1,'CREATED',$2,$3)", [waiter.rows[0].id,req.user.sub,JSON.stringify({email:body.email,waiterCode:body.waiterCode})]);
      return { ...waiter.rows[0], user:user.rows[0] };
    });
  }
}
