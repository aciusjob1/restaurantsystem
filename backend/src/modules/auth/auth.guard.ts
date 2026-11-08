import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    try {
      request.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'development-only-change-me');
      return true;
    } catch { throw new UnauthorizedException('Invalid or expired token'); }
  }
}
