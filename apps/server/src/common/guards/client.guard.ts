import { AuthGuard } from '@nestjs/passport';

export class ClientGuard extends AuthGuard('client-jwt') {}
