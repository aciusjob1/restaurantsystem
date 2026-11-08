import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get() async health() { await this.db.query('SELECT 1'); return { status:'ok',service:'citysquare-backend',mode:'local-first',timestamp:new Date().toISOString() }; }
}
