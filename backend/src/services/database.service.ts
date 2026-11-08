import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, PoolClient, QueryResult } from 'pg';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly pool: Pool;
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  async onModuleInit() {
    await this.pool.query('SELECT 1');
    const email = process.env.ADMIN_EMAIL || 'admin@citysquare.local';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const role = await this.pool.query("SELECT id FROM roles WHERE name='ADMIN'");
    if (!role.rowCount) throw new Error('ADMIN role missing; database seed did not run');
    const exists = await this.pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (!exists.rowCount) {
      const hash = await bcrypt.hash(password, 12);
      await this.pool.query('INSERT INTO users(email,password_hash,full_name,role_id) VALUES($1,$2,$3,$4)', [email, hash, 'City Square Administrator', role.rows[0].id]);
      console.warn(`Initial administrator created for ${email}; change the configured password before production use.`);
    }
  }
  query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>> { return this.pool.query<T>(text, values); }
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async onModuleDestroy() { await this.pool.end(); }
}
