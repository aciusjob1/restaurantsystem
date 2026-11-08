import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'citysquare-backend',
      mode: 'local-first',
      timestamp: new Date().toISOString(),
    };
  }
}
