# 小程序第一版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server-side ClientModule APIs and database schemas needed for the miniprogram v1, plus UniApp project scaffolding and all 4 pages (home, club list, club detail, profile).

**Architecture:** New `ClientModule` in NestJS with `/api/client/*` routes, sharing Drizzle schema and DatabaseModule with existing AdminModule. WeChat mini-program login via `wx.login` code exchange. UniApp (Vue3 + Vite + TS) for the frontend, communicating with the same NestJS server.

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, Passport JWT (separate strategy for client), UniApp (Vue3 + Vite + TypeScript), WeChat Mini Program API

---

## File Structure

### New Database Schemas
- `apps/server/src/database/schema/user.schema.ts` — users table
- `apps/server/src/database/schema/user-favorite.schema.ts` — user_favorites table
- `apps/server/src/database/schema/announcement.schema.ts` — announcements table

### ClientModule (Server)
- `apps/server/src/client/client.module.ts` — module registration
- `apps/server/src/client/auth/client-auth.controller.ts` — login, profile update
- `apps/server/src/client/auth/client-auth.service.ts` — wx.login code exchange, JWT
- `apps/server/src/client/auth/client-jwt.strategy.ts` — Passport strategy for client
- `apps/server/src/common/guards/client.guard.ts` — AuthGuard for client JWT
- `apps/server/src/common/guards/optional-client.guard.ts` — optional auth (passes without token)
- `apps/server/src/common/decorators/current-user.decorator.ts` — extract user from request
- `apps/server/src/client/home/home.controller.ts` — banners, feed
- `apps/server/src/client/home/home.service.ts` — banners query, mixed feed query
- `apps/server/src/client/clubs/client-clubs.controller.ts` — list, detail, services, rules, videos
- `apps/server/src/client/clubs/client-clubs.service.ts` — public club queries
- `apps/server/src/client/videos/client-videos.controller.ts` — video detail
- `apps/server/src/client/videos/client-videos.service.ts`
- `apps/server/src/client/announcements/client-announcements.controller.ts` — announcement detail
- `apps/server/src/client/announcements/client-announcements.service.ts`
- `apps/server/src/client/user/user.controller.ts` — profile, favorites
- `apps/server/src/client/user/user.service.ts`

### Admin Announcements
- `apps/server/src/admin/announcements/announcements.controller.ts`
- `apps/server/src/admin/announcements/announcements.service.ts`
- `apps/server/src/admin/announcements/dto/create-announcement.dto.ts`
- `apps/server/src/admin/announcements/dto/update-announcement.dto.ts`

### Shared Types
- Modify: `packages/shared/src/types.ts` — add client-facing DTOs
- Modify: `packages/shared/src/enums.ts` — add AnnouncementStatus

### UniApp Frontend
- `apps/uniapp/` — UniApp project root (Vue3 + Vite + TS)
- `apps/uniapp/src/pages/home/index.vue` — 首页
- `apps/uniapp/src/pages/clubs/index.vue` — 俱乐部列表
- `apps/uniapp/src/pages/clubs/detail.vue` — 俱乐部详情
- `apps/uniapp/src/pages/videos/detail.vue` — 视频详情
- `apps/uniapp/src/pages/announcements/detail.vue` — 公告详情
- `apps/uniapp/src/pages/profile/index.vue` — 个人中心
- `apps/uniapp/src/pages/profile/favorites.vue` — 收藏列表
- `apps/uniapp/src/utils/request.ts` — HTTP client
- `apps/uniapp/src/utils/auth.ts` — 登录/授权逻辑
- `apps/uniapp/src/stores/user.ts` — 用户状态 (Pinia)

---

### Task 1: Database Schemas (users, user_favorites, announcements)

**Files:**
- Create: `apps/server/src/database/schema/user.schema.ts`
- Create: `apps/server/src/database/schema/user-favorite.schema.ts`
- Create: `apps/server/src/database/schema/announcement.schema.ts`
- Modify: `apps/server/src/database/schema/index.ts`
- Modify: `packages/shared/src/enums.ts`

- [ ] **Step 1: Create user schema**

```typescript
// apps/server/src/database/schema/user.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  openId: varchar('open_id', { length: 200 }).notNull().unique(),
  unionId: varchar('union_id', { length: 200 }),
  nickname: varchar('nickname', { length: 200 }),
  avatar: varchar('avatar', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Create user-favorite schema**

```typescript
// apps/server/src/database/schema/user-favorite.schema.ts
import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { clubs } from './club.schema';

export const userFavorites = pgTable(
  'user_favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    clubId: uuid('club_id').notNull().references(() => clubs.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_favorites_user_club_idx').on(table.userId, table.clubId),
  ],
);
```

- [ ] **Step 3: Create announcement schema**

```typescript
// apps/server/src/database/schema/announcement.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const announcementStatusEnum = pgEnum('announcement_status', [
  'draft',
  'published',
]);

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  status: announcementStatusEnum('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Add AnnouncementStatus enum to shared**

Add to `packages/shared/src/enums.ts`:

```typescript
export enum AnnouncementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}
```

- [ ] **Step 5: Export new schemas from index**

Update `apps/server/src/database/schema/index.ts` to add:

```typescript
export * from './user.schema';
export * from './user-favorite.schema';
export * from './announcement.schema';
```

- [ ] **Step 6: Generate and run migration**

Run:
```bash
cd apps/server && pnpm db:generate && pnpm db:migrate
```

Expected: New migration files created in `apps/server/drizzle/`, migration applied successfully.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/database/schema/ packages/shared/src/enums.ts apps/server/drizzle/
git commit -m "feat: add users, user_favorites, announcements database schemas"
```

---

### Task 2: Client Auth (WeChat Login + JWT)

**Files:**
- Create: `apps/server/src/client/auth/client-auth.controller.ts`
- Create: `apps/server/src/client/auth/client-auth.service.ts`
- Create: `apps/server/src/client/auth/client-jwt.strategy.ts`
- Create: `apps/server/src/common/guards/client.guard.ts`
- Create: `apps/server/src/common/guards/optional-client.guard.ts`
- Create: `apps/server/src/common/decorators/current-user.decorator.ts`
- Modify: `apps/server/.env.example`

- [ ] **Step 1: Add WeChat config to .env.example**

Add to `apps/server/.env.example`:

```
# 微信小程序
WECHAT_MINI_APP_ID=your-mini-app-id
WECHAT_MINI_APP_SECRET=your-mini-app-secret
```

- [ ] **Step 2: Create ClientGuard and OptionalClientGuard**

```typescript
// apps/server/src/common/guards/client.guard.ts
import { AuthGuard } from '@nestjs/passport';

export class ClientGuard extends AuthGuard('client-jwt') {}
```

```typescript
// apps/server/src/common/guards/optional-client.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalClientGuard extends AuthGuard('client-jwt') {
  handleRequest(_err: unknown, user: unknown) {
    return user || null;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

- [ ] **Step 3: Create CurrentUser decorator**

```typescript
// apps/server/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 4: Create client JWT strategy**

```typescript
// apps/server/src/client/auth/client-jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class ClientJwtStrategy extends PassportStrategy(Strategy, 'client-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; openId: string }) {
    return { id: payload.sub, openId: payload.openId };
  }
}
```

- [ ] **Step 5: Create client auth service**

```typescript
// apps/server/src/client/auth/client-auth.service.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
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
```

- [ ] **Step 6: Create client auth controller**

```typescript
// apps/server/src/client/auth/client-auth.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ClientGuard } from '../../common/guards/client.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/client/auth')
export class ClientAuthController {
  constructor(private readonly authService: ClientAuthService) {}

  @Post('login')
  login(@Body() body: { code: string }) {
    return this.authService.login(body.code);
  }

  @Post('profile')
  @UseGuards(ClientGuard)
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() body: { nickname: string; avatar: string },
  ) {
    return this.authService.updateProfile(user.id, body.nickname, body.avatar);
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/client/auth/ apps/server/src/common/guards/client.guard.ts apps/server/src/common/guards/optional-client.guard.ts apps/server/src/common/decorators/current-user.decorator.ts apps/server/.env.example
git commit -m "feat: add client WeChat auth with JWT login and profile update"
```

---

### Task 3: ClientModule Registration

**Files:**
- Create: `apps/server/src/client/client.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: Create ClientModule**

```typescript
// apps/server/src/client/client.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientAuthController } from './auth/client-auth.controller';
import { ClientAuthService } from './auth/client-auth.service';
import { ClientJwtStrategy } from './auth/client-jwt.strategy';
import { HomeController } from './home/home.controller';
import { HomeService } from './home/home.service';
import { ClientClubsController } from './clubs/client-clubs.controller';
import { ClientClubsService } from './clubs/client-clubs.service';
import { ClientVideosController } from './videos/client-videos.controller';
import { ClientVideosService } from './videos/client-videos.service';
import { ClientAnnouncementsController } from './announcements/client-announcements.controller';
import { ClientAnnouncementsService } from './announcements/client-announcements.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [
    ClientAuthController,
    HomeController,
    ClientClubsController,
    ClientVideosController,
    ClientAnnouncementsController,
    UserController,
  ],
  providers: [
    ClientAuthService,
    ClientJwtStrategy,
    HomeService,
    ClientClubsService,
    ClientVideosService,
    ClientAnnouncementsService,
    UserService,
  ],
})
export class ClientModule {}
```

- [ ] **Step 2: Register ClientModule in AppModule**

In `apps/server/src/app.module.ts`, add import and module:

```typescript
import { ClientModule } from './client/client.module';

@Module({
  imports: [
    // ... existing imports
    ClientModule,
  ],
})
export class AppModule {}
```

**Note:** This step will fail to compile until Tasks 4-7 create all the referenced controllers/services. That's OK — create placeholder files if needed, or do this step last after all sub-modules exist. Alternatively, register controllers/services incrementally as each task completes.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/client/client.module.ts apps/server/src/app.module.ts
git commit -m "feat: register ClientModule in AppModule"
```

---

### Task 4: Home API (Banners + Feed)

**Files:**
- Create: `apps/server/src/client/home/home.controller.ts`
- Create: `apps/server/src/client/home/home.service.ts`

- [ ] **Step 1: Create home service**

```typescript
// apps/server/src/client/home/home.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, and, lte, gte, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class HomeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getBanners() {
    const today = new Date().toISOString().split('T')[0];

    // Find clubs with active promotions
    const activePromotions = await this.db
      .select({
        clubId: schema.promotionOrders.clubId,
        clubName: schema.clubs.name,
        clubLogo: schema.clubs.logo,
        orderPosters: schema.clubs.orderPosters,
      })
      .from(schema.promotionOrders)
      .innerJoin(schema.clubs, eq(schema.promotionOrders.clubId, schema.clubs.id))
      .where(
        and(
          lte(schema.promotionOrders.startAt, today),
          gte(schema.promotionOrders.endAt, today),
          eq(schema.clubs.status, 'published'),
        ),
      )
      .groupBy(
        schema.promotionOrders.clubId,
        schema.clubs.name,
        schema.clubs.logo,
        schema.clubs.orderPosters,
        schema.clubs.id,
      );

    // Flatten: each poster image becomes a banner item
    const banners: { clubId: string; clubName: string; imageUrl: string }[] = [];
    for (const promo of activePromotions) {
      const posters = promo.orderPosters ?? [];
      for (const poster of posters) {
        banners.push({
          clubId: promo.clubId,
          clubName: promo.clubName,
          imageUrl: poster,
        });
      }
    }

    // Shuffle for random order
    for (let i = banners.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [banners[i], banners[j]] = [banners[j], banners[i]];
    }

    return banners;
  }

  async getFeed(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    // Query videos (published clubs only or unlinked videos)
    const videoItems = await this.db
      .select({
        id: schema.videos.id,
        type: sql<string>`'video'`.as('type'),
        title: schema.videos.title,
        coverUrl: schema.videos.coverUrl,
        authorName: schema.videos.authorName,
        platform: schema.videos.platform,
        category: schema.videos.category,
        clubId: schema.videos.clubId,
        clubName: schema.clubs.name,
        publishedAt: schema.videos.publishedAt,
      })
      .from(schema.videos)
      .leftJoin(schema.clubs, eq(schema.videos.clubId, schema.clubs.id))
      .orderBy(desc(schema.videos.publishedAt));

    // Query published announcements
    const announcementItems = await this.db
      .select({
        id: schema.announcements.id,
        type: sql<string>`'announcement'`.as('type'),
        title: schema.announcements.title,
        content: schema.announcements.content,
        publishedAt: schema.announcements.publishedAt,
      })
      .from(schema.announcements)
      .where(eq(schema.announcements.status, 'published'))
      .orderBy(desc(schema.announcements.publishedAt));

    // Merge and sort by publishedAt desc
    const allItems = [
      ...videoItems.map((v) => ({
        id: v.id,
        type: 'video' as const,
        title: v.title,
        coverUrl: v.coverUrl,
        authorName: v.authorName,
        platform: v.platform,
        category: v.category,
        clubId: v.clubId,
        clubName: v.clubName,
        content: null,
        publishedAt: v.publishedAt,
      })),
      ...announcementItems.map((a) => ({
        id: a.id,
        type: 'announcement' as const,
        title: a.title,
        coverUrl: null,
        authorName: null,
        platform: null,
        category: null,
        clubId: null,
        clubName: null,
        content: a.content ? a.content.slice(0, 100) : null,
        publishedAt: a.publishedAt,
      })),
    ].sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    const total = allItems.length;
    const data = allItems.slice(offset, offset + pageSize);

    return { data, total, page, pageSize };
  }
}
```

- [ ] **Step 2: Create home controller**

```typescript
// apps/server/src/client/home/home.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { HomeService } from './home.service';

@Controller('api/client/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('banners')
  getBanners() {
    return this.homeService.getBanners();
  }

  @Get('feed')
  getFeed(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.homeService.getFeed(page, pageSize);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/client/home/
git commit -m "feat: add home API with banners and mixed feed"
```

---

### Task 5: Client Clubs API (List + Detail + Services + Rules + Videos)

**Files:**
- Create: `apps/server/src/client/clubs/client-clubs.controller.ts`
- Create: `apps/server/src/client/clubs/client-clubs.service.ts`

- [ ] **Step 1: Create client clubs service**

```typescript
// apps/server/src/client/clubs/client-clubs.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, ilike, desc, count, and, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class ClientClubsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(page = 1, pageSize = 20, keyword?: string, serviceTypes?: string) {
    const offset = (page - 1) * pageSize;
    const conditions = [eq(schema.clubs.status, 'published')];

    if (keyword) {
      conditions.push(ilike(schema.clubs.name, `%${keyword}%`));
    }

    // If serviceTypes filter provided, only return clubs that have matching services
    let clubIdsWithServices: string[] | null = null;
    if (serviceTypes) {
      const types = serviceTypes.split(',').filter(Boolean);
      if (types.length > 0) {
        const matchingClubs = await this.db
          .selectDistinct({ clubId: schema.clubServices.clubId })
          .from(schema.clubServices)
          .where(inArray(schema.clubServices.type, types as any));
        clubIdsWithServices = matchingClubs.map((r) => r.clubId);
        if (clubIdsWithServices.length === 0) {
          return { data: [], total: 0, page, pageSize };
        }
        conditions.push(inArray(schema.clubs.id, clubIdsWithServices));
      }
    }

    const where = and(...conditions);

    // Get service types for each club in one query
    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select({
          id: schema.clubs.id,
          name: schema.clubs.name,
          logo: schema.clubs.logo,
          description: schema.clubs.description,
          establishedAt: schema.clubs.establishedAt,
          createdAt: schema.clubs.createdAt,
        })
        .from(schema.clubs)
        .where(where)
        .orderBy(desc(schema.clubs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.clubs).where(where),
    ]);

    // Fetch service types for listed clubs
    const clubIds = items.map((c) => c.id);
    const serviceTypesForClubs = clubIds.length > 0
      ? await this.db
          .selectDistinct({
            clubId: schema.clubServices.clubId,
            type: schema.clubServices.type,
          })
          .from(schema.clubServices)
          .where(inArray(schema.clubServices.clubId, clubIds))
      : [];

    const serviceTypeMap = new Map<string, string[]>();
    for (const st of serviceTypesForClubs) {
      const arr = serviceTypeMap.get(st.clubId) || [];
      arr.push(st.type);
      serviceTypeMap.set(st.clubId, arr);
    }

    const data = items.map((club) => ({
      ...club,
      serviceTypes: serviceTypeMap.get(club.id) || [],
    }));

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const [club] = await this.db
      .select()
      .from(schema.clubs)
      .where(and(eq(schema.clubs.id, id), eq(schema.clubs.status, 'published')))
      .limit(1);

    if (!club) throw new NotFoundException('Club not found');

    // Fetch predecessor club name if exists
    let predecessor: { id: string; name: string } | null = null;
    if (club.predecessorId) {
      const [pred] = await this.db
        .select({ id: schema.clubs.id, name: schema.clubs.name })
        .from(schema.clubs)
        .where(eq(schema.clubs.id, club.predecessorId))
        .limit(1);
      predecessor = pred || null;
    }

    return { ...club, predecessor };
  }

  async getServices(clubId: string) {
    return this.db
      .select()
      .from(schema.clubServices)
      .where(eq(schema.clubServices.clubId, clubId))
      .orderBy(schema.clubServices.sortOrder);
  }

  async getRules(clubId: string) {
    return this.db
      .select()
      .from(schema.clubRules)
      .where(eq(schema.clubRules.clubId, clubId));
  }

  async getVideos(clubId: string, type?: string) {
    const conditions = [eq(schema.videos.clubId, clubId)];
    if (type === 'REVIEW' || type === 'SENTIMENT') {
      conditions.push(eq(schema.videos.category, type));
    }

    return this.db
      .select()
      .from(schema.videos)
      .where(and(...conditions))
      .orderBy(desc(schema.videos.publishedAt));
  }
}
```

- [ ] **Step 2: Create client clubs controller**

```typescript
// apps/server/src/client/clubs/client-clubs.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ClientClubsService } from './client-clubs.service';

@Controller('api/client/clubs')
export class ClientClubsController {
  constructor(private readonly clubsService: ClientClubsService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('keyword') keyword?: string,
    @Query('serviceTypes') serviceTypes?: string,
  ) {
    return this.clubsService.findAll(page, pageSize, keyword, serviceTypes);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  @Get(':id/services')
  getServices(@Param('id') id: string) {
    return this.clubsService.getServices(id);
  }

  @Get(':id/rules')
  getRules(@Param('id') id: string) {
    return this.clubsService.getRules(id);
  }

  @Get(':id/videos')
  getVideos(@Param('id') id: string, @Query('type') type?: string) {
    return this.clubsService.getVideos(id, type);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/client/clubs/
git commit -m "feat: add client clubs API with list, detail, services, rules, videos"
```

---

### Task 6: Client Videos & Announcements API

**Files:**
- Create: `apps/server/src/client/videos/client-videos.controller.ts`
- Create: `apps/server/src/client/videos/client-videos.service.ts`
- Create: `apps/server/src/client/announcements/client-announcements.controller.ts`
- Create: `apps/server/src/client/announcements/client-announcements.service.ts`

- [ ] **Step 1: Create client videos service and controller**

```typescript
// apps/server/src/client/videos/client-videos.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class ClientVideosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findOne(id: string) {
    const [video] = await this.db
      .select({
        id: schema.videos.id,
        title: schema.videos.title,
        description: schema.videos.description,
        coverUrl: schema.videos.coverUrl,
        videoUrl: schema.videos.videoUrl,
        platform: schema.videos.platform,
        category: schema.videos.category,
        authorName: schema.videos.authorName,
        aiSummary: schema.videos.aiSummary,
        aiSentiment: schema.videos.aiSentiment,
        clubId: schema.videos.clubId,
        clubName: schema.clubs.name,
        publishedAt: schema.videos.publishedAt,
      })
      .from(schema.videos)
      .leftJoin(schema.clubs, eq(schema.videos.clubId, schema.clubs.id))
      .where(eq(schema.videos.id, id))
      .limit(1);

    if (!video) throw new NotFoundException('Video not found');
    return video;
  }
}
```

```typescript
// apps/server/src/client/videos/client-videos.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ClientVideosService } from './client-videos.service';

@Controller('api/client/videos')
export class ClientVideosController {
  constructor(private readonly videosService: ClientVideosService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.videosService.findOne(id);
  }
}
```

- [ ] **Step 2: Create client announcements service and controller**

```typescript
// apps/server/src/client/announcements/client-announcements.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class ClientAnnouncementsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findOne(id: string) {
    const [announcement] = await this.db
      .select()
      .from(schema.announcements)
      .where(and(eq(schema.announcements.id, id), eq(schema.announcements.status, 'published')))
      .limit(1);

    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }
}
```

```typescript
// apps/server/src/client/announcements/client-announcements.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ClientAnnouncementsService } from './client-announcements.service';

@Controller('api/client/announcements')
export class ClientAnnouncementsController {
  constructor(private readonly announcementsService: ClientAnnouncementsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/client/videos/ apps/server/src/client/announcements/
git commit -m "feat: add client video detail and announcement detail APIs"
```

---

### Task 7: User API (Profile + Favorites)

**Files:**
- Create: `apps/server/src/client/user/user.controller.ts`
- Create: `apps/server/src/client/user/user.service.ts`

- [ ] **Step 1: Create user service**

```typescript
// apps/server/src/client/user/user.service.ts
import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, count } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getProfile(userId: string) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        nickname: schema.users.nickname,
        avatar: schema.users.avatar,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return user;
  }

  async getFavorites(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const where = eq(schema.userFavorites.userId, userId);

    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select({
          id: schema.clubs.id,
          name: schema.clubs.name,
          logo: schema.clubs.logo,
          description: schema.clubs.description,
          establishedAt: schema.clubs.establishedAt,
          favoritedAt: schema.userFavorites.createdAt,
        })
        .from(schema.userFavorites)
        .innerJoin(schema.clubs, eq(schema.userFavorites.clubId, schema.clubs.id))
        .where(where)
        .orderBy(desc(schema.userFavorites.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.userFavorites).where(where),
    ]);

    return { data: items, total, page, pageSize };
  }

  async addFavorite(userId: string, clubId: string) {
    try {
      const [fav] = await this.db
        .insert(schema.userFavorites)
        .values({ userId, clubId })
        .returning();
      return fav;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('Already favorited');
      }
      throw error;
    }
  }

  async removeFavorite(userId: string, clubId: string) {
    await this.db
      .delete(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, userId),
          eq(schema.userFavorites.clubId, clubId),
        ),
      );
    return { success: true };
  }

  async isFavorited(userId: string, clubId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ id: schema.userFavorites.id })
      .from(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, userId),
          eq(schema.userFavorites.clubId, clubId),
        ),
      )
      .limit(1);
    return !!result;
  }
}
```

- [ ] **Step 2: Create user controller**

```typescript
// apps/server/src/client/user/user.controller.ts
import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ClientGuard } from '../../common/guards/client.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';

@Controller('api/client/user')
@UseGuards(ClientGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.userService.getProfile(user.id);
  }

  @Get('favorites')
  getFavorites(
    @CurrentUser() user: { id: string },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.userService.getFavorites(user.id, page, pageSize);
  }

  @Post('favorites/:clubId')
  addFavorite(
    @CurrentUser() user: { id: string },
    @Param('clubId') clubId: string,
  ) {
    return this.userService.addFavorite(user.id, clubId);
  }

  @Delete('favorites/:clubId')
  removeFavorite(
    @CurrentUser() user: { id: string },
    @Param('clubId') clubId: string,
  ) {
    return this.userService.removeFavorite(user.id, clubId);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/client/user/
git commit -m "feat: add user profile and favorites API"
```

---

### Task 8: Admin Announcements CRUD

**Files:**
- Create: `apps/server/src/admin/announcements/announcements.controller.ts`
- Create: `apps/server/src/admin/announcements/announcements.service.ts`
- Create: `apps/server/src/admin/announcements/dto/create-announcement.dto.ts`
- Create: `apps/server/src/admin/announcements/dto/update-announcement.dto.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// apps/server/src/admin/announcements/dto/create-announcement.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: string;
}
```

```typescript
// apps/server/src/admin/announcements/dto/update-announcement.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: string;
}
```

- [ ] **Step 2: Create announcements service**

```typescript
// apps/server/src/admin/announcements/announcements.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, count } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.announcements)
        .orderBy(desc(schema.announcements.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.announcements),
    ]);

    return { data: items, total, page, pageSize };
  }

  async findOne(id: string) {
    const [item] = await this.db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.id, id))
      .limit(1);

    if (!item) throw new NotFoundException('Announcement not found');
    return item;
  }

  async create(dto: CreateAnnouncementDto) {
    const values: any = { ...dto };
    if (dto.status === 'published') {
      values.publishedAt = new Date();
    }
    const [item] = await this.db
      .insert(schema.announcements)
      .values(values)
      .returning();
    return item;
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const existing = await this.findOne(id);
    const values: any = { ...dto, updatedAt: new Date() };

    // Set publishedAt when first published
    if (dto.status === 'published' && !existing.publishedAt) {
      values.publishedAt = new Date();
    }

    const [item] = await this.db
      .update(schema.announcements)
      .set(values)
      .where(eq(schema.announcements.id, id))
      .returning();
    return item;
  }

  async remove(id: string) {
    const [item] = await this.db
      .delete(schema.announcements)
      .where(eq(schema.announcements.id, id))
      .returning();

    if (!item) throw new NotFoundException('Announcement not found');
    return item;
  }
}
```

- [ ] **Step 3: Create announcements controller**

```typescript
// apps/server/src/admin/announcements/announcements.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Controller('admin/announcements')
@UseGuards(AdminGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.announcementsService.findAll(page, pageSize);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
```

- [ ] **Step 4: Register in AdminModule**

In `apps/server/src/admin/admin.module.ts`, add:
- Import `AnnouncementsController` and `AnnouncementsService`
- Add `AnnouncementsController` to controllers array
- Add `AnnouncementsService` to providers array

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/admin/announcements/ apps/server/src/admin/admin.module.ts
git commit -m "feat: add admin announcements CRUD"
```

---

### Task 9: Shared Types Update

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: Add client-facing types**

Add to `packages/shared/src/types.ts`:

```typescript
// Client-facing types

export interface ClientBannerDto {
  clubId: string;
  clubName: string;
  imageUrl: string;
}

export interface FeedItemDto {
  id: string;
  type: 'video' | 'announcement';
  title: string;
  coverUrl: string | null;
  authorName: string | null;
  platform: string | null;
  category: string | null;
  clubId: string | null;
  clubName: string | null;
  content: string | null;
  publishedAt: string | null;
}

export interface ClientClubListItemDto {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  establishedAt: string | null;
  serviceTypes: string[];
  createdAt: string;
}

export interface ClientClubDetailDto extends ClubDto {
  predecessor: { id: string; name: string } | null;
}

export interface ClientVideoDetailDto {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string;
  videoUrl: string;
  platform: string;
  category: string;
  authorName: string;
  aiSummary: string | null;
  aiSentiment: string | null;
  clubId: string | null;
  clubName: string | null;
  publishedAt: string;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  content: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileDto {
  id: string;
  nickname: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface UserFavoriteClubDto {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  establishedAt: string | null;
  favoritedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat: add client-facing shared types"
```

---

### Task 10: UniApp Project Scaffolding

**Files:**
- Create: `apps/uniapp/` — entire UniApp project

- [ ] **Step 1: Initialize UniApp project**

Run from project root:
```bash
npx degit dcloudio/uni-preset-vue#vite-ts apps/uniapp
```

If the template is unavailable, use the CLI:
```bash
npx @dcloudio/uvm && npx @dcloudio/uvm create apps/uniapp
```

Or create manually with the minimal structure below.

- [ ] **Step 2: Configure pnpm workspace**

Verify `pnpm-workspace.yaml` includes `apps/uniapp`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

It likely already has `apps/*` so no change needed.

- [ ] **Step 3: Update package.json**

Ensure `apps/uniapp/package.json` has:
```json
{
  "name": "@delta-club/uniapp",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev:mp-weixin": "uni -p mp-weixin",
    "build:mp-weixin": "uni build -p mp-weixin"
  },
  "dependencies": {
    "@dcloudio/uni-app": "3.0.0-4060820250324001",
    "@dcloudio/uni-mp-weixin": "3.0.0-4060820250324001",
    "vue": "^3.5",
    "pinia": "^3",
    "@delta-club/shared": "workspace:*"
  },
  "devDependencies": {
    "@dcloudio/uni-cli-vite": "3.0.0-4060820250324001",
    "@dcloudio/types": "^3",
    "typescript": "^5",
    "vite": "^6"
  }
}
```

**Note:** UniApp version numbers should match the latest stable release. Check https://uniapp.dcloud.net.cn for current versions. The versions above are placeholders — use whatever `degit` or `uvm` installs.

- [ ] **Step 4: Configure manifest.json**

Create `apps/uniapp/src/manifest.json`:
```json
{
  "name": "三角洲俱乐部",
  "appid": "",
  "description": "三角洲行动陪玩俱乐部信息平台",
  "versionName": "1.0.0",
  "versionCode": "100",
  "mp-weixin": {
    "appid": "",
    "setting": {
      "urlCheck": false
    },
    "usingComponents": true
  }
}
```

- [ ] **Step 5: Configure pages.json with tab bar**

Create/update `apps/uniapp/src/pages.json`:
```json
{
  "pages": [
    { "path": "pages/home/index", "style": { "navigationBarTitleText": "首页" } },
    { "path": "pages/clubs/index", "style": { "navigationBarTitleText": "俱乐部" } },
    { "path": "pages/clubs/detail", "style": { "navigationBarTitleText": "俱乐部详情" } },
    { "path": "pages/videos/detail", "style": { "navigationBarTitleText": "视频详情" } },
    { "path": "pages/announcements/detail", "style": { "navigationBarTitleText": "公告详情" } },
    { "path": "pages/profile/index", "style": { "navigationBarTitleText": "我的" } },
    { "path": "pages/profile/favorites", "style": { "navigationBarTitleText": "我的收藏" } }
  ],
  "tabBar": {
    "list": [
      { "pagePath": "pages/home/index", "text": "首页" },
      { "pagePath": "pages/clubs/index", "text": "俱乐部" },
      { "pagePath": "pages/profile/index", "text": "我的" }
    ]
  },
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "三角洲俱乐部",
    "navigationBarBackgroundColor": "#ffffff",
    "backgroundColor": "#f5f5f5"
  }
}
```

- [ ] **Step 6: Create HTTP client utility**

```typescript
// apps/uniapp/src/utils/request.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  needAuth?: boolean;
}

export async function request<T = any>(options: RequestOptions): Promise<T> {
  const token = uni.getStorageSync('token');
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && options.needAuth !== false) {
    header['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else if (res.statusCode === 401) {
          uni.removeStorageSync('token');
          reject(new Error('Unauthorized'));
        } else {
          reject(new Error(`Request failed: ${res.statusCode}`));
        }
      },
      fail: (err) => reject(err),
    });
  });
}
```

- [ ] **Step 7: Create auth utility**

```typescript
// apps/uniapp/src/utils/auth.ts
import { request } from './request';

export async function silentLogin(): Promise<string> {
  const existingToken = uni.getStorageSync('token');
  if (existingToken) return existingToken;

  const { code } = await new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({ success: resolve, fail: reject });
  });

  const { accessToken } = await request<{ accessToken: string }>({
    url: '/api/client/auth/login',
    method: 'POST',
    data: { code },
    needAuth: false,
  });

  uni.setStorageSync('token', accessToken);
  return accessToken;
}

export async function getUserProfile(): Promise<void> {
  const { userInfo } = await new Promise<UniApp.GetUserProfileRes>(
    (resolve, reject) => {
      uni.getUserProfile({
        desc: '用于展示头像和昵称',
        success: resolve,
        fail: reject,
      });
    },
  );

  await request({
    url: '/api/client/auth/profile',
    method: 'POST',
    data: { nickname: userInfo.nickName, avatar: userInfo.avatarUrl },
    needAuth: true,
  });
}
```

- [ ] **Step 8: Create user store (Pinia)**

```typescript
// apps/uniapp/src/stores/user.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { request } from '../utils/request';

interface UserProfile {
  id: string;
  nickname: string | null;
  avatar: string | null;
}

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile | null>(null);
  const isAuthorized = ref(false);

  async function fetchProfile() {
    try {
      profile.value = await request<UserProfile>({
        url: '/api/client/user/profile',
        needAuth: true,
      });
      isAuthorized.value = !!profile.value?.nickname;
    } catch {
      profile.value = null;
    }
  }

  function clear() {
    profile.value = null;
    isAuthorized.value = false;
    uni.removeStorageSync('token');
  }

  return { profile, isAuthorized, fetchProfile, clear };
});
```

- [ ] **Step 9: Setup App.vue with silent login**

```vue
<!-- apps/uniapp/src/App.vue -->
<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { silentLogin } from './utils/auth';
import { useUserStore } from './stores/user';

onLaunch(async () => {
  try {
    await silentLogin();
    const userStore = useUserStore();
    await userStore.fetchProfile();
  } catch (e) {
    console.error('Silent login failed:', e);
  }
});
</script>
```

- [ ] **Step 10: Install dependencies and verify build**

Run:
```bash
cd apps/uniapp && pnpm install && pnpm dev:mp-weixin
```

Expected: Build succeeds, outputs to `dist/dev/mp-weixin`.

- [ ] **Step 11: Commit**

```bash
git add apps/uniapp/
git commit -m "feat: scaffold UniApp project with auth, request util, and tab navigation"
```

---

### Task 11: 首页 (Home Page)

**Files:**
- Create: `apps/uniapp/src/pages/home/index.vue`

- [ ] **Step 1: Implement home page**

```vue
<!-- apps/uniapp/src/pages/home/index.vue -->
<template>
  <view class="home">
    <!-- Banner Swiper -->
    <swiper
      v-if="banners.length"
      class="banner-swiper"
      :autoplay="true"
      :interval="4000"
      :circular="true"
      indicator-dots
    >
      <swiper-item v-for="banner in banners" :key="banner.imageUrl" @click="goClubDetail(banner.clubId)">
        <image :src="banner.imageUrl" mode="aspectFill" class="banner-image" />
      </swiper-item>
    </swiper>

    <!-- Feed List -->
    <view class="feed-list">
      <view
        v-for="item in feedItems"
        :key="item.id"
        class="feed-card"
        @click="goFeedItem(item)"
      >
        <!-- Video Card -->
        <view v-if="item.type === 'video'" class="video-card">
          <image :src="item.coverUrl!" mode="aspectFill" class="video-cover" />
          <view class="video-info">
            <text class="video-title">{{ item.title }}</text>
            <view class="video-meta">
              <text class="video-author">{{ item.authorName }}</text>
              <text class="video-tag" :class="item.category?.toLowerCase()">
                {{ item.category === 'REVIEW' ? '评测' : '舆情' }}
              </text>
              <text v-if="item.clubName" class="video-club">{{ item.clubName }}</text>
            </view>
          </view>
        </view>

        <!-- Announcement Card -->
        <view v-if="item.type === 'announcement'" class="announcement-card">
          <view class="announcement-badge">公告</view>
          <text class="announcement-title">{{ item.title }}</text>
          <text class="announcement-summary">{{ item.content }}</text>
        </view>
      </view>
    </view>

    <!-- Load More -->
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>
    <view v-if="noMore" class="no-more">
      <text>没有更多了</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface Banner {
  clubId: string;
  clubName: string;
  imageUrl: string;
}

interface FeedItem {
  id: string;
  type: 'video' | 'announcement';
  title: string;
  coverUrl: string | null;
  authorName: string | null;
  platform: string | null;
  category: string | null;
  clubId: string | null;
  clubName: string | null;
  content: string | null;
  publishedAt: string | null;
}

const banners = ref<Banner[]>([]);
const feedItems = ref<FeedItem[]>([]);
const page = ref(1);
const loading = ref(false);
const noMore = ref(false);

async function loadBanners() {
  banners.value = await request<Banner[]>({ url: '/api/client/home/banners' });
}

async function loadFeed(reset = false) {
  if (loading.value) return;
  if (!reset && noMore.value) return;

  loading.value = true;
  if (reset) {
    page.value = 1;
    noMore.value = false;
  }

  const res = await request<{ data: FeedItem[]; total: number }>({
    url: `/api/client/home/feed?page=${page.value}&pageSize=20`,
  });

  if (reset) {
    feedItems.value = res.data;
  } else {
    feedItems.value.push(...res.data);
  }

  if (feedItems.value.length >= res.total) {
    noMore.value = true;
  }
  page.value++;
  loading.value = false;
}

function goClubDetail(clubId: string) {
  uni.navigateTo({ url: `/pages/clubs/detail?id=${clubId}` });
}

function goFeedItem(item: FeedItem) {
  if (item.type === 'video') {
    uni.navigateTo({ url: `/pages/videos/detail?id=${item.id}` });
  } else {
    uni.navigateTo({ url: `/pages/announcements/detail?id=${item.id}` });
  }
}

onLoad(() => {
  loadBanners();
  loadFeed(true);
});

onReachBottom(() => {
  loadFeed();
});

onPullDownRefresh(async () => {
  await Promise.all([loadBanners(), loadFeed(true)]);
  uni.stopPullDownRefresh();
});
</script>

<style scoped>
.home { padding-bottom: 20rpx; }
.banner-swiper { height: 360rpx; width: 100%; }
.banner-image { width: 100%; height: 100%; }
.feed-list { padding: 20rpx; }
.feed-card { background: #fff; border-radius: 16rpx; margin-bottom: 20rpx; overflow: hidden; }
.video-card { display: flex; flex-direction: column; }
.video-cover { width: 100%; height: 320rpx; }
.video-info { padding: 20rpx; }
.video-title { font-size: 28rpx; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.video-meta { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; font-size: 24rpx; color: #999; }
.video-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; color: #fff; }
.video-tag.review { background: #3b82f6; }
.video-tag.sentiment { background: #f59e0b; }
.video-club { color: #666; }
.announcement-card { padding: 24rpx; }
.announcement-badge { display: inline-block; font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 8rpx; background: #ef4444; color: #fff; margin-bottom: 12rpx; }
.announcement-title { font-size: 28rpx; font-weight: 500; display: block; }
.announcement-summary { font-size: 24rpx; color: #999; margin-top: 8rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.loading, .no-more { text-align: center; padding: 30rpx; font-size: 24rpx; color: #999; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add apps/uniapp/src/pages/home/
git commit -m "feat: implement home page with banner swiper and feed list"
```

---

### Task 12: 俱乐部列表页 (Club List Page)

**Files:**
- Create: `apps/uniapp/src/pages/clubs/index.vue`

- [ ] **Step 1: Implement club list page**

```vue
<!-- apps/uniapp/src/pages/clubs/index.vue -->
<template>
  <view class="club-list-page">
    <!-- Search Bar -->
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索俱乐部"
        confirm-type="search"
        @confirm="onSearch"
      />
    </view>

    <!-- Service Type Filters -->
    <scroll-view scroll-x class="filter-bar">
      <view
        v-for="st in serviceTypeOptions"
        :key="st.value"
        class="filter-chip"
        :class="{ active: selectedTypes.includes(st.value) }"
        @click="toggleType(st.value)"
      >
        <text>{{ st.label }}</text>
      </view>
    </scroll-view>

    <!-- Club List -->
    <view class="list">
      <view
        v-for="club in clubs"
        :key="club.id"
        class="club-card"
        @click="goDetail(club.id)"
      >
        <image :src="club.logo || '/static/default-logo.png'" mode="aspectFill" class="club-logo" />
        <view class="club-info">
          <text class="club-name">{{ club.name }}</text>
          <text v-if="club.establishedAt" class="club-duration">
            已运营 {{ getDays(club.establishedAt) }} 天
          </text>
          <view class="service-tags">
            <text
              v-for="st in club.serviceTypes"
              :key="st"
              class="service-tag"
            >{{ serviceTypeLabel(st) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="noMore && clubs.length" class="no-more"><text>没有更多了</text></view>
    <view v-if="noMore && !clubs.length && !loading" class="empty"><text>暂无俱乐部</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface ClubListItem {
  id: string;
  name: string;
  logo: string | null;
  establishedAt: string | null;
  serviceTypes: string[];
}

const serviceTypeOptions = [
  { value: 'KNIFE_RUN', label: '跑刀' },
  { value: 'ACCOMPANY', label: '陪玩' },
  { value: 'ESCORT_TRIAL', label: '护航体验' },
  { value: 'ESCORT_STANDARD', label: '护航标准' },
  { value: 'ESCORT_FUN', label: '护航趣味' },
];

const clubs = ref<ClubListItem[]>([]);
const keyword = ref('');
const selectedTypes = ref<string[]>([]);
const page = ref(1);
const loading = ref(false);
const noMore = ref(false);

function serviceTypeLabel(type: string): string {
  return serviceTypeOptions.find((o) => o.value === type)?.label || type;
}

function getDays(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function toggleType(type: string) {
  const idx = selectedTypes.value.indexOf(type);
  if (idx >= 0) {
    selectedTypes.value.splice(idx, 1);
  } else {
    selectedTypes.value.push(type);
  }
  loadClubs(true);
}

function onSearch() {
  loadClubs(true);
}

async function loadClubs(reset = false) {
  if (loading.value) return;
  if (!reset && noMore.value) return;

  loading.value = true;
  if (reset) {
    page.value = 1;
    noMore.value = false;
  }

  const params = new URLSearchParams();
  params.set('page', String(page.value));
  params.set('pageSize', '20');
  if (keyword.value) params.set('keyword', keyword.value);
  if (selectedTypes.value.length) params.set('serviceTypes', selectedTypes.value.join(','));

  const res = await request<{ data: ClubListItem[]; total: number }>({
    url: `/api/client/clubs?${params.toString()}`,
  });

  if (reset) {
    clubs.value = res.data;
  } else {
    clubs.value.push(...res.data);
  }

  if (clubs.value.length >= res.total) {
    noMore.value = true;
  }
  page.value++;
  loading.value = false;
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/clubs/detail?id=${id}` });
}

onLoad(() => {
  loadClubs(true);
});

onReachBottom(() => {
  loadClubs();
});

onPullDownRefresh(async () => {
  await loadClubs(true);
  uni.stopPullDownRefresh();
});
</script>

<style scoped>
.club-list-page { background: #f5f5f5; min-height: 100vh; }
.search-bar { padding: 20rpx; background: #fff; }
.search-input { background: #f0f0f0; border-radius: 32rpx; padding: 16rpx 32rpx; font-size: 28rpx; }
.filter-bar { white-space: nowrap; padding: 16rpx 20rpx; background: #fff; border-top: 1rpx solid #eee; }
.filter-chip { display: inline-block; padding: 8rpx 24rpx; margin-right: 16rpx; border-radius: 32rpx; font-size: 24rpx; background: #f0f0f0; color: #666; }
.filter-chip.active { background: #3b82f6; color: #fff; }
.list { padding: 20rpx; }
.club-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.club-logo { width: 96rpx; height: 96rpx; border-radius: 16rpx; margin-right: 24rpx; flex-shrink: 0; }
.club-info { flex: 1; overflow: hidden; }
.club-name { font-size: 30rpx; font-weight: 500; display: block; }
.club-duration { font-size: 24rpx; color: #999; margin-top: 4rpx; display: block; }
.service-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 8rpx; }
.service-tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 8rpx; background: #e0f2fe; color: #0369a1; }
.loading, .no-more, .empty { text-align: center; padding: 30rpx; font-size: 24rpx; color: #999; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add apps/uniapp/src/pages/clubs/index.vue
git commit -m "feat: implement club list page with search and service type filters"
```

---

### Task 13: 俱乐部详情页 (Club Detail Page)

**Files:**
- Create: `apps/uniapp/src/pages/clubs/detail.vue`

- [ ] **Step 1: Implement club detail page**

```vue
<!-- apps/uniapp/src/pages/clubs/detail.vue -->
<template>
  <view class="detail-page" v-if="club">
    <!-- Header -->
    <view class="header">
      <view class="header-main">
        <image :src="club.logo || '/static/default-logo.png'" mode="aspectFill" class="header-logo" />
        <view class="header-info">
          <text class="header-name">{{ club.name }}</text>
          <text v-if="club.establishedAt" class="header-duration">
            已运营 {{ getDays(club.establishedAt) }} 天
          </text>
        </view>
        <view class="favorite-btn" @click="toggleFavorite">
          <text :class="{ favorited: isFavorited }">{{ isFavorited ? '❤' : '♡' }}</text>
        </view>
      </view>
      <text v-if="club.description" class="header-desc">{{ club.description }}</text>
      <view v-if="club.predecessor" class="predecessor" @click="goPredecessor">
        <text>前身俱乐部：{{ club.predecessor.name }}</text>
      </view>
      <view class="header-links">
        <text v-if="club.wechatOfficialAccount" class="link-item">
          公众号：{{ club.wechatOfficialAccount }}
        </text>
      </view>
    </view>

    <!-- Tabs -->
    <view class="tabs-header">
      <text
        v-for="(tab, idx) in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === idx }"
        @click="currentTab = idx"
      >{{ tab.label }}</text>
    </view>

    <swiper
      class="tabs-content"
      :current="currentTab"
      @change="(e: any) => currentTab = e.detail.current"
    >
      <!-- Tab 1: 服务价格表 -->
      <swiper-item>
        <scroll-view scroll-y class="tab-scroll">
          <view class="services-tab">
            <view class="rules-link" @click="showRulesModal = true">
              <text>查看规则</text>
            </view>
            <!-- Service type sub-tabs -->
            <scroll-view scroll-x class="service-type-bar">
              <text
                v-for="st in availableServiceTypes"
                :key="st"
                class="service-type-chip"
                :class="{ active: currentServiceType === st }"
                @click="currentServiceType = st"
              >{{ serviceTypeLabel(st) }}</text>
            </scroll-view>
            <!-- Service items -->
            <view v-for="svc in filteredServices" :key="svc.id" class="service-item">
              <view v-if="svc.type === 'KNIFE_RUN' || svc.type === 'ESCORT_TRIAL' || svc.type === 'ESCORT_STANDARD'">
                <text class="price">¥{{ svc.priceYuan }}</text>
                <text v-if="svc.priceHafuCoin" class="hafu"> → {{ svc.priceHafuCoin }}W哈夫币</text>
              </view>
              <view v-if="svc.type === 'ACCOMPANY'">
                <text class="tier">{{ svc.tier }}</text>
                <text class="price">¥{{ svc.pricePerHour }}/小时</text>
              </view>
              <view v-if="svc.type === 'ESCORT_FUN'">
                <text class="game-name">{{ svc.gameName }}</text>
                <text class="price">¥{{ svc.priceYuan }}</text>
                <text v-if="svc.hasGuarantee" class="guarantee">保底 {{ svc.guaranteeHafuCoin }}W哈夫币</text>
              </view>
              <!-- Service images -->
              <view v-if="svc.images?.length" class="service-images">
                <image v-for="img in svc.images" :key="img" :src="img" mode="widthFix" class="service-img" @click="previewImage(img, svc.images)" />
              </view>
            </view>
            <!-- Order Posters -->
            <view v-if="club.orderPosters?.length" class="order-posters">
              <text class="section-title">订单海报</text>
              <image
                v-for="poster in club.orderPosters"
                :key="poster"
                :src="poster"
                mode="widthFix"
                class="poster-img"
                @click="previewImage(poster, club.orderPosters)"
              />
            </view>
          </view>
        </scroll-view>
      </swiper-item>

      <!-- Tab 2: 评论 -->
      <swiper-item>
        <scroll-view scroll-y class="tab-scroll">
          <view class="placeholder"><text>评论功能即将开放</text></view>
        </scroll-view>
      </swiper-item>

      <!-- Tab 3: 评测视频 -->
      <swiper-item>
        <scroll-view scroll-y class="tab-scroll">
          <view v-for="v in reviewVideos" :key="v.id" class="video-item" @click="goVideo(v.id)">
            <image :src="v.coverUrl" mode="aspectFill" class="video-thumb" />
            <view class="video-detail">
              <text class="video-title">{{ v.title }}</text>
              <text class="video-author">{{ v.authorName }}</text>
            </view>
          </view>
          <view v-if="!reviewVideos.length" class="placeholder"><text>暂无评测视频</text></view>
        </scroll-view>
      </swiper-item>

      <!-- Tab 4: 舆情视频 -->
      <swiper-item>
        <scroll-view scroll-y class="tab-scroll">
          <view v-for="v in sentimentVideos" :key="v.id" class="video-item" @click="goVideo(v.id)">
            <image :src="v.coverUrl" mode="aspectFill" class="video-thumb" />
            <view class="video-detail">
              <text class="video-title">{{ v.title }}</text>
              <text class="video-author">{{ v.authorName }}</text>
            </view>
          </view>
          <view v-if="!sentimentVideos.length" class="placeholder"><text>暂无舆情视频</text></view>
        </scroll-view>
      </swiper-item>

      <!-- Tab 5: 工商信息 -->
      <swiper-item>
        <scroll-view scroll-y class="tab-scroll">
          <view class="business-info">
            <view class="info-row" v-if="club.companyName">
              <text class="info-label">公司全称</text>
              <text class="info-value">{{ club.companyName }}</text>
            </view>
            <view class="info-row" v-if="club.legalPerson">
              <text class="info-label">法人</text>
              <text class="info-value">{{ club.legalPerson }}</text>
            </view>
            <view class="info-row" v-if="club.creditCode">
              <text class="info-label">统一社会信用代码</text>
              <text class="info-value">{{ club.creditCode }}</text>
            </view>
            <view class="info-row" v-if="club.registeredCapital">
              <text class="info-label">注册资本</text>
              <text class="info-value">{{ club.registeredCapital }}</text>
            </view>
            <view class="info-row" v-if="club.businessStatus">
              <text class="info-label">经营状态</text>
              <text class="info-value">{{ club.businessStatus }}</text>
            </view>
            <view class="info-row" v-if="club.registeredAddress">
              <text class="info-label">注册地址</text>
              <text class="info-value">{{ club.registeredAddress }}</text>
            </view>
            <view class="info-row" v-if="club.businessScope">
              <text class="info-label">经营范围</text>
              <text class="info-value">{{ club.businessScope }}</text>
            </view>
            <view v-if="!hasBusinessInfo" class="placeholder"><text>暂无工商信息</text></view>
          </view>
        </scroll-view>
      </swiper-item>
    </swiper>

    <!-- Rules Modal -->
    <view v-if="showRulesModal" class="modal-overlay" @click="showRulesModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">俱乐部规则</text>
          <text class="modal-close" @click="showRulesModal = false">✕</text>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view v-for="rule in rules" :key="rule.id" class="rule-item">
            <text class="rule-content" :class="rule.sentiment.toLowerCase()">
              {{ rule.content }}
            </text>
          </view>
          <view v-if="!rules.length" class="placeholder"><text>暂无规则信息</text></view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';
import { useUserStore } from '../../stores/user';
import { getUserProfile } from '../../utils/auth';

interface ClubDetail {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  establishedAt: string | null;
  wechatOfficialAccount: string | null;
  wechatMiniProgram: string | null;
  predecessorId: string | null;
  orderPosters: string[];
  companyName: string | null;
  creditCode: string | null;
  legalPerson: string | null;
  registeredAddress: string | null;
  businessScope: string | null;
  registeredCapital: string | null;
  businessStatus: string | null;
  predecessor: { id: string; name: string } | null;
}

interface ServiceItem {
  id: string;
  type: string;
  priceYuan: string | null;
  priceHafuCoin: string | null;
  tier: string | null;
  pricePerHour: string | null;
  gameName: string | null;
  hasGuarantee: boolean | null;
  guaranteeHafuCoin: string | null;
  rules: string | null;
  images: string[];
}

interface RuleItem {
  id: string;
  content: string;
  sentiment: string;
}

interface VideoItem {
  id: string;
  title: string;
  coverUrl: string;
  authorName: string;
}

const serviceTypeLabels: Record<string, string> = {
  KNIFE_RUN: '跑刀',
  ACCOMPANY: '陪玩',
  ESCORT_TRIAL: '护航体验',
  ESCORT_STANDARD: '护航标准',
  ESCORT_FUN: '护航趣味',
};

const tabs = [
  { key: 'services', label: '服务价格' },
  { key: 'comments', label: '评论' },
  { key: 'reviews', label: '评测视频' },
  { key: 'sentiment', label: '舆情视频' },
  { key: 'business', label: '工商信息' },
];

const club = ref<ClubDetail | null>(null);
const services = ref<ServiceItem[]>([]);
const rules = ref<RuleItem[]>([]);
const reviewVideos = ref<VideoItem[]>([]);
const sentimentVideos = ref<VideoItem[]>([]);
const currentTab = ref(0);
const currentServiceType = ref('');
const showRulesModal = ref(false);
const isFavorited = ref(false);

const userStore = useUserStore();

const availableServiceTypes = computed(() => {
  const types = [...new Set(services.value.map((s) => s.type))];
  return types;
});

const filteredServices = computed(() => {
  if (!currentServiceType.value) return services.value;
  return services.value.filter((s) => s.type === currentServiceType.value);
});

const hasBusinessInfo = computed(() => {
  if (!club.value) return false;
  return !!(
    club.value.companyName ||
    club.value.legalPerson ||
    club.value.creditCode ||
    club.value.businessStatus
  );
});

function serviceTypeLabel(type: string): string {
  return serviceTypeLabels[type] || type;
}

function getDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function previewImage(current: string, urls: string[]) {
  uni.previewImage({ current, urls });
}

function goVideo(id: string) {
  uni.navigateTo({ url: `/pages/videos/detail?id=${id}` });
}

function goPredecessor() {
  if (club.value?.predecessor) {
    uni.navigateTo({ url: `/pages/clubs/detail?id=${club.value.predecessor.id}` });
  }
}

async function toggleFavorite() {
  const token = uni.getStorageSync('token');
  if (!token) return;

  // If not authorized, prompt for profile
  if (!userStore.isAuthorized) {
    try {
      await getUserProfile();
      await userStore.fetchProfile();
    } catch {
      return; // User declined authorization
    }
  }

  if (isFavorited.value) {
    await request({ url: `/api/client/user/favorites/${club.value!.id}`, method: 'DELETE', needAuth: true });
    isFavorited.value = false;
  } else {
    await request({ url: `/api/client/user/favorites/${club.value!.id}`, method: 'POST', needAuth: true });
    isFavorited.value = true;
  }
}

async function checkFavorite(clubId: string) {
  const token = uni.getStorageSync('token');
  if (!token) return;
  try {
    const favs = await request<{ data: any[] }>({
      url: `/api/client/user/favorites?pageSize=999`,
      needAuth: true,
    });
    isFavorited.value = favs.data.some((f: any) => f.id === clubId);
  } catch {
    // Not logged in, ignore
  }
}

onLoad((options) => {
  const id = options?.id;
  if (!id) return;

  Promise.all([
    request<ClubDetail>({ url: `/api/client/clubs/${id}` }).then((data) => {
      club.value = data;
    }),
    request<ServiceItem[]>({ url: `/api/client/clubs/${id}/services` }).then((data) => {
      services.value = data;
      if (data.length) currentServiceType.value = data[0].type;
    }),
    request<RuleItem[]>({ url: `/api/client/clubs/${id}/rules` }).then((data) => {
      rules.value = data;
    }),
    request<VideoItem[]>({ url: `/api/client/clubs/${id}/videos?type=REVIEW` }).then((data) => {
      reviewVideos.value = data;
    }),
    request<VideoItem[]>({ url: `/api/client/clubs/${id}/videos?type=SENTIMENT` }).then((data) => {
      sentimentVideos.value = data;
    }),
    checkFavorite(id),
  ]);
});
</script>

<style scoped>
.detail-page { min-height: 100vh; background: #f5f5f5; }
.header { background: #fff; padding: 24rpx; }
.header-main { display: flex; align-items: center; }
.header-logo { width: 96rpx; height: 96rpx; border-radius: 16rpx; margin-right: 20rpx; }
.header-info { flex: 1; }
.header-name { font-size: 34rpx; font-weight: 600; display: block; }
.header-duration { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.favorite-btn { font-size: 44rpx; padding: 10rpx; }
.favorite-btn .favorited { color: #ef4444; }
.header-desc { font-size: 26rpx; color: #666; margin-top: 16rpx; display: block; }
.predecessor { margin-top: 12rpx; font-size: 24rpx; color: #3b82f6; }
.header-links { margin-top: 8rpx; font-size: 24rpx; color: #999; }
.link-item { display: block; }

.tabs-header { display: flex; background: #fff; border-top: 1rpx solid #eee; padding: 0 10rpx; }
.tab-item { flex: 1; text-align: center; padding: 20rpx 0; font-size: 26rpx; color: #666; position: relative; }
.tab-item.active { color: #3b82f6; font-weight: 500; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 25%; width: 50%; height: 4rpx; background: #3b82f6; border-radius: 4rpx; }

.tabs-content { height: calc(100vh - 400rpx); }
.tab-scroll { height: 100%; }

.services-tab { padding: 20rpx; }
.rules-link { text-align: right; font-size: 24rpx; color: #3b82f6; padding: 8rpx 0; }
.service-type-bar { white-space: nowrap; margin-bottom: 16rpx; }
.service-type-chip { display: inline-block; padding: 8rpx 24rpx; margin-right: 12rpx; border-radius: 32rpx; font-size: 24rpx; background: #f0f0f0; color: #666; }
.service-type-chip.active { background: #3b82f6; color: #fff; }
.service-item { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 12rpx; }
.price { font-size: 32rpx; font-weight: 600; color: #ef4444; }
.hafu { font-size: 24rpx; color: #666; margin-left: 8rpx; }
.tier { font-size: 28rpx; font-weight: 500; margin-right: 12rpx; }
.game-name { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 8rpx; }
.guarantee { font-size: 24rpx; color: #16a34a; margin-left: 12rpx; }
.service-images { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.service-img { width: 200rpx; border-radius: 8rpx; }

.order-posters { margin-top: 24rpx; }
.section-title { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 12rpx; }
.poster-img { width: 100%; border-radius: 12rpx; margin-bottom: 12rpx; }

.video-item { display: flex; background: #fff; border-radius: 12rpx; padding: 16rpx; margin: 0 20rpx 12rpx; }
.video-thumb { width: 200rpx; height: 120rpx; border-radius: 8rpx; margin-right: 16rpx; flex-shrink: 0; }
.video-detail { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.video-title { font-size: 26rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.video-author { font-size: 22rpx; color: #999; margin-top: 8rpx; }

.business-info { padding: 20rpx; }
.info-row { display: flex; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.info-label { width: 240rpx; font-size: 26rpx; color: #999; flex-shrink: 0; }
.info-value { flex: 1; font-size: 26rpx; color: #333; }

.placeholder { text-align: center; padding: 80rpx 0; font-size: 26rpx; color: #999; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.modal-content { background: #fff; border-radius: 24rpx 24rpx 0 0; width: 100%; max-height: 70vh; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 32rpx; border-bottom: 1rpx solid #eee; }
.modal-title { font-size: 30rpx; font-weight: 500; }
.modal-close { font-size: 36rpx; color: #999; padding: 10rpx; }
.modal-body { padding: 24rpx 32rpx; max-height: 60vh; }
.rule-item { padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.rule-content { font-size: 26rpx; line-height: 1.6; }
.rule-content.favorable { color: #16a34a; }
.rule-content.unfavorable { color: #dc2626; }
.rule-content.neutral { color: #666; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add apps/uniapp/src/pages/clubs/detail.vue
git commit -m "feat: implement club detail page with tabs, services, rules modal, favorites"
```

---

### Task 14: 视频详情页 + 公告详情页

**Files:**
- Create: `apps/uniapp/src/pages/videos/detail.vue`
- Create: `apps/uniapp/src/pages/announcements/detail.vue`

- [ ] **Step 1: Implement video detail page**

```vue
<!-- apps/uniapp/src/pages/videos/detail.vue -->
<template>
  <view class="video-detail-page" v-if="video">
    <image :src="video.coverUrl" mode="aspectFill" class="cover" />
    <view class="content">
      <text class="title">{{ video.title }}</text>
      <view class="meta">
        <text class="author">{{ video.authorName }}</text>
        <text class="tag" :class="video.category.toLowerCase()">
          {{ video.category === 'REVIEW' ? '评测' : '舆情' }}
        </text>
      </view>

      <view v-if="video.aiSummary" class="ai-summary">
        <text class="summary-label">AI 摘要</text>
        <text class="summary-text">{{ video.aiSummary }}</text>
      </view>

      <text v-if="video.description" class="description">{{ video.description }}</text>

      <view v-if="video.clubName" class="related-club" @click="goClub">
        <text>关联俱乐部：{{ video.clubName }}</text>
      </view>

      <button class="open-btn" @click="openVideo">
        在{{ video.platform === 'BILIBILI' ? 'B站' : '抖音' }}观看
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface VideoDetail {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string;
  videoUrl: string;
  platform: string;
  category: string;
  authorName: string;
  aiSummary: string | null;
  aiSentiment: string | null;
  clubId: string | null;
  clubName: string | null;
}

const video = ref<VideoDetail | null>(null);

function goClub() {
  if (video.value?.clubId) {
    uni.navigateTo({ url: `/pages/clubs/detail?id=${video.value.clubId}` });
  }
}

function openVideo() {
  if (video.value?.videoUrl) {
    uni.setClipboardData({
      data: video.value.videoUrl,
      success: () => {
        uni.showToast({ title: '链接已复制，请在浏览器中打开', icon: 'none', duration: 2000 });
      },
    });
  }
}

onLoad((options) => {
  const id = options?.id;
  if (!id) return;
  request<VideoDetail>({ url: `/api/client/videos/${id}` }).then((data) => {
    video.value = data;
  });
});
</script>

<style scoped>
.video-detail-page { min-height: 100vh; background: #fff; }
.cover { width: 100%; height: 400rpx; }
.content { padding: 24rpx; }
.title { font-size: 32rpx; font-weight: 600; display: block; line-height: 1.4; }
.meta { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; }
.author { font-size: 26rpx; color: #666; }
.tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 8rpx; color: #fff; }
.tag.review { background: #3b82f6; }
.tag.sentiment { background: #f59e0b; }
.ai-summary { background: #f0f9ff; border-radius: 12rpx; padding: 20rpx; margin-top: 20rpx; }
.summary-label { font-size: 24rpx; color: #0369a1; font-weight: 500; display: block; margin-bottom: 8rpx; }
.summary-text { font-size: 26rpx; color: #333; line-height: 1.6; }
.description { font-size: 26rpx; color: #666; margin-top: 20rpx; line-height: 1.6; display: block; }
.related-club { margin-top: 20rpx; font-size: 26rpx; color: #3b82f6; padding: 16rpx 0; border-top: 1rpx solid #eee; }
.open-btn { margin-top: 32rpx; background: #3b82f6; color: #fff; border-radius: 16rpx; font-size: 28rpx; }
</style>
```

- [ ] **Step 2: Implement announcement detail page**

```vue
<!-- apps/uniapp/src/pages/announcements/detail.vue -->
<template>
  <view class="announcement-page" v-if="announcement">
    <view class="content">
      <text class="title">{{ announcement.title }}</text>
      <text class="date">{{ formatDate(announcement.publishedAt) }}</text>
      <view class="body">
        <text>{{ announcement.content }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string | null;
}

const announcement = ref<Announcement | null>(null);

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

onLoad((options) => {
  const id = options?.id;
  if (!id) return;
  request<Announcement>({ url: `/api/client/announcements/${id}` }).then((data) => {
    announcement.value = data;
  });
});
</script>

<style scoped>
.announcement-page { min-height: 100vh; background: #fff; }
.content { padding: 32rpx; }
.title { font-size: 36rpx; font-weight: 600; display: block; line-height: 1.4; }
.date { font-size: 24rpx; color: #999; display: block; margin-top: 12rpx; }
.body { margin-top: 32rpx; font-size: 28rpx; line-height: 1.8; color: #333; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add apps/uniapp/src/pages/videos/ apps/uniapp/src/pages/announcements/
git commit -m "feat: implement video detail and announcement detail pages"
```

---

### Task 15: 个人中心 + 收藏列表页

**Files:**
- Create: `apps/uniapp/src/pages/profile/index.vue`
- Create: `apps/uniapp/src/pages/profile/favorites.vue`

- [ ] **Step 1: Implement profile page**

```vue
<!-- apps/uniapp/src/pages/profile/index.vue -->
<template>
  <view class="profile-page">
    <!-- User Info -->
    <view class="user-card" @click="handleLogin">
      <image
        :src="userStore.profile?.avatar || '/static/default-avatar.png'"
        class="avatar"
        mode="aspectFill"
      />
      <view class="user-info">
        <text class="nickname">{{ userStore.profile?.nickname || '点击登录' }}</text>
      </view>
    </view>

    <!-- Menu -->
    <view class="menu-list">
      <view class="menu-item" @click="goFavorites">
        <text>我的收藏</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item disabled">
        <text>我的评价</text>
        <text class="coming-soon">即将开放</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '../../stores/user';
import { getUserProfile } from '../../utils/auth';

const userStore = useUserStore();

async function handleLogin() {
  if (userStore.isAuthorized) return;
  try {
    await getUserProfile();
    await userStore.fetchProfile();
  } catch {
    // User declined
  }
}

function goFavorites() {
  uni.navigateTo({ url: '/pages/profile/favorites' });
}
</script>

<style scoped>
.profile-page { min-height: 100vh; background: #f5f5f5; }
.user-card { display: flex; align-items: center; background: #fff; padding: 40rpx 32rpx; }
.avatar { width: 120rpx; height: 120rpx; border-radius: 50%; margin-right: 24rpx; }
.user-info { flex: 1; }
.nickname { font-size: 32rpx; font-weight: 500; }
.menu-list { margin-top: 20rpx; background: #fff; }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 32rpx; border-bottom: 1rpx solid #f0f0f0; font-size: 28rpx; }
.menu-item.disabled { color: #999; }
.arrow { font-size: 32rpx; color: #ccc; }
.coming-soon { font-size: 22rpx; color: #ccc; }
</style>
```

- [ ] **Step 2: Implement favorites page**

```vue
<!-- apps/uniapp/src/pages/profile/favorites.vue -->
<template>
  <view class="favorites-page">
    <view
      v-for="club in clubs"
      :key="club.id"
      class="club-card"
      @click="goDetail(club.id)"
    >
      <image :src="club.logo || '/static/default-logo.png'" mode="aspectFill" class="club-logo" />
      <view class="club-info">
        <text class="club-name">{{ club.name }}</text>
        <text v-if="club.establishedAt" class="club-duration">
          已运营 {{ getDays(club.establishedAt) }} 天
        </text>
      </view>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-if="noMore && clubs.length" class="no-more"><text>没有更多了</text></view>
    <view v-if="noMore && !clubs.length && !loading" class="empty"><text>还没有收藏哦</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onReachBottom } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface FavoriteClub {
  id: string;
  name: string;
  logo: string | null;
  establishedAt: string | null;
}

const clubs = ref<FavoriteClub[]>([]);
const page = ref(1);
const loading = ref(false);
const noMore = ref(false);

function getDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

async function loadFavorites(reset = false) {
  if (loading.value) return;
  if (!reset && noMore.value) return;

  loading.value = true;
  if (reset) {
    page.value = 1;
    noMore.value = false;
  }

  const res = await request<{ data: FavoriteClub[]; total: number }>({
    url: `/api/client/user/favorites?page=${page.value}&pageSize=20`,
    needAuth: true,
  });

  if (reset) {
    clubs.value = res.data;
  } else {
    clubs.value.push(...res.data);
  }

  if (clubs.value.length >= res.total) {
    noMore.value = true;
  }
  page.value++;
  loading.value = false;
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/clubs/detail?id=${id}` });
}

onLoad(() => {
  loadFavorites(true);
});

onReachBottom(() => {
  loadFavorites();
});
</script>

<style scoped>
.favorites-page { min-height: 100vh; background: #f5f5f5; padding: 20rpx; }
.club-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.club-logo { width: 96rpx; height: 96rpx; border-radius: 16rpx; margin-right: 24rpx; flex-shrink: 0; }
.club-info { flex: 1; }
.club-name { font-size: 30rpx; font-weight: 500; display: block; }
.club-duration { font-size: 24rpx; color: #999; margin-top: 4rpx; display: block; }
.loading, .no-more, .empty { text-align: center; padding: 60rpx 0; font-size: 26rpx; color: #999; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add apps/uniapp/src/pages/profile/
git commit -m "feat: implement profile page and favorites list"
```

---

### Task 16: Admin 前端公告管理页面

**Files:**
- Create: `apps/admin/src/features/announcements/` — 公告管理页面
- Modify: `apps/admin/src/lib/api.ts` — 添加公告 API 函数
- Create: `apps/admin/src/routes/_authenticated/announcements/route.tsx`

This task follows the existing admin feature pattern (clubs, bloggers, etc.). Create:

- [ ] **Step 1: Add announcement API functions**

In `apps/admin/src/lib/api.ts`, add:

```typescript
// Announcements
export const getAnnouncements = (params?: { page?: number; pageSize?: number }) =>
  api.get('/announcements', { params }).then((res) => res.data);

export const getAnnouncement = (id: string) =>
  api.get(`/announcements/${id}`).then((res) => res.data);

export const createAnnouncement = (data: { title: string; content: string; status?: string }) =>
  api.post('/announcements', data).then((res) => res.data);

export const updateAnnouncement = (id: string, data: { title?: string; content?: string; status?: string }) =>
  api.put(`/announcements/${id}`, data).then((res) => res.data);

export const deleteAnnouncement = (id: string) =>
  api.delete(`/announcements/${id}`).then((res) => res.data);
```

- [ ] **Step 2: Create announcements feature page**

Follow the same pattern as `apps/admin/src/features/bloggers/` or `apps/admin/src/features/clubs/`:
- `index.tsx` — main page with data table, create/edit/delete dialogs
- `components/` — columns definition, action dialogs
- `data/schema.ts` — Zod schema for form validation

The exact implementation follows existing patterns in the codebase. Key points:
- Use TanStack Table for the list
- Columns: title, status (draft/published), publishedAt, createdAt, actions
- Create/Edit dialog with title (input), content (textarea), status (select)
- Delete confirmation dialog

- [ ] **Step 3: Add route**

Create `apps/admin/src/routes/_authenticated/announcements/route.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import Announcements from '@/features/announcements';

export const Route = createFileRoute('/_authenticated/announcements')({
  component: Announcements,
});
```

- [ ] **Step 4: Add sidebar navigation entry**

Add the announcements entry to the sidebar nav configuration (follow existing pattern for bloggers/videos etc.).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/announcements/ apps/admin/src/routes/_authenticated/announcements/ apps/admin/src/lib/api.ts
git commit -m "feat: add admin announcements management page"
```

---

### Task 17: Verify Server Build & Integration Test

- [ ] **Step 1: Verify server compiles**

Run:
```bash
cd apps/server && pnpm build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Start server and test client endpoints**

Run:
```bash
cd apps/server && pnpm dev
```

In another terminal, test the public endpoints:
```bash
# Banners (should return empty array or data if promotions exist)
curl http://localhost:3000/api/client/home/banners

# Feed
curl http://localhost:3000/api/client/home/feed?page=1&pageSize=5

# Clubs list
curl http://localhost:3000/api/client/clubs?page=1&pageSize=5

# Should return 404 for non-existent club
curl http://localhost:3000/api/client/clubs/00000000-0000-0000-0000-000000000000
```

Expected: Each endpoint returns valid JSON responses.

- [ ] **Step 3: Verify admin build**

Run:
```bash
cd apps/admin && pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Verify UniApp build**

Run:
```bash
cd apps/uniapp && pnpm build:mp-weixin
```

Expected: Build outputs to `dist/build/mp-weixin`.

- [ ] **Step 5: Commit any fixes**

If any compilation or runtime errors were found and fixed:
```bash
git add -A && git commit -m "fix: resolve build issues across server, admin, and uniapp"
```
