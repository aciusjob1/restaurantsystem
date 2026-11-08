import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('printers')
export class PrintersController {
  @Get()
  listPrinters() {
    return [
      { id: 'p-kitchen', name: 'Kitchen Printer', type: 'KITCHEN', ip: '192.168.1.50', status: 'ONLINE' },
      { id: 'p-bar', name: 'Bar Printer', type: 'BAR', ip: '192.168.1.51', status: 'ONLINE' },
      { id: 'p-receipt', name: 'Receipt Printer', type: 'RECEIPT', ip: '192.168.1.52', status: 'ONLINE' },
    ];
  }

  @Post('jobs')
  createPrintJob(@Body() body: any) {
    return {
      status: 'queued',
      job: {
        ...body,
        id: crypto.randomUUID(),
        status: 'PENDING',
      },
    };
  }
}
