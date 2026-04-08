import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import axios from 'axios';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class ClientAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(code: string) {
    const appId = this.configService.getOrThrow<string>('WECHAT_MINI_APP_ID');
    const secret = this.configService.getOrThrow<string>('WECHAT_MINI_APP_SECRET');

    const { data } = await axios.get<{
      openid?: string;
      unionid?: string;
      session_key?: string;
      errcode?: number;
      errmsg?: string;
    }>('https://api.weixin.qq.com/sns/jscode2session', {
      params: { appid: appId, secret, js_code: code, grant_type: 'authorization_code' },
    });

    if (data.errcode || !data.openid) {
      throw new UnauthorizedException(data.errmsg || 'WeChat login failed');
    }

    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.openId, data.openid))
      .limit(1);

    let userId: string;
    if (existing) {
      userId = existing.id;
      if (data.unionid && !existing.unionId) {
        await this.db
          .update(schema.users)
          .set({ unionId: data.unionid, updatedAt: new Date() })
          .where(eq(schema.users.id, existing.id));
      }
    } else {
      const [newUser] = await this.db
        .insert(schema.users)
        .values({ openId: data.openid, unionId: data.unionid })
        .returning();
      userId = newUser.id;
    }

    const payload = { sub: userId, openId: data.openid };
    return { accessToken: this.jwtService.sign(payload) };
  }

  async updateProfile(userId: string, nickname: string, avatar: string) {
    const [user] = await this.db
      .update(schema.users)
      .set({ nickname, avatar, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning();
    return user;
  }
}
