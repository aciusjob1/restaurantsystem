import { Controller, Get, Post, Body, UseGuards, Req, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('printers')
@UseGuards(AuthGuard)
export class PrintersController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async list() {
    return (await this.db.query(`
      SELECT id, name, type, ip_address, port, model, location, is_active
      FROM printers
      ORDER BY name
    `)).rows;
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      throw new ForbiddenException('Manager authorization required');
    }

    if (!body.name || !body.type || !body.port) {
      throw new BadRequestException('name, type, and port are required');
    }

    const result = await this.db.query(
      `INSERT INTO printers (name, type, ip_address, port, model, location, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [body.name, body.type, body.ipAddress || null, Number(body.port), body.model || null, body.location || null, body.isActive !== false],
    );

    return result.rows[0];
  }
}
