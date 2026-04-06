import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalClientGuard extends AuthGuard('client-jwt') {
  handleRequest<TUser = any>(_err: any, user: any, _info: any, _context: any, _status?: any): TUser {
    return user || null;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
