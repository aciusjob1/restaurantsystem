import { Body, Controller, Get, Post, UseGuards, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrderActionsController {
  constructor(private readonly db:DatabaseService) {}
  @Post(':id/cancel-request') async requestCancel(@Req() req:any,@Body() body:any) {
    if (!body.reason) throw new BadRequestException('Cancellation reason is required');
    const result=await this.db.query("UPDATE orders SET status='CANCELLATION_REQUESTED',updated_by=$2,updated_at=NOW() WHERE id=$1 AND status NOT IN ('PAID','CANCELLED','REFUNDED') RETURNING *",[req.params.id,req.user.sub]);
    if (!result.rowCount) throw new BadRequestException('Order cannot be cancelled');
    await this.db.query("INSERT INTO audit_logs(entity_type,entity_id,action,actor_id,details) VALUES('ORDER',$1,'CANCELLATION_REQUESTED',$2,$3)",[req.params.id,req.user.sub,JSON.stringify({reason:body.reason})]);
    return result.rows[0];
  }
  @Post(':id/cancel-approve') async approveCancel(@Req() req:any,@Body() body:any) {
    if (!['ADMIN','MANAGER'].includes(req.user.role)) throw new ForbiddenException('Manager approval required');
    if (!body.reason) throw new BadRequestException('Approval reason is required');
    const result=await this.db.query("UPDATE orders SET status='CANCELLED',updated_by=$2,updated_at=NOW() WHERE id=$1 AND status='CANCELLATION_REQUESTED' RETURNING *",[req.params.id,req.user.sub]);
    if (!result.rowCount) throw new BadRequestException('Cancellation was not requested');
    await this.db.query("INSERT INTO audit_logs(entity_type,entity_id,action,actor_id,details) VALUES('ORDER',$1,'CANCELLED',$2,$3)",[req.params.id,req.user.sub,JSON.stringify({reason:body.reason})]);
    return result.rows[0];
  }
}
