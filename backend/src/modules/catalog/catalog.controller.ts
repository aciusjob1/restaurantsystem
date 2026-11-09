import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('catalog')
@UseGuards(AuthGuard)
export class CatalogController {
  constructor(private readonly db: DatabaseService) {}

  @Get('products')
  async products() {
    return (await this.db.query(`
      SELECT p.id, p.sku, p.name, p.description, p.selling_price, p.is_available,
             p.preparation_station, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY c.name, p.name
    `)).rows;
  }

  @Get('tables')
  async tables() {
    return (await this.db.query(`
      SELECT id, table_code, table_name, seats, status, location
      FROM tables
      ORDER BY table_name
    `)).rows;
  }

  @Post('products')
  async createProduct(@Req() req: any, @Body() body: any) {
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      throw new BadRequestException('Only managers can add menu items');
    }

    if (!body.name || !body.sku || body.sellingPrice == null) {
      throw new BadRequestException('name, sku, and sellingPrice are required');
    }

    const category = body.categoryId ? await this.db.query('SELECT id FROM categories WHERE id = $1', [body.categoryId]) : null;
    const result = await this.db.query(
      `INSERT INTO products (sku, name, description, category_id, selling_price, cost_price, is_available, preparation_station)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [body.sku, body.name, body.description || null, category?.rowCount ? category.rows[0].id : null, Number(body.sellingPrice), Number(body.costPrice || 0), body.isAvailable !== false, body.preparationStation || 'KITCHEN'],
    );

    return result.rows[0];
  }
}
