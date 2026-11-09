import { BadRequestException, Controller, Get, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller()
@UseGuards(AuthGuard)
export class CatalogAliasController {
  constructor(private readonly db: DatabaseService) {}

  @Get('products')
  async products() {
    return this.db.query(`
      SELECT p.id, p.sku, p.name, p.description, p.selling_price, p.is_available,
             p.preparation_station, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY c.name, p.name
    `).then((result) => result.rows);
  }

  @Get('tables')
  async tables() {
    return this.db.query(`
      SELECT id, table_code, table_name, seats, status, location
      FROM tables
      ORDER BY table_name
    `).then((result) => result.rows);
  }
}
