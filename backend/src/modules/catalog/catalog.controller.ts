import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
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
             p.preparation_station, p.category_id, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY c.name, p.name
    `)).rows;
  }

  @Get('categories')
  async categories() {
    return (await this.db.query('SELECT id, name, description FROM categories ORDER BY name')).rows;
  }

  @Get('tables')
  async tables() {
    return (await this.db.query(`
      SELECT id, table_code, table_name, seats, status, location
      FROM tables
      ORDER BY table_name
    `)).rows;
  }

  @Post('categories')
  async createCategory(@Req() req: any, @Body() body: any) {
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      throw new ForbiddenException('Only managers or administrators can add categories');
    }
    const name = String(body.name || '').trim();
    if (!name) throw new BadRequestException('Category name is required');

    const existing = await this.db.query('SELECT id FROM categories WHERE lower(name) = lower($1)', [name]);
    if (existing.rowCount) throw new BadRequestException('That category already exists');
    const result = await this.db.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id, name, description',
      [name, body.description ? String(body.description).trim() : null],
    );
    return result.rows[0];
  }

  @Post('products')
  async createProduct(@Req() req: any, @Body() body: any) {
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      throw new ForbiddenException('Only managers or administrators can add menu items');
    }

    const sku = String(body.sku || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const price = Number(body.sellingPrice);
    if (!name || !sku || body.sellingPrice == null || !Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Name, SKU, and a positive selling price are required');
    }

    let categoryId: string | null = null;
    if (body.categoryId) {
      const category = await this.db.query('SELECT id FROM categories WHERE id = $1', [body.categoryId]);
      if (!category.rowCount) throw new BadRequestException('Selected category does not exist');
      categoryId = category.rows[0].id;
    }

    const result = await this.db.query(
      `INSERT INTO products (sku, name, description, category_id, selling_price, cost_price, is_available, preparation_station)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, sku, name, description, category_id, selling_price, is_available, preparation_station`,
      [sku, name, body.description ? String(body.description).trim() : null, categoryId, price, Number(body.costPrice || 0), body.isAvailable !== false, body.preparationStation || 'KITCHEN'],
    );
    return result.rows[0];
  }
}
