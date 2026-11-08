import { Controller, Get, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('health')
@UseGuards(AuthGuard)
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async health() {
    await this.db.query('SELECT 1');
    return { status: 'ok', service: 'citysquare-backend', mode: 'local-first', timestamp: new Date().toISOString() };
  }
}
