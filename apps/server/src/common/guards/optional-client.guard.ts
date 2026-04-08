import { type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalClientGuard extends AuthGuard('client-jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: TUser | false, _info: unknown, _context: unknown, _status?: unknown): TUser {
    return (user || null) as TUser;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
