import { Body, Controller, Get, Param, Post } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  private orders = [
    {
      id: '4006db1a-3fcf-4f65-9983-13b19dc0f3c4',
      orderNumber: 'CS-20261108-00125',
      waiter: 'John',
      table: 'Table 01',
      status: 'SENT_TO_KITCHEN',
      totalAmount: 40000,
      currency: 'TZS',
      syncStatus: 'SYNCED',
    },
  ];

  @Get()
  listOrders() {
    return this.orders;
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.orders.find((item) => item.id === id) ?? { id, status: 'not_found' };
  }

  @Post()
  createOrder(@Body() body: any) {
    return {
      status: 'created',
      order: {
        ...body,
        id: crypto.randomUUID(),
        orderNumber: `CS-${Date.now()}`,
        status: 'OPEN',
        syncStatus: 'PENDING',
      },
    };
  }
}
