import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
    return (await this.db.query('SELECT id, table_code, table_name, seats, status, location FROM tables ORDER BY table_name')).rows;
  }

  @Post('categories')
  async createCategory(@Req() req: any, @Body() body: any) {
    this.requireManager(req.user);
    const name = String(body.name || '').trim();
    if (!name) throw new BadRequestException('Category name is required');
    try {
      const result = await this.db.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id, name, description',
        [name, body.description ? String(body.description).trim() : null],
      );
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') throw new ConflictException('That category already exists');
      throw error;
    }
  }

  @Post('products')
  async createProduct(@Req() req: any, @Body() body: any) {
    this.requireManager(req.user);
    const sku = String(body.sku || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    const price = Number(body.sellingPrice);
    if (!name || !sku || body.sellingPrice == null || !Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('Name, SKU, and a positive selling price are required');
    }
    const categoryId = await this.validateCategory(body.categoryId);
    try {
      const result = await this.db.query(
        `INSERT INTO products (sku, name, description, category_id, selling_price, cost_price, is_available, preparation_station)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, sku, name, description, category_id, selling_price, is_available, preparation_station`,
        [sku, name, body.description ? String(body.description).trim() : null, categoryId, price, Number(body.costPrice || 0), body.isAvailable !== false, body.preparationStation || 'KITCHEN'],
      );
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') throw new ConflictException('That SKU is already in use');
      throw error;
    }
  }

  @Patch('products/:productId')
  async updateProduct(@Req() req: any, @Body() body: any) {
    this.requireManager(req.user);
    const productId = req.params.productId;
    const currentResult = await this.db.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (!currentResult.rowCount) throw new BadRequestException('Product was not found');
    const current = currentResult.rows[0];
    const name = body.name === undefined ? current.name : String(body.name).trim();
    const sku = body.sku === undefined ? current.sku : String(body.sku).trim().toUpperCase();
    const price = body.sellingPrice === undefined ? Number(current.selling_price) : Number(body.sellingPrice);
    const categoryId = body.categoryId === undefined ? current.category_id : await this.validateCategory(body.categoryId);
    const isAvailable = body.isAvailable === undefined ? current.is_available : body.isAvailable;
    const preparationStation = body.preparationStation === undefined ? current.preparation_station : String(body.preparationStation);

    if (!name || !sku || !Number.isFinite(price) || price <= 0 || typeof isAvailable !== 'boolean') {
      throw new BadRequestException('Name, SKU, positive price, and availability are required');
    }
    try {
      const updated = await this.db.query(
        `UPDATE products SET sku=$2, name=$3, category_id=$4, selling_price=$5,
           is_available=$6, preparation_station=$7, updated_at=NOW()
         WHERE id=$1
         RETURNING id, sku, name, description, category_id, selling_price, is_available, preparation_station`,
        [productId, sku, name, categoryId, price, isAvailable, preparationStation],
      );
      return updated.rows[0];
    } catch (error: any) {
      if (error.code === '23505') throw new ConflictException('That SKU is already in use');
      throw error;
    }
  }

  private async validateCategory(categoryId?: string | null): Promise<string | null> {
    if (!categoryId) return null;
    const category = await this.db.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (!category.rowCount) throw new BadRequestException('Selected category does not exist');
    return category.rows[0].id;
  }

  private requireManager(user: any) {
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      throw new ForbiddenException('Only managers or administrators can manage the menu');
    }
  }
}
