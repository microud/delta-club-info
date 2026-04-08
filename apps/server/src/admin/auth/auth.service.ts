import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const [admin] = await this.db
      .select()
      .from(schema.admins)
      .where(eq(schema.admins.username, username))
      .limit(1);

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await compare(password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: admin.id, username: admin.username, role: admin.role };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
