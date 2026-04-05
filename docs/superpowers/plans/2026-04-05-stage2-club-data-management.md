# Stage 2: 俱乐部数据管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成俱乐部核心数据的录入和管理，交付可以录入和管理完整俱乐部数据的 Admin 后台。

**Architecture:** 在 Stage 1 的 NestJS + Drizzle + React 骨架上，新增 Club/ClubService/ClubRule/PromotionOrder 四张表的 schema、CRUD API 和 Admin 前端页面。后端按 NestJS 模块组织（ClubModule 下包含 clubs/services/rules/promotions 子模块），前端按页面组织。

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, React, Shadcn/ui, Tailwind CSS, React Router

---

## File Structure

### Backend - New Files

```
apps/server/src/
├── database/schema/
│   ├── club.schema.ts            # clubs 表定义
│   ├── club-service.schema.ts    # club_services 表定义
│   ├── club-rule.schema.ts       # club_rules 表定义
│   ├── promotion-order.schema.ts # promotion_orders 表定义
│   └── index.ts                  # 更新：re-export 新 schema
├── admin/
│   ├── clubs/
│   │   ├── clubs.controller.ts   # Club CRUD + 生命周期 API
│   │   ├── clubs.service.ts      # Club 业务逻辑
│   │   └── dto/
│   │       ├── create-club.dto.ts
│   │       └── update-club.dto.ts
│   ├── club-services/
│   │   ├── club-services.controller.ts
│   │   ├── club-services.service.ts
│   │   └── dto/
│   │       ├── create-club-service.dto.ts
│   │       └── update-club-service.dto.ts
│   ├── club-rules/
│   │   ├── club-rules.controller.ts
│   │   ├── club-rules.service.ts
│   │   └── dto/
│   │       ├── create-club-rule.dto.ts
│   │       └── update-club-rule.dto.ts
│   ├── promotions/
│   │   ├── promotions.controller.ts
│   │   ├── promotions.service.ts
│   │   └── dto/
│   │       └── create-promotion.dto.ts
│   └── admin.module.ts           # 更新：注册新 controller/service
```

### Frontend - New Files

```
apps/admin/src/
├── lib/
│   └── api.ts                    # 更新：新增 club/service/rule/promotion API 函数
├── pages/
│   ├── clubs/
│   │   ├── ClubListPage.tsx      # 俱乐部列表
│   │   └── ClubDetailPage.tsx    # 俱乐部详情（含服务项/规则 Tab）
│   ├── promotions/
│   │   └── PromotionListPage.tsx # 推广订单管理
│   └── DashboardPage.tsx         # 更新：添加侧边栏导航
├── components/
│   ├── layout/
│   │   └── AdminLayout.tsx       # 带侧边栏的布局组件
│   ├── clubs/
│   │   ├── ClubForm.tsx          # 俱乐部创建/编辑表单
│   │   ├── ServiceForm.tsx       # 服务项表单（按类型动态字段）
│   │   └── RuleForm.tsx          # 规则表单
│   └── promotions/
│       └── PromotionForm.tsx     # 推广订单表单
├── App.tsx                       # 更新：新增路由
```

### Shared - Updates

```
packages/shared/src/
├── types.ts                      # 更新：新增 Club/Service/Rule/Promotion 相关类型
```

---

## Task 1: Database Schema — clubs 表

**Files:**
- Create: `apps/server/src/database/schema/club.schema.ts`
- Modify: `apps/server/src/database/schema/index.ts`

- [ ] **Step 1: 创建 clubs 表 schema**

```ts
// apps/server/src/database/schema/club.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const clubStatusEnum = pgEnum('club_status', [
  'draft',
  'published',
  'closed',
  'archived',
]);

export const clubs = pgTable('clubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  logo: varchar('logo', { length: 500 }),
  description: text('description'),
  wechatOfficialAccount: varchar('wechat_official_account', { length: 200 }),
  wechatMiniProgram: varchar('wechat_mini_program', { length: 200 }),
  contactInfo: varchar('contact_info', { length: 500 }),
  status: clubStatusEnum('status').notNull().default('draft'),
  establishedAt: date('established_at'),
  closedAt: date('closed_at'),
  predecessorId: uuid('predecessor_id'),
  closureNote: text('closure_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: 更新 schema index 导出**

```ts
// apps/server/src/database/schema/index.ts
export * from './admin.schema';
export * from './club.schema';
```

- [ ] **Step 3: 生成 migration 并验证**

Run: `cd apps/server && pnpm db:generate`
Expected: 生成新的 migration SQL 文件包含 `CREATE TABLE "clubs"` 和 `club_status` enum

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/database/schema/ apps/server/drizzle/
git commit -m "feat(schema): 添加 clubs 表和 club_status 枚举"
```

---

## Task 2: Database Schema — club_services, club_rules, promotion_orders 表

**Files:**
- Create: `apps/server/src/database/schema/club-service.schema.ts`
- Create: `apps/server/src/database/schema/club-rule.schema.ts`
- Create: `apps/server/src/database/schema/promotion-order.schema.ts`
- Modify: `apps/server/src/database/schema/index.ts`

- [ ] **Step 1: 创建 club_services 表 schema**

```ts
// apps/server/src/database/schema/club-service.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';

export const clubServiceTypeEnum = pgEnum('club_service_type', [
  'KNIFE_RUN',
  'ACCOMPANY',
  'ESCORT_TRIAL',
  'ESCORT_STANDARD',
  'ESCORT_FUN',
]);

export const clubServices = pgTable('club_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').notNull().references(() => clubs.id, { onDelete: 'cascade' }),
  type: clubServiceTypeEnum('type').notNull(),
  priceYuan: decimal('price_yuan', { precision: 10, scale: 2 }),
  priceHafuCoin: decimal('price_hafu_coin', { precision: 10, scale: 2 }),
  tier: varchar('tier', { length: 100 }),
  pricePerHour: decimal('price_per_hour', { precision: 10, scale: 2 }),
  gameName: varchar('game_name', { length: 200 }),
  hasGuarantee: boolean('has_guarantee'),
  guaranteeHafuCoin: decimal('guarantee_hafu_coin', { precision: 10, scale: 2 }),
  rules: text('rules'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: 创建 club_rules 表 schema**

```ts
// apps/server/src/database/schema/club-rule.schema.ts
import {
  pgTable,
  uuid,
  text,
  json,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';

export const ruleSentimentEnum = pgEnum('rule_sentiment', [
  'FAVORABLE',
  'UNFAVORABLE',
  'NEUTRAL',
]);

export const clubRules = pgTable('club_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').notNull().references(() => clubs.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  aiAnalysis: json('ai_analysis'),
  sentiment: ruleSentimentEnum('sentiment').notNull().default('NEUTRAL'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: 创建 promotion_orders 表 schema**

```ts
// apps/server/src/database/schema/promotion-order.schema.ts
import {
  pgTable,
  uuid,
  decimal,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';

export const promotionOrders = pgTable('promotion_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').notNull().references(() => clubs.id, { onDelete: 'cascade' }),
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull(),
  startAt: date('start_at').notNull(),
  endAt: date('end_at').notNull(),
  dailyRate: decimal('daily_rate', { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: 更新 schema index**

```ts
// apps/server/src/database/schema/index.ts
export * from './admin.schema';
export * from './club.schema';
export * from './club-service.schema';
export * from './club-rule.schema';
export * from './promotion-order.schema';
```

- [ ] **Step 5: 生成 migration 并验证**

Run: `cd apps/server && pnpm db:generate`
Expected: migration 包含 club_services、club_rules、promotion_orders 三张表及外键

- [ ] **Step 6: 执行 migration**

Run: `cd apps/server && pnpm db:migrate`
Expected: `migrations applied successfully`

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/database/schema/ apps/server/drizzle/
git commit -m "feat(schema): 添加 club_services/club_rules/promotion_orders 表"
```

---

## Task 3: Shared Types — Club 相关类型定义

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: 添加 Club 相关 DTO 类型**

在 `packages/shared/src/types.ts` 末尾追加：

```ts
export interface ClubDto {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  wechatOfficialAccount: string | null;
  wechatMiniProgram: string | null;
  contactInfo: string | null;
  status: string;
  establishedAt: string | null;
  closedAt: string | null;
  predecessorId: string | null;
  closureNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClubServiceDto {
  id: string;
  clubId: string;
  type: string;
  priceYuan: string | null;
  priceHafuCoin: string | null;
  tier: string | null;
  pricePerHour: string | null;
  gameName: string | null;
  hasGuarantee: boolean | null;
  guaranteeHafuCoin: string | null;
  rules: string | null;
  sortOrder: number;
}

export interface ClubRuleDto {
  id: string;
  clubId: string;
  content: string;
  sentiment: string;
  aiAnalysis: unknown | null;
}

export interface PromotionOrderDto {
  id: string;
  clubId: string;
  clubName?: string;
  fee: string;
  startAt: string;
  endAt: string;
  dailyRate: string;
  isActive?: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: 构建 shared 包验证**

Run: `pnpm --filter @delta-club/shared build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): 添加 Club/Service/Rule/Promotion DTO 类型"
```

---

## Task 4: Backend — Club CRUD API

**Files:**
- Create: `apps/server/src/admin/clubs/dto/create-club.dto.ts`
- Create: `apps/server/src/admin/clubs/dto/update-club.dto.ts`
- Create: `apps/server/src/admin/clubs/clubs.service.ts`
- Create: `apps/server/src/admin/clubs/clubs.controller.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 创建 DTO**

```ts
// apps/server/src/admin/clubs/dto/create-club.dto.ts
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ClubStatus } from '@delta-club/shared';

export class CreateClubDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  wechatOfficialAccount?: string;

  @IsOptional()
  @IsString()
  wechatMiniProgram?: string;

  @IsOptional()
  @IsString()
  contactInfo?: string;

  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;

  @IsOptional()
  @IsDateString()
  establishedAt?: string;

  @IsOptional()
  @IsString()
  predecessorId?: string;
}
```

```ts
// apps/server/src/admin/clubs/dto/update-club.dto.ts
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ClubStatus } from '@delta-club/shared';

export class UpdateClubDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  wechatOfficialAccount?: string;

  @IsOptional()
  @IsString()
  wechatMiniProgram?: string;

  @IsOptional()
  @IsString()
  contactInfo?: string;

  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;

  @IsOptional()
  @IsDateString()
  establishedAt?: string;

  @IsOptional()
  @IsDateString()
  closedAt?: string;

  @IsOptional()
  @IsString()
  predecessorId?: string;

  @IsOptional()
  @IsString()
  closureNote?: string;
}
```

- [ ] **Step 2: 创建 ClubsService**

```ts
// apps/server/src/admin/clubs/clubs.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, ilike, count, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Injectable()
export class ClubsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(page = 1, pageSize = 20, search?: string) {
    const offset = (page - 1) * pageSize;
    const where = search
      ? ilike(schema.clubs.name, `%${search}%`)
      : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.clubs)
        .where(where)
        .orderBy(desc(schema.clubs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.clubs).where(where),
    ]);

    return { data: items, total, page, pageSize };
  }

  async findOne(id: string) {
    const [club] = await this.db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.id, id))
      .limit(1);

    if (!club) throw new NotFoundException('Club not found');
    return club;
  }

  async create(dto: CreateClubDto) {
    const [club] = await this.db
      .insert(schema.clubs)
      .values(dto)
      .returning();
    return club;
  }

  async update(id: string, dto: UpdateClubDto) {
    const [club] = await this.db
      .update(schema.clubs)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.clubs.id, id))
      .returning();

    if (!club) throw new NotFoundException('Club not found');
    return club;
  }

  async remove(id: string) {
    const [club] = await this.db
      .delete(schema.clubs)
      .where(eq(schema.clubs.id, id))
      .returning();

    if (!club) throw new NotFoundException('Club not found');
    return club;
  }
}
```

- [ ] **Step 3: 创建 ClubsController**

```ts
// apps/server/src/admin/clubs/clubs.controller.ts
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
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Controller('admin/clubs')
@UseGuards(AdminGuard)
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
  ) {
    return this.clubsService.findAll(page, pageSize, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateClubDto) {
    return this.clubsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClubDto) {
    return this.clubsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clubsService.remove(id);
  }
}
```

- [ ] **Step 4: 注册到 AdminModule**

更新 `apps/server/src/admin/admin.module.ts`，在 controllers 中添加 `ClubsController`，在 providers 中添加 `ClubsService`。

```ts
// apps/server/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { ClubsController } from './clubs/clubs.controller';
import { ClubsService } from './clubs/clubs.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController, ClubsController],
  providers: [AuthService, JwtStrategy, ClubsService],
})
export class AdminModule {}
```

- [ ] **Step 5: 编译验证**

Run: `pnpm --filter @delta-club/server build`
Expected: 编译成功

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/admin/
git commit -m "feat(api): 添加 Club CRUD API (列表/详情/创建/更新/删除)"
```

---

## Task 5: Backend — ClubService CRUD API

**Files:**
- Create: `apps/server/src/admin/club-services/dto/create-club-service.dto.ts`
- Create: `apps/server/src/admin/club-services/dto/update-club-service.dto.ts`
- Create: `apps/server/src/admin/club-services/club-services.service.ts`
- Create: `apps/server/src/admin/club-services/club-services.controller.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 创建 DTO**

```ts
// apps/server/src/admin/club-services/dto/create-club-service.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ClubServiceType } from '@delta-club/shared';

export class CreateClubServiceDto {
  @IsEnum(ClubServiceType)
  type: ClubServiceType;

  @IsOptional()
  @IsNumber()
  priceYuan?: number;

  @IsOptional()
  @IsNumber()
  priceHafuCoin?: number;

  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  @IsNumber()
  pricePerHour?: number;

  @IsOptional()
  @IsString()
  gameName?: string;

  @IsOptional()
  @IsBoolean()
  hasGuarantee?: boolean;

  @IsOptional()
  @IsNumber()
  guaranteeHafuCoin?: number;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
```

```ts
// apps/server/src/admin/club-services/dto/update-club-service.dto.ts
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class UpdateClubServiceDto {
  @IsOptional()
  @IsNumber()
  priceYuan?: number;

  @IsOptional()
  @IsNumber()
  priceHafuCoin?: number;

  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  @IsNumber()
  pricePerHour?: number;

  @IsOptional()
  @IsString()
  gameName?: string;

  @IsOptional()
  @IsBoolean()
  hasGuarantee?: boolean;

  @IsOptional()
  @IsNumber()
  guaranteeHafuCoin?: number;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
```

- [ ] **Step 2: 创建 ClubServicesService**

```ts
// apps/server/src/admin/club-services/club-services.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, asc, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateClubServiceDto } from './dto/create-club-service.dto';
import { UpdateClubServiceDto } from './dto/update-club-service.dto';

@Injectable()
export class ClubServicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByClub(clubId: string) {
    return this.db
      .select()
      .from(schema.clubServices)
      .where(eq(schema.clubServices.clubId, clubId))
      .orderBy(asc(schema.clubServices.sortOrder));
  }

  async create(clubId: string, dto: CreateClubServiceDto) {
    const [service] = await this.db
      .insert(schema.clubServices)
      .values({
        clubId,
        type: dto.type,
        priceYuan: dto.priceYuan?.toString(),
        priceHafuCoin: dto.priceHafuCoin?.toString(),
        tier: dto.tier,
        pricePerHour: dto.pricePerHour?.toString(),
        gameName: dto.gameName,
        hasGuarantee: dto.hasGuarantee,
        guaranteeHafuCoin: dto.guaranteeHafuCoin?.toString(),
        rules: dto.rules,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();
    return service;
  }

  async update(clubId: string, id: string, dto: UpdateClubServiceDto) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.priceYuan !== undefined) values.priceYuan = dto.priceYuan?.toString();
    if (dto.priceHafuCoin !== undefined) values.priceHafuCoin = dto.priceHafuCoin?.toString();
    if (dto.tier !== undefined) values.tier = dto.tier;
    if (dto.pricePerHour !== undefined) values.pricePerHour = dto.pricePerHour?.toString();
    if (dto.gameName !== undefined) values.gameName = dto.gameName;
    if (dto.hasGuarantee !== undefined) values.hasGuarantee = dto.hasGuarantee;
    if (dto.guaranteeHafuCoin !== undefined) values.guaranteeHafuCoin = dto.guaranteeHafuCoin?.toString();
    if (dto.rules !== undefined) values.rules = dto.rules;
    if (dto.sortOrder !== undefined) values.sortOrder = dto.sortOrder;

    const [service] = await this.db
      .update(schema.clubServices)
      .set(values)
      .where(
        and(
          eq(schema.clubServices.id, id),
          eq(schema.clubServices.clubId, clubId),
        ),
      )
      .returning();

    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async remove(clubId: string, id: string) {
    const [service] = await this.db
      .delete(schema.clubServices)
      .where(
        and(
          eq(schema.clubServices.id, id),
          eq(schema.clubServices.clubId, clubId),
        ),
      )
      .returning();

    if (!service) throw new NotFoundException('Service not found');
    return service;
  }
}
```

- [ ] **Step 3: 创建 ClubServicesController**

```ts
// apps/server/src/admin/club-services/club-services.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ClubServicesService } from './club-services.service';
import { CreateClubServiceDto } from './dto/create-club-service.dto';
import { UpdateClubServiceDto } from './dto/update-club-service.dto';

@Controller('admin/clubs/:clubId/services')
@UseGuards(AdminGuard)
export class ClubServicesController {
  constructor(private readonly clubServicesService: ClubServicesService) {}

  @Get()
  findByClub(@Param('clubId') clubId: string) {
    return this.clubServicesService.findByClub(clubId);
  }

  @Post()
  create(
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubServiceDto,
  ) {
    return this.clubServicesService.create(clubId, dto);
  }

  @Put(':id')
  update(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClubServiceDto,
  ) {
    return this.clubServicesService.update(clubId, id, dto);
  }

  @Delete(':id')
  remove(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.clubServicesService.remove(clubId, id);
  }
}
```

- [ ] **Step 4: 注册到 AdminModule**

在 `admin.module.ts` 的 controllers 和 providers 中分别添加 `ClubServicesController` 和 `ClubServicesService`。

- [ ] **Step 5: 编译验证**

Run: `pnpm --filter @delta-club/server build`
Expected: 编译成功

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/admin/
git commit -m "feat(api): 添加 ClubService CRUD API (服务项管理)"
```

---

## Task 6: Backend — ClubRule CRUD API

**Files:**
- Create: `apps/server/src/admin/club-rules/dto/create-club-rule.dto.ts`
- Create: `apps/server/src/admin/club-rules/dto/update-club-rule.dto.ts`
- Create: `apps/server/src/admin/club-rules/club-rules.service.ts`
- Create: `apps/server/src/admin/club-rules/club-rules.controller.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 创建 DTO**

```ts
// apps/server/src/admin/club-rules/dto/create-club-rule.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { RuleSentiment } from '@delta-club/shared';

export class CreateClubRuleDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(RuleSentiment)
  sentiment?: RuleSentiment;
}
```

```ts
// apps/server/src/admin/club-rules/dto/update-club-rule.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { RuleSentiment } from '@delta-club/shared';

export class UpdateClubRuleDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(RuleSentiment)
  sentiment?: RuleSentiment;
}
```

- [ ] **Step 2: 创建 ClubRulesService**

```ts
// apps/server/src/admin/club-rules/club-rules.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateClubRuleDto } from './dto/create-club-rule.dto';
import { UpdateClubRuleDto } from './dto/update-club-rule.dto';

@Injectable()
export class ClubRulesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByClub(clubId: string) {
    return this.db
      .select()
      .from(schema.clubRules)
      .where(eq(schema.clubRules.clubId, clubId));
  }

  async create(clubId: string, dto: CreateClubRuleDto) {
    const [rule] = await this.db
      .insert(schema.clubRules)
      .values({
        clubId,
        content: dto.content,
        sentiment: dto.sentiment ?? 'NEUTRAL',
      })
      .returning();
    return rule;
  }

  async update(clubId: string, id: string, dto: UpdateClubRuleDto) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.content !== undefined) values.content = dto.content;
    if (dto.sentiment !== undefined) values.sentiment = dto.sentiment;

    const [rule] = await this.db
      .update(schema.clubRules)
      .set(values)
      .where(
        and(
          eq(schema.clubRules.id, id),
          eq(schema.clubRules.clubId, clubId),
        ),
      )
      .returning();

    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  async remove(clubId: string, id: string) {
    const [rule] = await this.db
      .delete(schema.clubRules)
      .where(
        and(
          eq(schema.clubRules.id, id),
          eq(schema.clubRules.clubId, clubId),
        ),
      )
      .returning();

    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }
}
```

- [ ] **Step 3: 创建 ClubRulesController**

```ts
// apps/server/src/admin/club-rules/club-rules.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ClubRulesService } from './club-rules.service';
import { CreateClubRuleDto } from './dto/create-club-rule.dto';
import { UpdateClubRuleDto } from './dto/update-club-rule.dto';

@Controller('admin/clubs/:clubId/rules')
@UseGuards(AdminGuard)
export class ClubRulesController {
  constructor(private readonly clubRulesService: ClubRulesService) {}

  @Get()
  findByClub(@Param('clubId') clubId: string) {
    return this.clubRulesService.findByClub(clubId);
  }

  @Post()
  create(
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubRuleDto,
  ) {
    return this.clubRulesService.create(clubId, dto);
  }

  @Put(':id')
  update(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClubRuleDto,
  ) {
    return this.clubRulesService.update(clubId, id, dto);
  }

  @Delete(':id')
  remove(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.clubRulesService.remove(clubId, id);
  }
}
```

- [ ] **Step 4: 注册到 AdminModule**

在 `admin.module.ts` 添加 `ClubRulesController` 和 `ClubRulesService`。

- [ ] **Step 5: 编译验证 + Commit**

Run: `pnpm --filter @delta-club/server build`

```bash
git add apps/server/src/admin/
git commit -m "feat(api): 添加 ClubRule CRUD API (规则管理)"
```

---

## Task 7: Backend — Promotion Order API

**Files:**
- Create: `apps/server/src/admin/promotions/dto/create-promotion.dto.ts`
- Create: `apps/server/src/admin/promotions/promotions.service.ts`
- Create: `apps/server/src/admin/promotions/promotions.controller.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 创建 DTO**

```ts
// apps/server/src/admin/promotions/dto/create-promotion.dto.ts
import { IsString, IsNumber, IsDateString } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  clubId: string;

  @IsNumber()
  fee: number;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;
}
```

- [ ] **Step 2: 创建 PromotionsService**

```ts
// apps/server/src/admin/promotions/promotions.service.ts
import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, sql, and, lte, gte } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    const orders = await this.db
      .select({
        id: schema.promotionOrders.id,
        clubId: schema.promotionOrders.clubId,
        clubName: schema.clubs.name,
        fee: schema.promotionOrders.fee,
        startAt: schema.promotionOrders.startAt,
        endAt: schema.promotionOrders.endAt,
        dailyRate: schema.promotionOrders.dailyRate,
        createdAt: schema.promotionOrders.createdAt,
      })
      .from(schema.promotionOrders)
      .leftJoin(schema.clubs, eq(schema.promotionOrders.clubId, schema.clubs.id))
      .orderBy(desc(schema.promotionOrders.createdAt));

    const today = new Date().toISOString().split('T')[0];
    return orders.map((o) => ({
      ...o,
      isActive: o.startAt <= today && o.endAt >= today,
    }));
  }

  async create(dto: CreatePromotionDto) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const dailyRate = (dto.fee / days).toFixed(4);

    const [order] = await this.db
      .insert(schema.promotionOrders)
      .values({
        clubId: dto.clubId,
        fee: dto.fee.toString(),
        startAt: dto.startAt,
        endAt: dto.endAt,
        dailyRate,
      })
      .returning();

    return order;
  }

  async remove(id: string) {
    const [order] = await this.db
      .delete(schema.promotionOrders)
      .where(eq(schema.promotionOrders.id, id))
      .returning();

    if (!order) throw new NotFoundException('Promotion order not found');
    return order;
  }

  async getRanking() {
    const today = sql`CURRENT_DATE`;

    const ranking = await this.db
      .select({
        clubId: schema.promotionOrders.clubId,
        clubName: schema.clubs.name,
        totalDailyRate: sql<string>`SUM(${schema.promotionOrders.dailyRate}::numeric)`.as('total_daily_rate'),
      })
      .from(schema.promotionOrders)
      .leftJoin(schema.clubs, eq(schema.promotionOrders.clubId, schema.clubs.id))
      .where(
        and(
          lte(schema.promotionOrders.startAt, sql`${today}::text`),
          gte(schema.promotionOrders.endAt, sql`${today}::text`),
        ),
      )
      .groupBy(schema.promotionOrders.clubId, schema.clubs.name)
      .orderBy(sql`total_daily_rate DESC`);

    return ranking;
  }
}
```

- [ ] **Step 3: 创建 PromotionsController**

```ts
// apps/server/src/admin/promotions/promotions.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@Controller('admin/promotions')
@UseGuards(AdminGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  findAll() {
    return this.promotionsService.findAll();
  }

  @Get('ranking')
  getRanking() {
    return this.promotionsService.getRanking();
  }

  @Post()
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}
```

- [ ] **Step 4: 注册到 AdminModule**

在 `admin.module.ts` 添加 `PromotionsController` 和 `PromotionsService`，最终 AdminModule 包含所有 controller 和 service：

```ts
// apps/server/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { ClubsController } from './clubs/clubs.controller';
import { ClubsService } from './clubs/clubs.service';
import { ClubServicesController } from './club-services/club-services.controller';
import { ClubServicesService } from './club-services/club-services.service';
import { ClubRulesController } from './club-rules/club-rules.controller';
import { ClubRulesService } from './club-rules/club-rules.service';
import { PromotionsController } from './promotions/promotions.controller';
import { PromotionsService } from './promotions/promotions.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [
    AuthController,
    ClubsController,
    ClubServicesController,
    ClubRulesController,
    PromotionsController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    ClubsService,
    ClubServicesService,
    ClubRulesService,
    PromotionsService,
  ],
})
export class AdminModule {}
```

- [ ] **Step 5: 编译验证 + Commit**

Run: `pnpm --filter @delta-club/server build`

```bash
git add apps/server/src/admin/
git commit -m "feat(api): 添加 Promotion Order API (推广订单 + dailyRate 排名)"
```

---

## Task 8: Frontend — AdminLayout 布局组件 + 路由更新

**Files:**
- Create: `apps/admin/src/components/layout/AdminLayout.tsx`
- Modify: `apps/admin/src/App.tsx`
- Modify: `apps/admin/src/pages/DashboardPage.tsx`

需要先安装 shadcn 的 sidebar/separator/sheet/tooltip 组件（AdminLayout 需要）:

- [ ] **Step 1: 安装额外的 shadcn 组件**

Run: `cd apps/admin && npx shadcn@latest add separator dialog table badge select textarea tabs tooltip sonner -y`

- [ ] **Step 2: 创建 AdminLayout**

```tsx
// apps/admin/src/components/layout/AdminLayout.tsx
import { NavLink, Outlet, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Building2, Megaphone, LayoutDashboard, LogOut } from 'lucide-react';

const navItems = [
  { to: '/', label: '仪表盘', icon: LayoutDashboard },
  { to: '/clubs', label: '俱乐部管理', icon: Building2 },
  { to: '/promotions', label: '推广管理', icon: Megaphone },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-muted/40 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold">Delta Club</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{admin?.username}</span>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: 更新 App.tsx 路由**

```tsx
// apps/admin/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useAuth } from '@/hooks/use-auth';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import AdminLayout from '@/components/layout/AdminLayout';
import ClubListPage from '@/pages/clubs/ClubListPage';
import ClubDetailPage from '@/pages/clubs/ClubDetailPage';
import PromotionListPage from '@/pages/promotions/PromotionListPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clubs" element={<ClubListPage />} />
          <Route path="/clubs/:id" element={<ClubDetailPage />} />
          <Route path="/promotions" element={<PromotionListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: 简化 DashboardPage**（移除自带的 header/logout，因为已由 AdminLayout 处理）

```tsx
// apps/admin/src/pages/DashboardPage.tsx
export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">仪表盘</h2>
      <p className="text-muted-foreground">
        欢迎使用 Delta Club 管理后台。请从左侧导航选择功能模块。
      </p>
    </div>
  );
}
```

- [ ] **Step 5: 创建占位页面**（ClubListPage / ClubDetailPage / PromotionListPage 先创建空壳，后续 Task 填充）

```tsx
// apps/admin/src/pages/clubs/ClubListPage.tsx
export default function ClubListPage() {
  return <div>ClubListPage placeholder</div>;
}
```

```tsx
// apps/admin/src/pages/clubs/ClubDetailPage.tsx
export default function ClubDetailPage() {
  return <div>ClubDetailPage placeholder</div>;
}
```

```tsx
// apps/admin/src/pages/promotions/PromotionListPage.tsx
export default function PromotionListPage() {
  return <div>PromotionListPage placeholder</div>;
}
```

- [ ] **Step 6: 编译验证 + Commit**

Run: `pnpm --filter @delta-club/admin build`

```bash
git add apps/admin/
git commit -m "feat(admin): 添加 AdminLayout 侧边栏导航和路由骨架"
```

---

## Task 9: Frontend — API 函数 + 俱乐部列表页

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/pages/clubs/ClubListPage.tsx`

- [ ] **Step 1: 添加 API 函数**

在 `apps/admin/src/lib/api.ts` 末尾追加：

```ts
import type {
  ClubDto,
  ClubServiceDto,
  ClubRuleDto,
  PromotionOrderDto,
  PaginatedResponse,
} from '@delta-club/shared';

// Clubs
export async function getClubs(params?: { page?: number; pageSize?: number; search?: string }) {
  const res = await api.get<PaginatedResponse<ClubDto>>('/clubs', { params });
  return res.data;
}

export async function getClub(id: string) {
  const res = await api.get<ClubDto>(`/clubs/${id}`);
  return res.data;
}

export async function createClub(data: Partial<ClubDto>) {
  const res = await api.post<ClubDto>('/clubs', data);
  return res.data;
}

export async function updateClub(id: string, data: Partial<ClubDto>) {
  const res = await api.put<ClubDto>(`/clubs/${id}`, data);
  return res.data;
}

export async function deleteClub(id: string) {
  await api.delete(`/clubs/${id}`);
}

// Club Services
export async function getClubServices(clubId: string) {
  const res = await api.get<ClubServiceDto[]>(`/clubs/${clubId}/services`);
  return res.data;
}

export async function createClubService(clubId: string, data: Partial<ClubServiceDto>) {
  const res = await api.post<ClubServiceDto>(`/clubs/${clubId}/services`, data);
  return res.data;
}

export async function updateClubService(clubId: string, id: string, data: Partial<ClubServiceDto>) {
  const res = await api.put<ClubServiceDto>(`/clubs/${clubId}/services/${id}`, data);
  return res.data;
}

export async function deleteClubService(clubId: string, id: string) {
  await api.delete(`/clubs/${clubId}/services/${id}`);
}

// Club Rules
export async function getClubRules(clubId: string) {
  const res = await api.get<ClubRuleDto[]>(`/clubs/${clubId}/rules`);
  return res.data;
}

export async function createClubRule(clubId: string, data: { content: string; sentiment?: string }) {
  const res = await api.post<ClubRuleDto>(`/clubs/${clubId}/rules`, data);
  return res.data;
}

export async function updateClubRule(clubId: string, id: string, data: { content?: string; sentiment?: string }) {
  const res = await api.put<ClubRuleDto>(`/clubs/${clubId}/rules/${id}`, data);
  return res.data;
}

export async function deleteClubRule(clubId: string, id: string) {
  await api.delete(`/clubs/${clubId}/rules/${id}`);
}

// Promotions
export async function getPromotions() {
  const res = await api.get<PromotionOrderDto[]>('/promotions');
  return res.data;
}

export async function createPromotion(data: { clubId: string; fee: number; startAt: string; endAt: string }) {
  const res = await api.post<PromotionOrderDto>('/promotions', data);
  return res.data;
}

export async function deletePromotion(id: string) {
  await api.delete(`/promotions/${id}`);
}

export async function getPromotionRanking() {
  const res = await api.get<{ clubId: string; clubName: string; totalDailyRate: string }[]>('/promotions/ranking');
  return res.data;
}
```

- [ ] **Step 2: 实现 ClubListPage**

```tsx
// apps/admin/src/pages/clubs/ClubListPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getClubs, createClub, deleteClub } from '@/lib/api';
import { ClubForm } from '@/components/clubs/ClubForm';
import { Plus, Trash2 } from 'lucide-react';
import type { ClubDto } from '@delta-club/shared';

const statusLabels: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  closed: '已倒闭',
  archived: '已归档',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'destructive',
  archived: 'outline',
};

export default function ClubListPage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<ClubDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await getClubs({ page, pageSize: 20, search: search || undefined });
    setClubs(res.data);
    setTotal(res.total);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data: Partial<ClubDto>) {
    await createClub(data);
    setDialogOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除该俱乐部？')) return;
    await deleteClub(id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">俱乐部管理</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />新建俱乐部</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建俱乐部</DialogTitle>
            </DialogHeader>
            <ClubForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input
          placeholder="搜索俱乐部名称..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>成立日期</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="w-20">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clubs.map((club) => (
            <TableRow key={club.id} className="cursor-pointer" onClick={() => navigate(`/clubs/${club.id}`)}>
              <TableCell className="font-medium">{club.name}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[club.status]}>
                  {statusLabels[club.status]}
                </Badge>
              </TableCell>
              <TableCell>{club.establishedAt ?? '-'}</TableCell>
              <TableCell>{new Date(club.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); handleDelete(club.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="text-sm text-muted-foreground leading-8">第 {page} 页 / 共 {Math.ceil(total / 20)} 页</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 创建 ClubForm 组件**

```tsx
// apps/admin/src/components/clubs/ClubForm.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ClubDto } from '@delta-club/shared';

interface ClubFormProps {
  initialData?: Partial<ClubDto>;
  onSubmit: (data: Partial<ClubDto>) => Promise<void>;
}

export function ClubForm({ initialData, onSubmit }: ClubFormProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    await onSubmit({
      name: fd.get('name') as string,
      logo: (fd.get('logo') as string) || undefined,
      description: (fd.get('description') as string) || undefined,
      wechatOfficialAccount: (fd.get('wechatOfficialAccount') as string) || undefined,
      wechatMiniProgram: (fd.get('wechatMiniProgram') as string) || undefined,
      contactInfo: (fd.get('contactInfo') as string) || undefined,
      establishedAt: (fd.get('establishedAt') as string) || undefined,
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">名称 *</Label>
        <Input id="name" name="name" defaultValue={initialData?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo">Logo URL</Label>
        <Input id="logo" name="logo" defaultValue={initialData?.logo ?? ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">简介</Label>
        <Textarea id="description" name="description" defaultValue={initialData?.description ?? ''} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wechatOfficialAccount">公众号 ID</Label>
          <Input id="wechatOfficialAccount" name="wechatOfficialAccount" defaultValue={initialData?.wechatOfficialAccount ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wechatMiniProgram">小程序 AppID</Label>
          <Input id="wechatMiniProgram" name="wechatMiniProgram" defaultValue={initialData?.wechatMiniProgram ?? ''} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactInfo">联系方式</Label>
        <Input id="contactInfo" name="contactInfo" defaultValue={initialData?.contactInfo ?? ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="establishedAt">成立日期</Label>
        <Input id="establishedAt" name="establishedAt" type="date" defaultValue={initialData?.establishedAt ?? ''} />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? '提交中...' : initialData ? '更新' : '创建'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: 编译验证 + Commit**

Run: `pnpm --filter @delta-club/admin build`

```bash
git add apps/admin/ packages/shared/
git commit -m "feat(admin): 俱乐部列表页 + API 函数 + ClubForm 组件"
```

---

## Task 10: Frontend — 俱乐部详情页（基本信息 + 服务项 + 规则 Tab）

**Files:**
- Modify: `apps/admin/src/pages/clubs/ClubDetailPage.tsx`
- Create: `apps/admin/src/components/clubs/ServiceForm.tsx`
- Create: `apps/admin/src/components/clubs/RuleForm.tsx`

- [ ] **Step 1: 创建 ServiceForm 组件**

```tsx
// apps/admin/src/components/clubs/ServiceForm.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClubServiceType } from '@delta-club/shared';
import type { ClubServiceDto } from '@delta-club/shared';

const serviceTypeLabels: Record<string, string> = {
  KNIFE_RUN: '跑刀',
  ACCOMPANY: '陪玩',
  ESCORT_TRIAL: '护航体验单',
  ESCORT_STANDARD: '护航标准单',
  ESCORT_FUN: '护航趣味玩法',
};

interface ServiceFormProps {
  initialData?: Partial<ClubServiceDto>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function ServiceForm({ initialData, onSubmit, onCancel }: ServiceFormProps) {
  const [type, setType] = useState(initialData?.type || '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = { type };

    if (['KNIFE_RUN', 'ESCORT_TRIAL', 'ESCORT_STANDARD'].includes(type)) {
      data.priceYuan = fd.get('priceYuan') ? Number(fd.get('priceYuan')) : undefined;
      data.priceHafuCoin = fd.get('priceHafuCoin') ? Number(fd.get('priceHafuCoin')) : undefined;
    }
    if (type === 'ACCOMPANY') {
      data.tier = fd.get('tier') as string;
      data.pricePerHour = fd.get('pricePerHour') ? Number(fd.get('pricePerHour')) : undefined;
    }
    if (type === 'ESCORT_FUN') {
      data.gameName = fd.get('gameName') as string;
      data.priceYuan = fd.get('priceYuan') ? Number(fd.get('priceYuan')) : undefined;
      data.hasGuarantee = fd.get('hasGuarantee') === 'on';
      data.guaranteeHafuCoin = fd.get('guaranteeHafuCoin') ? Number(fd.get('guaranteeHafuCoin')) : undefined;
      data.rules = fd.get('rules') as string;
    }
    data.sortOrder = fd.get('sortOrder') ? Number(fd.get('sortOrder')) : 0;

    await onSubmit(data);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initialData && (
        <div className="space-y-2">
          <Label>服务类型 *</Label>
          <Select value={type} onValueChange={setType} required>
            <SelectTrigger><SelectValue placeholder="选择服务类型" /></SelectTrigger>
            <SelectContent>
              {Object.values(ClubServiceType).map((t) => (
                <SelectItem key={t} value={t}>{serviceTypeLabels[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {['KNIFE_RUN', 'ESCORT_TRIAL', 'ESCORT_STANDARD', 'ESCORT_FUN'].includes(type) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priceYuan">人民币价格</Label>
            <Input id="priceYuan" name="priceYuan" type="number" step="0.01" defaultValue={initialData?.priceYuan ?? ''} />
          </div>
          {type !== 'ESCORT_FUN' && (
            <div className="space-y-2">
              <Label htmlFor="priceHafuCoin">哈夫币数量</Label>
              <Input id="priceHafuCoin" name="priceHafuCoin" type="number" step="0.01" defaultValue={initialData?.priceHafuCoin ?? ''} />
            </div>
          )}
        </div>
      )}

      {type === 'ACCOMPANY' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tier">档位名称</Label>
            <Input id="tier" name="tier" defaultValue={initialData?.tier ?? ''} placeholder="娱乐/初级技术/高级技术" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricePerHour">小时单价</Label>
            <Input id="pricePerHour" name="pricePerHour" type="number" step="0.01" defaultValue={initialData?.pricePerHour ?? ''} />
          </div>
        </div>
      )}

      {type === 'ESCORT_FUN' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="gameName">趣味玩法名称</Label>
            <Input id="gameName" name="gameName" defaultValue={initialData?.gameName ?? ''} />
          </div>
          <div className="flex items-center gap-2">
            <input id="hasGuarantee" name="hasGuarantee" type="checkbox" defaultChecked={initialData?.hasGuarantee ?? false} />
            <Label htmlFor="hasGuarantee">是否保底</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guaranteeHafuCoin">保底哈夫币数</Label>
            <Input id="guaranteeHafuCoin" name="guaranteeHafuCoin" type="number" step="0.01" defaultValue={initialData?.guaranteeHafuCoin ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rules">规则描述</Label>
            <Textarea id="rules" name="rules" defaultValue={initialData?.rules ?? ''} />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="sortOrder">排序</Label>
        <Input id="sortOrder" name="sortOrder" type="number" defaultValue={initialData?.sortOrder ?? 0} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={submitting || !type}>
          {submitting ? '提交中...' : '保存'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: 创建 RuleForm 组件**

```tsx
// apps/admin/src/components/clubs/RuleForm.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RuleSentiment } from '@delta-club/shared';

const sentimentLabels: Record<string, string> = {
  FAVORABLE: '有利',
  UNFAVORABLE: '不利',
  NEUTRAL: '中性',
};

interface RuleFormProps {
  initialData?: { content?: string; sentiment?: string };
  onSubmit: (data: { content: string; sentiment: string }) => Promise<void>;
  onCancel: () => void;
}

export function RuleForm({ initialData, onSubmit, onCancel }: RuleFormProps) {
  const [sentiment, setSentiment] = useState(initialData?.sentiment || 'NEUTRAL');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    await onSubmit({
      content: fd.get('content') as string,
      sentiment,
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="content">规则内容 *</Label>
        <Textarea id="content" name="content" defaultValue={initialData?.content ?? ''} required rows={4} />
      </div>
      <div className="space-y-2">
        <Label>情感标注</Label>
        <Select value={sentiment} onValueChange={setSentiment}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.values(RuleSentiment).map((s) => (
              <SelectItem key={s} value={s}>{sentimentLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? '提交中...' : '保存'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: 实现 ClubDetailPage**

```tsx
// apps/admin/src/pages/clubs/ClubDetailPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getClub,
  updateClub,
  getClubServices,
  createClubService,
  updateClubService,
  deleteClubService,
  getClubRules,
  createClubRule,
  updateClubRule,
  deleteClubRule,
} from '@/lib/api';
import { ClubForm } from '@/components/clubs/ClubForm';
import { ServiceForm } from '@/components/clubs/ServiceForm';
import { RuleForm } from '@/components/clubs/RuleForm';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import type { ClubDto, ClubServiceDto, ClubRuleDto } from '@delta-club/shared';

const serviceTypeLabels: Record<string, string> = {
  KNIFE_RUN: '跑刀',
  ACCOMPANY: '陪玩',
  ESCORT_TRIAL: '护航体验单',
  ESCORT_STANDARD: '护航标准单',
  ESCORT_FUN: '护航趣味玩法',
};

const sentimentLabels: Record<string, string> = {
  FAVORABLE: '有利',
  UNFAVORABLE: '不利',
  NEUTRAL: '中性',
};

const sentimentColors: Record<string, string> = {
  FAVORABLE: 'text-green-600',
  UNFAVORABLE: 'text-red-600',
  NEUTRAL: 'text-gray-500',
};

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<ClubDto | null>(null);
  const [services, setServices] = useState<ClubServiceDto[]>([]);
  const [rules, setRules] = useState<ClubRuleDto[]>([]);
  const [editingClub, setEditingClub] = useState(false);
  const [serviceDialog, setServiceDialog] = useState<{ open: boolean; data?: ClubServiceDto }>({ open: false });
  const [ruleDialog, setRuleDialog] = useState<{ open: boolean; data?: ClubRuleDto }>({ open: false });

  const load = useCallback(async () => {
    if (!id) return;
    const [c, s, r] = await Promise.all([
      getClub(id),
      getClubServices(id),
      getClubRules(id),
    ]);
    setClub(c);
    setServices(s);
    setRules(r);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!club) return <p className="text-muted-foreground">加载中...</p>;

  async function handleUpdateClub(data: Partial<ClubDto>) {
    await updateClub(id!, data);
    setEditingClub(false);
    load();
  }

  async function handleServiceSubmit(data: Record<string, unknown>) {
    if (serviceDialog.data) {
      await updateClubService(id!, serviceDialog.data.id, data);
    } else {
      await createClubService(id!, data);
    }
    setServiceDialog({ open: false });
    load();
  }

  async function handleDeleteService(serviceId: string) {
    if (!confirm('确定删除？')) return;
    await deleteClubService(id!, serviceId);
    load();
  }

  async function handleRuleSubmit(data: { content: string; sentiment: string }) {
    if (ruleDialog.data) {
      await updateClubRule(id!, ruleDialog.data.id, data);
    } else {
      await createClubRule(id!, data);
    }
    setRuleDialog({ open: false });
    load();
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm('确定删除？')) return;
    await deleteClubRule(id!, ruleId);
    load();
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/clubs')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />返回列表
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">{club.name}</h2>
        <Button variant="outline" onClick={() => setEditingClub(true)}>编辑信息</Button>
      </div>

      <Dialog open={editingClub} onOpenChange={setEditingClub}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑俱乐部</DialogTitle></DialogHeader>
          <ClubForm initialData={club} onSubmit={handleUpdateClub} />
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">服务项 ({services.length})</TabsTrigger>
          <TabsTrigger value="rules">规则 ({rules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          <div className="flex justify-end mb-2">
            <Button size="sm" onClick={() => setServiceDialog({ open: true })}>
              <Plus className="h-4 w-4 mr-1" />添加服务
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>价格/档位</TableHead>
                <TableHead>排序</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{serviceTypeLabels[s.type]}</TableCell>
                  <TableCell>
                    {s.type === 'ACCOMPANY'
                      ? `${s.tier} - ¥${s.pricePerHour}/h`
                      : s.type === 'ESCORT_FUN'
                        ? `${s.gameName} - ¥${s.priceYuan}`
                        : `¥${s.priceYuan} / ${s.priceHafuCoin}哈夫币`}
                  </TableCell>
                  <TableCell>{s.sortOrder}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setServiceDialog({ open: true, data: s })}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteService(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Dialog open={serviceDialog.open} onOpenChange={(open) => setServiceDialog({ open })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{serviceDialog.data ? '编辑服务' : '添加服务'}</DialogTitle>
              </DialogHeader>
              <ServiceForm
                initialData={serviceDialog.data}
                onSubmit={handleServiceSubmit}
                onCancel={() => setServiceDialog({ open: false })}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <div className="flex justify-end mb-2">
            <Button size="sm" onClick={() => setRuleDialog({ open: true })}>
              <Plus className="h-4 w-4 mr-1" />添加规则
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则内容</TableHead>
                <TableHead>情感</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-md truncate">{r.content}</TableCell>
                  <TableCell>
                    <span className={sentimentColors[r.sentiment]}>{sentimentLabels[r.sentiment]}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setRuleDialog({ open: true, data: r })}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteRule(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Dialog open={ruleDialog.open} onOpenChange={(open) => setRuleDialog({ open })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{ruleDialog.data ? '编辑规则' : '添加规则'}</DialogTitle>
              </DialogHeader>
              <RuleForm
                initialData={ruleDialog.data}
                onSubmit={handleRuleSubmit}
                onCancel={() => setRuleDialog({ open: false })}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 4: 编译验证 + Commit**

Run: `pnpm --filter @delta-club/admin build`

```bash
git add apps/admin/
git commit -m "feat(admin): 俱乐部详情页（编辑信息 + 服务项 Tab + 规则 Tab）"
```

---

## Task 11: Frontend — 推广订单管理页

**Files:**
- Modify: `apps/admin/src/pages/promotions/PromotionListPage.tsx`
- Create: `apps/admin/src/components/promotions/PromotionForm.tsx`

- [ ] **Step 1: 创建 PromotionForm 组件**

```tsx
// apps/admin/src/components/promotions/PromotionForm.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getClubs } from '@/lib/api';
import type { ClubDto } from '@delta-club/shared';

interface PromotionFormProps {
  onSubmit: (data: { clubId: string; fee: number; startAt: string; endAt: string }) => Promise<void>;
  onCancel: () => void;
}

export function PromotionForm({ onSubmit, onCancel }: PromotionFormProps) {
  const [clubs, setClubs] = useState<ClubDto[]>([]);
  const [clubId, setClubId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getClubs({ pageSize: 200 }).then((res) => setClubs(res.data));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    await onSubmit({
      clubId,
      fee: Number(fd.get('fee')),
      startAt: fd.get('startAt') as string,
      endAt: fd.get('endAt') as string,
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>俱乐部 *</Label>
        <Select value={clubId} onValueChange={setClubId} required>
          <SelectTrigger><SelectValue placeholder="选择俱乐部" /></SelectTrigger>
          <SelectContent>
            {clubs.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fee">总费用 (元) *</Label>
        <Input id="fee" name="fee" type="number" step="0.01" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startAt">开始日期 *</Label>
          <Input id="startAt" name="startAt" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endAt">结束日期 *</Label>
          <Input id="endAt" name="endAt" type="date" required />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={submitting || !clubId}>
          {submitting ? '提交中...' : '创建'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: 实现 PromotionListPage**

```tsx
// apps/admin/src/pages/promotions/PromotionListPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getPromotions, createPromotion, deletePromotion, getPromotionRanking } from '@/lib/api';
import { PromotionForm } from '@/components/promotions/PromotionForm';
import { Plus, Trash2 } from 'lucide-react';
import type { PromotionOrderDto } from '@delta-club/shared';

export default function PromotionListPage() {
  const [orders, setOrders] = useState<PromotionOrderDto[]>([]);
  const [ranking, setRanking] = useState<{ clubId: string; clubName: string; totalDailyRate: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const [o, r] = await Promise.all([getPromotions(), getPromotionRanking()]);
    setOrders(o);
    setRanking(r);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data: { clubId: string; fee: number; startAt: string; endAt: string }) {
    await createPromotion(data);
    setDialogOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除该推广订单？')) return;
    await deletePromotion(id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">推广管理</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />新建推广订单
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建推广订单</DialogTitle></DialogHeader>
          <PromotionForm onSubmit={handleCreate} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {ranking.length > 0 && (
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="font-medium mb-2">当前推广排名（按日均费用）</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {ranking.map((r, i) => (
              <li key={r.clubId}>
                <span className="font-medium">{r.clubName}</span>
                <span className="text-muted-foreground ml-2">¥{Number(r.totalDailyRate).toFixed(2)}/天</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>俱乐部</TableHead>
            <TableHead>费用</TableHead>
            <TableHead>日均</TableHead>
            <TableHead>开始</TableHead>
            <TableHead>结束</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="w-20">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.clubName}</TableCell>
              <TableCell>¥{o.fee}</TableCell>
              <TableCell>¥{Number(o.dailyRate).toFixed(2)}</TableCell>
              <TableCell>{o.startAt}</TableCell>
              <TableCell>{o.endAt}</TableCell>
              <TableCell>
                <Badge variant={o.isActive ? 'default' : 'secondary'}>
                  {o.isActive ? '生效中' : '未生效'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(o.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: 编译验证 + Commit**

Run: `pnpm --filter @delta-club/admin build`

```bash
git add apps/admin/
git commit -m "feat(admin): 推广订单管理页（订单列表 + 新建 + dailyRate 排名）"
```

---

## Task 12: 全量编译验证 + 最终 Commit

- [ ] **Step 1: 全量构建**

Run: `pnpm build`
Expected: shared、server、admin 全部编译成功

- [ ] **Step 2: 启动验证**

Run: `make dev` (需要数据库已启动并 migrate)
Expected: server 路由注册包含所有新 API，admin 前端能访问并导航

- [ ] **Step 3: 最终 Commit**（如有未提交的修复）

```bash
git add -A
git commit -m "feat: Stage 2 俱乐部数据管理完成"
```
