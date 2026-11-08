import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  @Get()
  listPayments() {
    return [
      {
        id: 'f1e2b1b0-9907-47b5-b644-a31db13ff07d',
        orderId: '4006db1a-3fcf-4f65-9983-13b19dc0f3c4',
        method: 'CASH',
        amount: 20000,
        status: 'PAID',
      },
    ];
  }

  @Post()
  createPayment(@Body() body: any) {
    return {
      status: 'recorded',
      payment: {
        ...body,
        id: crypto.randomUUID(),
        status: 'PAID',
      },
    };
  }
}
