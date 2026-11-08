import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('sync')
export class SyncController {
  @Get('status')
  syncStatus() {
    return {
      online: true,
      lastSyncAt: new Date().toISOString(),
      pendingOrders: 0,
      queuedEvents: 3,
      mode: 'local-first',
    };
  }

  @Post('outbox')
  submitOutbox(@Body() body: any) {
    return {
      status: 'accepted',
      receipt: {
        id: crypto.randomUUID(),
        acceptedAt: new Date().toISOString(),
        queuedItems: body.items?.length ?? 0,
      },
    };
  }
}
