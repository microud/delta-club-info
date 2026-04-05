# Stage 3: 爬虫与视频采集 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现自动化视频抓取入库——博主管理、爬虫调度、B站 Adapter、视频去重存储，Admin 后台可管理博主、查看爬虫记录、配置频率、浏览视频列表。

**Architecture:** NestJS CrawlerModule 内置定时爬虫，通过 Adapter 模式隔离平台差异（先做 B站，抖音留接口）。SchedulerRegistry 实现动态频率调度，SystemConfig 表存储配置项供 Admin 读写。Admin 前端新增博主管理、爬虫管理、视频列表三个页面。

**Tech Stack:** NestJS, @nestjs/schedule, Drizzle ORM, PostgreSQL, axios (B站 API), React + Shadcn/ui + TanStack Router/Table

---

## File Structure

### Server — 新建文件

```
apps/server/src/database/schema/
├── system-config.schema.ts        # SystemConfig 表
├── blogger.schema.ts              # Blogger 表
├── crawl-task.schema.ts           # CrawlTask 表
└── video.schema.ts                # Video 表

apps/server/src/crawler/
├── crawler.module.ts              # CrawlerModule（Schedule + Adapters + Services）
├── crawler.service.ts             # 定时调度 + 手动触发
├── adapters/
│   ├── crawler-adapter.interface.ts  # 统一接口
│   ├── bilibili.adapter.ts          # B站实现
│   └── douyin.adapter.ts            # 抖音占位
└── crawl-task.service.ts          # CrawlTask 记录 CRUD

apps/server/src/admin/bloggers/
├── bloggers.controller.ts
├── bloggers.service.ts
└── dto/
    ├── create-blogger.dto.ts
    └── update-blogger.dto.ts

apps/server/src/admin/crawl-tasks/
├── crawl-tasks.controller.ts
└── crawl-tasks.service.ts

apps/server/src/admin/videos/
├── videos.controller.ts
└── videos.service.ts

apps/server/src/admin/system-configs/
├── system-configs.controller.ts
├── system-configs.service.ts
└── dto/
    └── update-config.dto.ts
```

### Server — 修改文件

```
apps/server/src/database/schema/index.ts      # 添加新 schema 导出
apps/server/src/app.module.ts                  # 注册 CrawlerModule
apps/server/src/admin/admin.module.ts          # 注册新 Controllers/Services
apps/server/package.json                       # 添加 @nestjs/schedule, axios
```

### Shared — 修改文件

```
packages/shared/src/types.ts                   # 添加 BloggerDto, CrawlTaskDto, VideoDto, SystemConfigDto
```

### Admin 前端 — 新建文件

```
apps/admin/src/routes/_authenticated/bloggers/
├── route.tsx                                  # 博主管理路由
apps/admin/src/features/bloggers/
├── index.tsx                                  # 博主管理页面
├── data/schema.ts                             # Zod schemas
├── components/
│   ├── bloggers-columns.tsx                   # 表格列定义
│   ├── bloggers-table.tsx                     # 表格组件
│   ├── blogger-form.tsx                       # 创建/编辑表单
│   └── bloggers-delete-dialog.tsx             # 删除确认

apps/admin/src/routes/_authenticated/crawler/
├── route.tsx                                  # 爬虫管理路由
apps/admin/src/features/crawler/
├── index.tsx                                  # 爬虫管理页面
├── data/schema.ts
├── components/
│   ├── crawl-tasks-columns.tsx
│   ├── crawl-tasks-table.tsx
│   └── frequency-config.tsx                   # 频率配置组件

apps/admin/src/routes/_authenticated/videos/
├── route.tsx                                  # 视频列表路由
apps/admin/src/features/videos/
├── index.tsx                                  # 视频列表页面
├── data/schema.ts
├── components/
│   ├── videos-columns.tsx
│   └── videos-table.tsx
```

### Admin 前端 — 修改文件

```
apps/admin/src/components/layout/data/sidebar-data.ts  # 添加菜单项
apps/admin/src/lib/api.ts                              # 添加 API 函数
```

---

## Task 1: 安装依赖

**Files:**
- Modify: `apps/server/package.json`

- [ ] **Step 1: 安装 server 端新依赖**

```bash
cd /Users/microud/Projects/delta-club-info && pnpm --filter @delta-club/server add @nestjs/schedule axios
```

- [ ] **Step 2: 验证安装成功**

```bash
cd /Users/microud/Projects/delta-club-info && pnpm --filter @delta-club/server exec -- node -e "require('@nestjs/schedule'); require('axios'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/server && git add package.json ../../pnpm-lock.yaml && git commit -m "chore: add @nestjs/schedule and axios dependencies for crawler"
```

---

## Task 2: SystemConfig 表 schema + service + controller

**Files:**
- Create: `apps/server/src/database/schema/system-config.schema.ts`
- Modify: `apps/server/src/database/schema/index.ts`
- Create: `apps/server/src/admin/system-configs/system-configs.service.ts`
- Create: `apps/server/src/admin/system-configs/system-configs.controller.ts`
- Create: `apps/server/src/admin/system-configs/dto/update-config.dto.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 创建 SystemConfig schema**

Create `apps/server/src/database/schema/system-config.schema.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const systemConfigs = pgTable('system_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 200 }).notNull().unique(),
  value: text('value').notNull(),
  description: varchar('description', { length: 500 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: 导出 schema 并生成 migration**

Add to `apps/server/src/database/schema/index.ts`:

```typescript
export * from './system-config.schema';
```

Run:

```bash
cd /Users/microud/Projects/delta-club-info && pnpm --filter @delta-club/server run db:generate
```

- [ ] **Step 3: 运行 migration**

```bash
cd /Users/microud/Projects/delta-club-info && pnpm --filter @delta-club/server run db:migrate
```

- [ ] **Step 4: 创建 UpdateConfigDto**

Create `apps/server/src/admin/system-configs/dto/update-config.dto.ts`:

```typescript
import { IsString } from 'class-validator';

export class UpdateConfigDto {
  @IsString()
  value: string;
}
```

- [ ] **Step 5: 创建 SystemConfigsService**

Create `apps/server/src/admin/system-configs/system-configs.service.ts`:

```typescript
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class SystemConfigsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.select().from(schema.systemConfigs);
  }

  async getValue(key: string): Promise<string | null> {
    const [config] = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, key));
    return config?.value ?? null;
  }

  async upsert(key: string, value: string, description?: string) {
    const [existing] = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, key));

    if (existing) {
      const [updated] = await this.db
        .update(schema.systemConfigs)
        .set({ value, updatedAt: new Date() })
        .where(eq(schema.systemConfigs.key, key))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(schema.systemConfigs)
      .values({ key, value, description })
      .returning();
    return created;
  }
}
```

- [ ] **Step 6: 创建 SystemConfigsController**

Create `apps/server/src/admin/system-configs/system-configs.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { SystemConfigsService } from './system-configs.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@Controller('admin/system-configs')
@UseGuards(AdminGuard)
export class SystemConfigsController {
  constructor(private readonly systemConfigsService: SystemConfigsService) {}

  @Get()
  findAll() {
    return this.systemConfigsService.findAll();
  }

  @Put(':key')
  update(@Param('key') key: string, @Body() dto: UpdateConfigDto) {
    return this.systemConfigsService.upsert(key, dto.value);
  }
}
```

- [ ] **Step 7: 注册到 AdminModule**

Modify `apps/server/src/admin/admin.module.ts` — 添加 imports:

```typescript
import { SystemConfigsController } from './system-configs/system-configs.controller';
import { SystemConfigsService } from './system-configs/system-configs.service';
```

Add `SystemConfigsController` to `controllers` array and `SystemConfigsService` to `providers` array.

- [ ] **Step 8: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/server && git add -A && git commit -m "feat: add SystemConfig table with admin CRUD endpoints"
```

---

## Task 3: Blogger 表 schema + Admin CRUD

**Files:**
- Create: `apps/server/src/database/schema/blogger.schema.ts`
- Modify: `apps/server/src/database/schema/index.ts`
- Create: `apps/server/src/admin/bloggers/dto/create-blogger.dto.ts`
- Create: `apps/server/src/admin/bloggers/dto/update-blogger.dto.ts`
- Create: `apps/server/src/admin/bloggers/bloggers.service.ts`
- Create: `apps/server/src/admin/bloggers/bloggers.controller.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 创建 Blogger schema**

Create `apps/server/src/database/schema/blogger.schema.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const videoPlatformEnum = pgEnum('video_platform', [
  'BILIBILI',
  'DOUYIN',
]);

export const bloggers = pgTable('bloggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: videoPlatformEnum('platform').notNull(),
  externalId: varchar('external_id', { length: 200 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: 导出 schema 并生成+运行 migration**

Add `export * from './blogger.schema';` to `apps/server/src/database/schema/index.ts`.

```bash
cd /Users/microud/Projects/delta-club-info && pnpm --filter @delta-club/server run db:generate && pnpm --filter @delta-club/server run db:migrate
```

- [ ] **Step 3: 创建 DTOs**

Create `apps/server/src/admin/bloggers/dto/create-blogger.dto.ts`:

```typescript
import { IsString, IsEnum } from 'class-validator';

export class CreateBloggerDto {
  @IsEnum(['BILIBILI', 'DOUYIN'])
  platform: string;

  @IsString()
  externalId: string;

  @IsString()
  name: string;
}
```

Create `apps/server/src/admin/bloggers/dto/update-blogger.dto.ts`:

```typescript
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateBloggerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

- [ ] **Step 4: 创建 BloggersService**

Create `apps/server/src/admin/bloggers/bloggers.service.ts`:

```typescript
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateBloggerDto } from './dto/create-blogger.dto';
import { UpdateBloggerDto } from './dto/update-blogger.dto';

type VideoPlatform = 'BILIBILI' | 'DOUYIN';

@Injectable()
export class BloggersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db
      .select()
      .from(schema.bloggers)
      .orderBy(desc(schema.bloggers.createdAt));
  }

  async create(dto: CreateBloggerDto) {
    const [blogger] = await this.db
      .insert(schema.bloggers)
      .values({
        platform: dto.platform as VideoPlatform,
        externalId: dto.externalId,
        name: dto.name,
      })
      .returning();
    return blogger;
  }

  async update(id: string, dto: UpdateBloggerDto) {
    const values: Record<string, unknown> = {};
    if (dto.name !== undefined) values.name = dto.name;
    if (dto.isActive !== undefined) values.isActive = dto.isActive;

    const [blogger] = await this.db
      .update(schema.bloggers)
      .set(values)
      .where(eq(schema.bloggers.id, id))
      .returning();

    if (!blogger) throw new NotFoundException('Blogger not found');
    return blogger;
  }

  async remove(id: string) {
    const [blogger] = await this.db
      .delete(schema.bloggers)
      .where(eq(schema.bloggers.id, id))
      .returning();

    if (!blogger) throw new NotFoundException('Blogger not found');
    return blogger;
  }
}
```

- [ ] **Step 5: 创建 BloggersController**

Create `apps/server/src/admin/bloggers/bloggers.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { BloggersService } from './bloggers.service';
import { CreateBloggerDto } from './dto/create-blogger.dto';
import { UpdateBloggerDto } from './dto/update-blogger.dto';

@Controller('admin/bloggers')
@UseGuards(AdminGuard)
export class BloggersController {
  constructor(private readonly bloggersService: BloggersService) {}

  @Get()
  findAll() {
    return this.bloggersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateBloggerDto) {
    return this.bloggersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBloggerDto) {
    return this.bloggersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bloggersService.remove(id);
  }
}
```

- [ ] **Step 6: 注册到 AdminModule**

Add to `apps/server/src/admin/admin.module.ts`:

```typescript
import { BloggersController } from './bloggers/bloggers.controller';
import { BloggersService } from './bloggers/bloggers.service';
```

Add `BloggersController` to `controllers`, `BloggersService` to `providers`.

- [ ] **Step 7: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/server && git add -A && git commit -m "feat: add Blogger table with admin CRUD endpoints"
```

---

## Task 4: Video 表 + CrawlTask 表 schema

**Files:**
- Create: `apps/server/src/database/schema/video.schema.ts`
- Create: `apps/server/src/database/schema/crawl-task.schema.ts`
- Modify: `apps/server/src/database/schema/index.ts`

- [ ] **Step 1: 创建 Video schema**

Create `apps/server/src/database/schema/video.schema.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';
import { videoPlatformEnum } from './blogger.schema';

export const videoCategoryEnum = pgEnum('video_category', [
  'REVIEW',
  'SENTIMENT',
]);

export const aiSentimentEnum = pgEnum('ai_sentiment', [
  'POSITIVE',
  'NEGATIVE',
  'NEUTRAL',
]);

export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'set null' }),
    platform: videoPlatformEnum('platform').notNull(),
    externalId: varchar('external_id', { length: 200 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    coverUrl: varchar('cover_url', { length: 1000 }).notNull(),
    videoUrl: varchar('video_url', { length: 1000 }).notNull(),
    description: text('description'),
    authorName: varchar('author_name', { length: 200 }).notNull(),
    authorId: varchar('author_id', { length: 200 }).notNull(),
    category: videoCategoryEnum('category').notNull(),
    subtitleText: text('subtitle_text'),
    aiParsed: boolean('ai_parsed').notNull().default(false),
    aiClubMatch: varchar('ai_club_match', { length: 200 }),
    aiSummary: text('ai_summary'),
    aiSentiment: aiSentimentEnum('ai_sentiment'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('videos_platform_external_id_idx').on(
      table.platform,
      table.externalId,
    ),
  ],
);
```

- [ ] **Step 2: 创建 CrawlTask schema**

Create `apps/server/src/database/schema/crawl-task.schema.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const crawlTaskTypeEnum = pgEnum('crawl_task_type', [
  'BLOGGER',
  'KEYWORD',
]);

export const crawlTaskStatusEnum = pgEnum('crawl_task_status', [
  'RUNNING',
  'SUCCESS',
  'FAILED',
]);

export const crawlTasks = pgTable('crawl_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: crawlTaskTypeEnum('type').notNull(),
  targetId: varchar('target_id', { length: 500 }).notNull(),
  status: crawlTaskStatusEnum('status').notNull().default('RUNNING'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  videoCount: integer('video_count').notNull().default(0),
  errorMessage: text('error_message'),
});
```

- [ ] **Step 3: 导出 schema 并生成+运行 migration**

Add to `apps/server/src/database/schema/index.ts`:

```typescript
export * from './video.schema';
export * from './crawl-task.schema';
```

```bash
cd /Users/microud/Projects/delta-club-info && pnpm --filter @delta-club/server run db:generate && pnpm --filter @delta-club/server run db:migrate
```

- [ ] **Step 4: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/server && git add -A && git commit -m "feat: add Video and CrawlTask table schemas with migrations"
```

---

## Task 5: Crawler Adapter 接口 + B站 Adapter + 抖音占位

**Files:**
- Create: `apps/server/src/crawler/adapters/crawler-adapter.interface.ts`
- Create: `apps/server/src/crawler/adapters/bilibili.adapter.ts`
- Create: `apps/server/src/crawler/adapters/douyin.adapter.ts`

- [ ] **Step 1: 定义 Adapter 接口**

Create `apps/server/src/crawler/adapters/crawler-adapter.interface.ts`:

```typescript
export interface RawVideo {
  externalId: string;
  title: string;
  coverUrl: string;
  videoUrl: string;
  description?: string;
  authorName: string;
  authorId: string;
  publishedAt: Date;
}

export interface CrawlerAdapter {
  platform: 'BILIBILI' | 'DOUYIN';
  fetchBloggerVideos(bloggerId: string): Promise<RawVideo[]>;
  searchVideos(keyword: string): Promise<RawVideo[]>;
}
```

- [ ] **Step 2: 实现 B站 Adapter**

Create `apps/server/src/crawler/adapters/bilibili.adapter.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CrawlerAdapter, RawVideo } from './crawler-adapter.interface';

@Injectable()
export class BilibiliAdapter implements CrawlerAdapter {
  platform = 'BILIBILI' as const;
  private readonly logger = new Logger(BilibiliAdapter.name);

  private readonly http = axios.create({
    baseURL: 'https://api.bilibili.com',
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  async fetchBloggerVideos(bloggerId: string): Promise<RawVideo[]> {
    try {
      const res = await this.http.get('/x/space/wbi/arc/search', {
        params: {
          mid: bloggerId,
          ps: 30,
          pn: 1,
          order: 'pubdate',
        },
      });

      const list = res.data?.data?.list?.vlist;
      if (!Array.isArray(list)) {
        this.logger.warn(`No videos found for blogger ${bloggerId}`);
        return [];
      }

      return list.map((item: Record<string, unknown>) => ({
        externalId: String(item.bvid),
        title: String(item.title ?? ''),
        coverUrl: String(item.pic ?? '').replace(/^\/\//, 'https://'),
        videoUrl: `https://www.bilibili.com/video/${item.bvid}`,
        description: item.description ? String(item.description) : undefined,
        authorName: String(item.author ?? ''),
        authorId: String(bloggerId),
        publishedAt: new Date((item.created as number) * 1000),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch videos for blogger ${bloggerId}`, error);
      return [];
    }
  }

  async searchVideos(keyword: string): Promise<RawVideo[]> {
    try {
      const res = await this.http.get('/x/web-interface/search/type', {
        params: {
          search_type: 'video',
          keyword,
          order: 'pubdate',
          page: 1,
          pagesize: 30,
        },
      });

      const list = res.data?.data?.result;
      if (!Array.isArray(list)) {
        this.logger.warn(`No search results for keyword "${keyword}"`);
        return [];
      }

      return list.map((item: Record<string, unknown>) => ({
        externalId: String(item.bvid),
        title: String(item.title ?? '').replace(/<[^>]+>/g, ''),
        coverUrl: String(item.pic ?? '').replace(/^\/\//, 'https://'),
        videoUrl: `https://www.bilibili.com/video/${item.bvid}`,
        description: item.description ? String(item.description) : undefined,
        authorName: String(item.author ?? ''),
        authorId: String(item.mid ?? ''),
        publishedAt: new Date((item.pubdate as number) * 1000),
      }));
    } catch (error) {
      this.logger.error(`Failed to search videos for "${keyword}"`, error);
      return [];
    }
  }
}
```

- [ ] **Step 3: 创建抖音 Adapter 占位**

Create `apps/server/src/crawler/adapters/douyin.adapter.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CrawlerAdapter, RawVideo } from './crawler-adapter.interface';

@Injectable()
export class DouyinAdapter implements CrawlerAdapter {
  platform = 'DOUYIN' as const;
  private readonly logger = new Logger(DouyinAdapter.name);

  async fetchBloggerVideos(bloggerId: string): Promise<RawVideo[]> {
    this.logger.warn(`Douyin adapter not implemented, skipping blogger ${bloggerId}`);
    return [];
  }

  async searchVideos(keyword: string): Promise<RawVideo[]> {
    this.logger.warn(`Douyin adapter not implemented, skipping keyword "${keyword}"`);
    return [];
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/server && git add -A && git commit -m "feat: add crawler adapter interface with Bilibili implementation and Douyin stub"
```

---

## Task 6: CrawlerService（核心调度 + 爬取逻辑）

**Files:**
- Create: `apps/server/src/crawler/crawl-task.service.ts`
- Create: `apps/server/src/crawler/crawler.service.ts`
- Create: `apps/server/src/crawler/crawler.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: 创建 CrawlTaskService（记录管理）**

Create `apps/server/src/crawler/crawl-task.service.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';

type CrawlTaskType = 'BLOGGER' | 'KEYWORD';
type CrawlTaskStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

@Injectable()
export class CrawlTaskService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createTask(type: CrawlTaskType, targetId: string) {
    const [task] = await this.db
      .insert(schema.crawlTasks)
      .values({ type, targetId })
      .returning();
    return task;
  }

  async finishTask(id: string, status: CrawlTaskStatus, videoCount: number, errorMessage?: string) {
    const [task] = await this.db
      .update(schema.crawlTasks)
      .set({
        status,
        finishedAt: new Date(),
        videoCount,
        errorMessage: errorMessage ?? null,
      })
      .where(eq(schema.crawlTasks.id, id))
      .returning();
    return task;
  }
}
```

- [ ] **Step 2: 创建 CrawlerService（调度 + 爬取）**

Create `apps/server/src/crawler/crawler.service.ts`:

```typescript
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { BilibiliAdapter } from './adapters/bilibili.adapter';
import { DouyinAdapter } from './adapters/douyin.adapter';
import { CrawlerAdapter, RawVideo } from './adapters/crawler-adapter.interface';
import { CrawlTaskService } from './crawl-task.service';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';

const INTERVAL_NAME = 'crawler-interval';
const DEFAULT_FREQUENCY_MINUTES = 60;

@Injectable()
export class CrawlerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly adapters: Map<string, CrawlerAdapter>;
  private isRunning = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly crawlTaskService: CrawlTaskService,
    private readonly systemConfigsService: SystemConfigsService,
    bilibiliAdapter: BilibiliAdapter,
    douyinAdapter: DouyinAdapter,
  ) {
    this.adapters = new Map([
      ['BILIBILI', bilibiliAdapter],
      ['DOUYIN', douyinAdapter],
    ]);
  }

  async onModuleInit() {
    await this.registerInterval();
  }

  async registerInterval() {
    // Remove existing interval if any
    try {
      this.schedulerRegistry.deleteInterval(INTERVAL_NAME);
    } catch {
      // No existing interval, that's fine
    }

    const raw = await this.systemConfigsService.getValue('crawler.frequency');
    const minutes = raw ? parseInt(raw, 10) : DEFAULT_FREQUENCY_MINUTES;
    const ms = (isNaN(minutes) || minutes < 1 ? DEFAULT_FREQUENCY_MINUTES : minutes) * 60 * 1000;

    const interval = setInterval(() => this.runAll(), ms);
    this.schedulerRegistry.addInterval(INTERVAL_NAME, interval);
    this.logger.log(`Crawler scheduled every ${ms / 60000} minutes`);
  }

  async updateFrequency(minutes: number) {
    await this.systemConfigsService.upsert(
      'crawler.frequency',
      String(minutes),
      '爬虫抓取频率（分钟）',
    );
    await this.registerInterval();
  }

  async runAll() {
    if (this.isRunning) {
      this.logger.warn('Crawler already running, skipping');
      return;
    }
    this.isRunning = true;
    try {
      await this.runBloggerCrawl();
      await this.runKeywordCrawl();
    } finally {
      this.isRunning = false;
    }
  }

  private async runBloggerCrawl() {
    const activeBloggers = await this.db
      .select()
      .from(schema.bloggers)
      .where(eq(schema.bloggers.isActive, true));

    for (const blogger of activeBloggers) {
      const task = await this.crawlTaskService.createTask('BLOGGER', blogger.externalId);
      try {
        const adapter = this.adapters.get(blogger.platform);
        if (!adapter) {
          await this.crawlTaskService.finishTask(task.id, 'FAILED', 0, `No adapter for ${blogger.platform}`);
          continue;
        }

        const rawVideos = await adapter.fetchBloggerVideos(blogger.externalId);
        const count = await this.saveVideos(rawVideos, blogger.platform as 'BILIBILI' | 'DOUYIN', 'REVIEW');
        await this.crawlTaskService.finishTask(task.id, 'SUCCESS', count);
        this.logger.log(`BloggerCrawl: ${blogger.name} → ${count} new videos`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await this.crawlTaskService.finishTask(task.id, 'FAILED', 0, msg);
        this.logger.error(`BloggerCrawl failed for ${blogger.name}`, error);
      }
    }
  }

  private async runKeywordCrawl() {
    const publishedClubs = await this.db
      .select({ id: schema.clubs.id, name: schema.clubs.name })
      .from(schema.clubs)
      .where(eq(schema.clubs.status, 'published'));

    for (const club of publishedClubs) {
      const task = await this.crawlTaskService.createTask('KEYWORD', club.name);
      try {
        // Only use BILIBILI adapter for now
        const adapter = this.adapters.get('BILIBILI');
        if (!adapter) {
          await this.crawlTaskService.finishTask(task.id, 'FAILED', 0, 'No BILIBILI adapter');
          continue;
        }

        const rawVideos = await adapter.searchVideos(club.name);
        const count = await this.saveVideos(rawVideos, 'BILIBILI', 'SENTIMENT');
        await this.crawlTaskService.finishTask(task.id, 'SUCCESS', count);
        this.logger.log(`KeywordCrawl: "${club.name}" → ${count} new videos`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await this.crawlTaskService.finishTask(task.id, 'FAILED', 0, msg);
        this.logger.error(`KeywordCrawl failed for "${club.name}"`, error);
      }
    }
  }

  private async saveVideos(
    rawVideos: RawVideo[],
    platform: 'BILIBILI' | 'DOUYIN',
    category: 'REVIEW' | 'SENTIMENT',
  ): Promise<number> {
    let count = 0;
    for (const raw of rawVideos) {
      try {
        await this.db
          .insert(schema.videos)
          .values({
            platform,
            externalId: raw.externalId,
            title: raw.title,
            coverUrl: raw.coverUrl,
            videoUrl: raw.videoUrl,
            description: raw.description ?? null,
            authorName: raw.authorName,
            authorId: raw.authorId,
            category,
            publishedAt: raw.publishedAt,
          })
          .onConflictDoNothing({
            target: [schema.videos.platform, schema.videos.externalId],
          });
        count++;
      } catch (error) {
        // Unique constraint violation → already exists, skip
        this.logger.debug(`Video ${raw.externalId} already exists, skipping`);
      }
    }
    return count;
  }
}
```

- [ ] **Step 3: 创建 CrawlerModule**

Create `apps/server/src/crawler/crawler.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlerService } from './crawler.service';
import { CrawlTaskService } from './crawl-task.service';
import { BilibiliAdapter } from './adapters/bilibili.adapter';
import { DouyinAdapter } from './adapters/douyin.adapter';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    CrawlerService,
    CrawlTaskService,
    BilibiliAdapter,
    DouyinAdapter,
    SystemConfigsService,
  ],
  exports: [CrawlerService, CrawlTaskService],
})
export class CrawlerModule {}
```

- [ ] **Step 4: 注册 CrawlerModule 到 AppModule**

Modify `apps/server/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './admin/admin.module';
import { CrawlerModule } from './crawler/crawler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AdminModule,
    CrawlerModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/server && git add -A && git commit -m "feat: add CrawlerModule with dynamic scheduling, blogger crawl, and keyword crawl"
```

---

## Task 7: Admin 爬虫管理 + 视频列表 API

**Files:**
- Create: `apps/server/src/admin/crawl-tasks/crawl-tasks.service.ts`
- Create: `apps/server/src/admin/crawl-tasks/crawl-tasks.controller.ts`
- Create: `apps/server/src/admin/videos/videos.service.ts`
- Create: `apps/server/src/admin/videos/videos.controller.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 创建 Admin CrawlTasksService**

Create `apps/server/src/admin/crawl-tasks/crawl-tasks.service.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AdminCrawlTasksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db
      .select()
      .from(schema.crawlTasks)
      .orderBy(desc(schema.crawlTasks.startedAt))
      .limit(100);
  }
}
```

- [ ] **Step 2: 创建 Admin CrawlTasksController**

Create `apps/server/src/admin/crawl-tasks/crawl-tasks.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminCrawlTasksService } from './crawl-tasks.service';
import { CrawlerService } from '../../crawler/crawler.service';

@Controller('admin/crawl-tasks')
@UseGuards(AdminGuard)
export class AdminCrawlTasksController {
  constructor(
    private readonly crawlTasksService: AdminCrawlTasksService,
    private readonly crawlerService: CrawlerService,
  ) {}

  @Get()
  findAll() {
    return this.crawlTasksService.findAll();
  }

  @Post('trigger')
  trigger() {
    // Fire and forget — don't await
    this.crawlerService.runAll();
    return { message: 'Crawl triggered' };
  }

  @Get('frequency')
  async getFrequency() {
    const { systemConfigsService } = this.crawlerService as any;
    // Use a cleaner approach — expose from CrawlerService
    return { frequency: await this.crawlerService.getFrequency() };
  }

  @Post('frequency')
  async updateFrequency(@Body() body: { frequency: number }) {
    await this.crawlerService.updateFrequency(body.frequency);
    return { frequency: body.frequency };
  }
}
```

- [ ] **Step 3: 给 CrawlerService 添加 getFrequency 方法**

在 `apps/server/src/crawler/crawler.service.ts` 中添加：

```typescript
  async getFrequency(): Promise<number> {
    const raw = await this.systemConfigsService.getValue('crawler.frequency');
    return raw ? parseInt(raw, 10) || DEFAULT_FREQUENCY_MINUTES : DEFAULT_FREQUENCY_MINUTES;
  }
```

- [ ] **Step 4: 创建 Admin VideosService**

Create `apps/server/src/admin/videos/videos.service.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AdminVideosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(filters?: { platform?: string; category?: string }) {
    let query = this.db
      .select({
        id: schema.videos.id,
        clubId: schema.videos.clubId,
        clubName: schema.clubs.name,
        platform: schema.videos.platform,
        externalId: schema.videos.externalId,
        title: schema.videos.title,
        coverUrl: schema.videos.coverUrl,
        videoUrl: schema.videos.videoUrl,
        authorName: schema.videos.authorName,
        category: schema.videos.category,
        aiParsed: schema.videos.aiParsed,
        aiSentiment: schema.videos.aiSentiment,
        publishedAt: schema.videos.publishedAt,
        createdAt: schema.videos.createdAt,
      })
      .from(schema.videos)
      .leftJoin(schema.clubs, eq(schema.videos.clubId, schema.clubs.id))
      .orderBy(desc(schema.videos.createdAt))
      .limit(200)
      .$dynamic();

    if (filters?.platform) {
      query = query.where(eq(schema.videos.platform, filters.platform as 'BILIBILI' | 'DOUYIN'));
    }

    return query;
  }
}
```

- [ ] **Step 5: 创建 Admin VideosController**

Create `apps/server/src/admin/videos/videos.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminVideosService } from './videos.service';

@Controller('admin/videos')
@UseGuards(AdminGuard)
export class AdminVideosController {
  constructor(private readonly videosService: AdminVideosService) {}

  @Get()
  findAll(
    @Query('platform') platform?: string,
    @Query('category') category?: string,
  ) {
    return this.videosService.findAll({ platform, category });
  }
}
```

- [ ] **Step 6: 注册到 AdminModule**

Add to `apps/server/src/admin/admin.module.ts`:

```typescript
import { AdminCrawlTasksController } from './crawl-tasks/crawl-tasks.controller';
import { AdminCrawlTasksService } from './crawl-tasks/crawl-tasks.service';
import { AdminVideosController } from './videos/videos.controller';
import { AdminVideosService } from './videos/videos.service';
```

Add controllers and services. Also import CrawlerModule:

```typescript
imports: [
  JwtModule.registerAsync({ ... }),
  forwardRef(() => CrawlerModule),
],
```

Add `forwardRef` import from `@nestjs/common`.

- [ ] **Step 7: 更新 CrawlerModule exports**

Ensure `CrawlerModule` exports `CrawlerService`:

```typescript
exports: [CrawlerService, CrawlTaskService],
```

- [ ] **Step 8: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/server && git add -A && git commit -m "feat: add admin endpoints for crawl tasks, video list, and frequency config"
```

---

## Task 8: Shared types 更新

**Files:**
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: 添加新的 DTO 类型**

Append to `packages/shared/src/types.ts`:

```typescript
export interface BloggerDto {
  id: string;
  platform: string;
  externalId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CrawlTaskDto {
  id: string;
  type: string;
  targetId: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  videoCount: number;
  errorMessage: string | null;
}

export interface VideoDto {
  id: string;
  clubId: string | null;
  clubName?: string | null;
  platform: string;
  externalId: string;
  title: string;
  coverUrl: string;
  videoUrl: string;
  authorName: string;
  category: string;
  aiParsed: boolean;
  aiSentiment: string | null;
  publishedAt: string;
  createdAt: string;
}

export interface SystemConfigDto {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/packages/shared && git add -A && git commit -m "feat: add BloggerDto, CrawlTaskDto, VideoDto, SystemConfigDto types"
```

---

## Task 9: Admin 前端 — API 函数 + 侧边栏

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/components/layout/data/sidebar-data.ts`

- [ ] **Step 1: 添加 API 函数**

Append to `apps/admin/src/lib/api.ts` (before `export default api`):

```typescript
import type {
  BloggerDto,
  CrawlTaskDto,
  VideoDto,
} from '@delta-club/shared'

// Bloggers
export const getBloggers = () =>
  api.get<BloggerDto[]>('/bloggers').then((res) => res.data)

export const createBlogger = (data: { platform: string; externalId: string; name: string }) =>
  api.post<BloggerDto>('/bloggers', data).then((res) => res.data)

export const updateBlogger = (id: string, data: { name?: string; isActive?: boolean }) =>
  api.patch<BloggerDto>(`/bloggers/${id}`, data).then((res) => res.data)

export const deleteBlogger = (id: string) =>
  api.delete(`/bloggers/${id}`)

// Crawl Tasks
export const getCrawlTasks = () =>
  api.get<CrawlTaskDto[]>('/crawl-tasks').then((res) => res.data)

export const triggerCrawl = () =>
  api.post('/crawl-tasks/trigger').then((res) => res.data)

export const getCrawlFrequency = () =>
  api.get<{ frequency: number }>('/crawl-tasks/frequency').then((res) => res.data)

export const updateCrawlFrequency = (frequency: number) =>
  api.post<{ frequency: number }>('/crawl-tasks/frequency', { frequency }).then((res) => res.data)

// Videos
export const getVideos = (params?: { platform?: string; category?: string }) =>
  api.get<VideoDto[]>('/videos', { params }).then((res) => res.data)
```

Also add the new imports to the existing import statement at the top.

- [ ] **Step 2: 更新侧边栏菜单**

Modify `apps/admin/src/components/layout/data/sidebar-data.ts`:

```typescript
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Palette,
  UserSearch,
  Bot,
  Video,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: '管理',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: '俱乐部管理',
          url: '/clubs',
          icon: Building2,
        },
        {
          title: '推广管理',
          url: '/promotions',
          icon: Megaphone,
        },
        {
          title: '博主管理',
          url: '/bloggers',
          icon: UserSearch,
        },
        {
          title: '爬虫管理',
          url: '/crawler',
          icon: Bot,
        },
        {
          title: '视频列表',
          url: '/videos',
          icon: Video,
        },
      ],
    },
    {
      title: '设置',
      items: [
        {
          title: '外观',
          url: '/settings/appearance',
          icon: Palette,
        },
      ],
    },
  ],
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/admin && git add -A && git commit -m "feat: add API functions and sidebar items for bloggers, crawler, and videos"
```

---

## Task 10: Admin 前端 — 博主管理页面

**Files:**
- Create: `apps/admin/src/routes/_authenticated/bloggers/route.tsx`
- Create: `apps/admin/src/features/bloggers/index.tsx`
- Create: `apps/admin/src/features/bloggers/data/schema.ts`
- Create: `apps/admin/src/features/bloggers/components/bloggers-columns.tsx`
- Create: `apps/admin/src/features/bloggers/components/bloggers-table.tsx`
- Create: `apps/admin/src/features/bloggers/components/blogger-form.tsx`
- Create: `apps/admin/src/features/bloggers/components/bloggers-delete-dialog.tsx`

- [ ] **Step 1: 创建 Zod schema**

Create `apps/admin/src/features/bloggers/data/schema.ts`:

```typescript
import { z } from 'zod'

export const bloggerSchema = z.object({
  id: z.string(),
  platform: z.enum(['BILIBILI', 'DOUYIN']),
  externalId: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

export type Blogger = z.infer<typeof bloggerSchema>

export const bloggerFormSchema = z.object({
  platform: z.enum(['BILIBILI', 'DOUYIN']),
  externalId: z.string().min(1, '平台用户 ID 不能为空'),
  name: z.string().min(1, '博主名称不能为空'),
})

export type BloggerFormValues = z.infer<typeof bloggerFormSchema>

export const platformLabels: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
}
```

- [ ] **Step 2: 创建表格列定义**

Create `apps/admin/src/features/bloggers/components/bloggers-columns.tsx`:

```typescript
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { type Blogger, platformLabels } from '../data/schema'

export const bloggersColumns: ColumnDef<Blogger>[] = [
  {
    accessorKey: 'name',
    header: '博主名称',
    cell: ({ row }) => (
      <span className='font-medium'>{row.getValue('name')}</span>
    ),
  },
  {
    accessorKey: 'platform',
    header: '平台',
    cell: ({ row }) => {
      const platform = row.getValue<string>('platform')
      return <Badge variant='outline'>{platformLabels[platform] ?? platform}</Badge>
    },
  },
  {
    accessorKey: 'externalId',
    header: '平台用户 ID',
  },
  {
    accessorKey: 'isActive',
    header: '状态',
    cell: ({ row }) => {
      const active = row.getValue<boolean>('isActive')
      return (
        <Badge variant={active ? 'default' : 'secondary'}>
          {active ? '启用' : '停用'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => new Date(row.getValue<string>('createdAt')).toLocaleDateString(),
  },
]
```

- [ ] **Step 3: 创建表格组件**

Create `apps/admin/src/features/bloggers/components/bloggers-table.tsx`:

```typescript
import { useState } from 'react'
import {
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { type Blogger } from '../data/schema'
import { bloggersColumns } from './bloggers-columns'

type BloggersTableProps = {
  data: Blogger[]
  onToggle: (blogger: Blogger) => void
  onDelete: (blogger: Blogger) => void
}

export function BloggersTable({ data, onToggle, onDelete }: BloggersTableProps) {
  const columns = [
    ...bloggersColumns,
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }: { row: { original: Blogger } }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => onToggle(row.original)}>
              <Power className='mr-2 h-4 w-4' />
              {row.original.isActive ? '停用' : '启用'}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant='destructive'
              onClick={() => onDelete(row.original)}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='overflow-hidden rounded-md border'>
        <Table className='min-w-xl'>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  暂无��据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
```

- [ ] **Step 4: 创建博主表单**

Create `apps/admin/src/features/bloggers/components/blogger-form.tsx`:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { bloggerFormSchema, type BloggerFormValues } from '../data/schema'

type BloggerFormProps = {
  onSubmit: (data: BloggerFormValues) => void
  isSubmitting?: boolean
}

export function BloggerForm({ onSubmit, isSubmitting }: BloggerFormProps) {
  const form = useForm<BloggerFormValues>({
    resolver: zodResolver(bloggerFormSchema),
    defaultValues: {
      platform: 'BILIBILI',
      externalId: '',
      name: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='platform'
          render={({ field }) => (
            <FormItem>
              <FormLabel>平台</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='选择平台' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='BILIBILI'>B站</SelectItem>
                  <SelectItem value='DOUYIN'>抖音</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='externalId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>平台用户 ID</FormLabel>
              <FormControl>
                <Input placeholder='例如: 12345678' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>博主名称</FormLabel>
              <FormControl>
                <Input placeholder='博主昵称' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex justify-end'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

- [ ] **Step 5: 创建删除确认弹窗**

Create `apps/admin/src/features/bloggers/components/bloggers-delete-dialog.tsx`:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type BloggersDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bloggerName: string
  onConfirm: () => void
}

export function BloggersDeleteDialog({
  open,
  onOpenChange,
  bloggerName,
  onConfirm,
}: BloggersDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除博主 <strong>{bloggerName}</strong> 吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 6: 创建博主管理页面**

Create `apps/admin/src/features/bloggers/index.tsx`:

```typescript
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getBloggers, createBlogger, updateBlogger, deleteBlogger } from '@/lib/api'
import { type Blogger, type BloggerFormValues } from './data/schema'
import { BloggersTable } from './components/bloggers-table'
import { BloggerForm } from './components/blogger-form'
import { BloggersDeleteDialog } from './components/bloggers-delete-dialog'

export default function BloggersPage() {
  const [bloggers, setBloggers] = useState<Blogger[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Blogger | null>(null)

  const fetchBloggers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getBloggers()
      setBloggers(data as Blogger[])
    } catch {
      toast.error('获取博主列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBloggers()
  }, [fetchBloggers])

  const handleCreate = async (data: BloggerFormValues) => {
    try {
      setIsSubmitting(true)
      await createBlogger(data)
      toast.success('创建成功')
      setCreateOpen(false)
      fetchBloggers()
    } catch {
      toast.error('创建失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (blogger: Blogger) => {
    try {
      await updateBlogger(blogger.id, { isActive: !blogger.isActive })
      toast.success(blogger.isActive ? '已停用' : '已启用')
      fetchBloggers()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteBlogger(deleteTarget.id)
      toast.success('删除成功')
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchBloggers()
    } catch {
      toast.error('删除失败')
    }
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>博主管理</h2>
            <p className='text-muted-foreground'>管理监控博主列表</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>添加博主</Button>
        </div>

        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <BloggersTable
            data={bloggers}
            onToggle={handleToggle}
            onDelete={(b) => { setDeleteTarget(b); setDeleteOpen(true) }}
          />
        )}
      </Main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>添加博主</DialogTitle>
            <DialogDescription>添加需要监控的评测博主。</DialogDescription>
          </DialogHeader>
          <BloggerForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>

      <BloggersDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        bloggerName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
      />
    </>
  )
}
```

- [ ] **Step 7: 创建路由文件**

Create `apps/admin/src/routes/_authenticated/bloggers/route.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import BloggersPage from '@/features/bloggers'

export const Route = createFileRoute('/_authenticated/bloggers')({
  component: BloggersPage,
})
```

- [ ] **Step 8: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/admin && git add -A && git commit -m "feat: add blogger management page with CRUD and toggle"
```

---

## Task 11: Admin 前端 — 爬虫管理页面

**Files:**
- Create: `apps/admin/src/routes/_authenticated/crawler/route.tsx`
- Create: `apps/admin/src/features/crawler/index.tsx`
- Create: `apps/admin/src/features/crawler/data/schema.ts`
- Create: `apps/admin/src/features/crawler/components/crawl-tasks-columns.tsx`
- Create: `apps/admin/src/features/crawler/components/crawl-tasks-table.tsx`
- Create: `apps/admin/src/features/crawler/components/frequency-config.tsx`

- [ ] **Step 1: 创建 Zod schema**

Create `apps/admin/src/features/crawler/data/schema.ts`:

```typescript
import { z } from 'zod'

export const crawlTaskSchema = z.object({
  id: z.string(),
  type: z.enum(['BLOGGER', 'KEYWORD']),
  targetId: z.string(),
  status: z.enum(['RUNNING', 'SUCCESS', 'FAILED']),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  videoCount: z.number(),
  errorMessage: z.string().nullable(),
})

export type CrawlTask = z.infer<typeof crawlTaskSchema>

export const taskTypeLabels: Record<string, string> = {
  BLOGGER: '博主抓取',
  KEYWORD: '关键词搜索',
}

export const taskStatusLabels: Record<string, string> = {
  RUNNING: '运行中',
  SUCCESS: '成功',
  FAILED: '失败',
}
```

- [ ] **Step 2: 创建表格列定义**

Create `apps/admin/src/features/crawler/components/crawl-tasks-columns.tsx`:

```typescript
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { type CrawlTask, taskTypeLabels, taskStatusLabels } from '../data/schema'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  RUNNING: 'default',
  SUCCESS: 'secondary',
  FAILED: 'destructive',
}

export const crawlTasksColumns: ColumnDef<CrawlTask>[] = [
  {
    accessorKey: 'type',
    header: '类型',
    cell: ({ row }) => {
      const type = row.getValue<string>('type')
      return <Badge variant='outline'>{taskTypeLabels[type] ?? type}</Badge>
    },
  },
  {
    accessorKey: 'targetId',
    header: '目标',
    cell: ({ row }) => (
      <span className='max-w-48 truncate'>{row.getValue<string>('targetId')}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue<string>('status')
      return (
        <Badge variant={statusVariant[status] ?? 'secondary'}>
          {taskStatusLabels[status] ?? status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'videoCount',
    header: '新视频数',
  },
  {
    accessorKey: 'startedAt',
    header: '开始时间',
    cell: ({ row }) => new Date(row.getValue<string>('startedAt')).toLocaleString(),
  },
  {
    accessorKey: 'finishedAt',
    header: '完成时间',
    cell: ({ row }) => {
      const val = row.getValue<string | null>('finishedAt')
      return val ? new Date(val).toLocaleString() : '—'
    },
  },
  {
    accessorKey: 'errorMessage',
    header: '错误信息',
    cell: ({ row }) => {
      const msg = row.getValue<string | null>('errorMessage')
      return msg ? (
        <span className='text-destructive max-w-48 truncate'>{msg}</span>
      ) : '—'
    },
  },
]
```

- [ ] **Step 3: 创建表格组件**

Create `apps/admin/src/features/crawler/components/crawl-tasks-table.tsx`:

```typescript
import { useState } from 'react'
import {
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { type CrawlTask } from '../data/schema'
import { crawlTasksColumns } from './crawl-tasks-columns'

type CrawlTasksTableProps = {
  data: CrawlTask[]
}

export function CrawlTasksTable({ data }: CrawlTasksTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const table = useReactTable({
    data,
    columns: crawlTasksColumns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='overflow-hidden rounded-md border'>
        <Table className='min-w-2xl'>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={crawlTasksColumns.length} className='h-24 text-center'>
                  暂无执行记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
```

- [ ] **Step 4: 创建频率配置组件**

Create `apps/admin/src/features/crawler/components/frequency-config.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCrawlFrequency, updateCrawlFrequency } from '@/lib/api'

export function FrequencyConfig() {
  const [frequency, setFrequency] = useState<number>(60)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCrawlFrequency()
      .then((data) => setFrequency(data.frequency))
      .catch(() => toast.error('获取频率配置失败'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (frequency < 1) {
      toast.error('频率不能小于 1 分钟')
      return
    }
    try {
      setSaving(true)
      await updateCrawlFrequency(frequency)
      toast.success('频率已更新')
    } catch {
      toast.error('更新失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>抓取频率</CardTitle>
        <CardDescription>设置爬虫自动抓取的间隔时间</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-muted-foreground'>每</span>
          <Input
            type='number'
            min={1}
            className='w-24'
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
          />
          <span className='text-sm text-muted-foreground'>分钟执行一次</span>
          <Button onClick={handleSave} disabled={saving} size='sm'>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: 创建爬虫管理页面**

Create `apps/admin/src/features/crawler/index.tsx`:

```typescript
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { getCrawlTasks, triggerCrawl } from '@/lib/api'
import { type CrawlTask } from './data/schema'
import { CrawlTasksTable } from './components/crawl-tasks-table'
import { FrequencyConfig } from './components/frequency-config'

export default function CrawlerPage() {
  const [tasks, setTasks] = useState<CrawlTask[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCrawlTasks()
      setTasks(data as CrawlTask[])
    } catch {
      toast.error('获取爬虫记录失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleTrigger = async () => {
    try {
      setTriggering(true)
      await triggerCrawl()
      toast.success('爬虫已触发，稍后刷新查看结果')
      setTimeout(fetchTasks, 3000)
    } catch {
      toast.error('触发失败')
    } finally {
      setTriggering(false)
    }
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>爬虫管理</h2>
            <p className='text-muted-foreground'>查看爬虫执行记录，管理抓取频率</p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={fetchTasks}>刷新</Button>
            <Button onClick={handleTrigger} disabled={triggering}>
              {triggering ? '触发中...' : '手动触发'}
            </Button>
          </div>
        </div>

        <FrequencyConfig />

        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <CrawlTasksTable data={tasks} />
        )}
      </Main>
    </>
  )
}
```

- [ ] **Step 6: 创建路由文件**

Create `apps/admin/src/routes/_authenticated/crawler/route.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import CrawlerPage from '@/features/crawler'

export const Route = createFileRoute('/_authenticated/crawler')({
  component: CrawlerPage,
})
```

- [ ] **Step 7: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/admin && git add -A && git commit -m "feat: add crawler management page with task list, manual trigger, and frequency config"
```

---

## Task 12: Admin 前端 — 视频列表页面

**Files:**
- Create: `apps/admin/src/routes/_authenticated/videos/route.tsx`
- Create: `apps/admin/src/features/videos/index.tsx`
- Create: `apps/admin/src/features/videos/data/schema.ts`
- Create: `apps/admin/src/features/videos/components/videos-columns.tsx`
- Create: `apps/admin/src/features/videos/components/videos-table.tsx`

- [ ] **Step 1: 创建 Zod schema**

Create `apps/admin/src/features/videos/data/schema.ts`:

```typescript
import { z } from 'zod'

export const videoSchema = z.object({
  id: z.string(),
  clubId: z.string().nullable(),
  clubName: z.string().nullable().optional(),
  platform: z.enum(['BILIBILI', 'DOUYIN']),
  externalId: z.string(),
  title: z.string(),
  coverUrl: z.string(),
  videoUrl: z.string(),
  authorName: z.string(),
  category: z.enum(['REVIEW', 'SENTIMENT']),
  aiParsed: z.boolean(),
  aiSentiment: z.string().nullable(),
  publishedAt: z.string(),
  createdAt: z.string(),
})

export type Video = z.infer<typeof videoSchema>

export const platformLabels: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
}

export const categoryLabels: Record<string, string> = {
  REVIEW: '评测',
  SENTIMENT: '舆情',
}
```

- [ ] **Step 2: 创建表格列定义**

Create `apps/admin/src/features/videos/components/videos-columns.tsx`:

```typescript
import { type ColumnDef } from '@tanstack/react-table'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { type Video, platformLabels, categoryLabels } from '../data/schema'

export const videosColumns: ColumnDef<Video>[] = [
  {
    accessorKey: 'title',
    header: '标题',
    cell: ({ row }) => (
      <a
        href={row.original.videoUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='flex items-center gap-1 font-medium hover:underline max-w-xs truncate'
      >
        {row.getValue<string>('title')}
        <ExternalLink className='h-3 w-3 shrink-0' />
      </a>
    ),
  },
  {
    accessorKey: 'platform',
    header: '平台',
    cell: ({ row }) => {
      const p = row.getValue<string>('platform')
      return <Badge variant='outline'>{platformLabels[p] ?? p}</Badge>
    },
  },
  {
    accessorKey: 'category',
    header: '分类',
    cell: ({ row }) => {
      const c = row.getValue<string>('category')
      return (
        <Badge variant={c === 'REVIEW' ? 'default' : 'secondary'}>
          {categoryLabels[c] ?? c}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'authorName',
    header: '作者',
  },
  {
    accessorKey: 'clubName',
    header: '关联俱乐部',
    cell: ({ row }) => row.original.clubName ?? '—',
  },
  {
    accessorKey: 'aiParsed',
    header: 'AI 解析',
    cell: ({ row }) => (
      <Badge variant={row.getValue<boolean>('aiParsed') ? 'default' : 'secondary'}>
        {row.getValue<boolean>('aiParsed') ? '已解析' : '未解析'}
      </Badge>
    ),
  },
  {
    accessorKey: 'publishedAt',
    header: '发布时间',
    cell: ({ row }) => new Date(row.getValue<string>('publishedAt')).toLocaleDateString(),
  },
]
```

- [ ] **Step 3: 创建表格组件**

Create `apps/admin/src/features/videos/components/videos-table.tsx`:

```typescript
import { useState } from 'react'
import {
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { type Video } from '../data/schema'
import { videosColumns } from './videos-columns'

type VideosTableProps = {
  data: Video[]
}

export function VideosTable({ data }: VideosTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const table = useReactTable({
    data,
    columns: videosColumns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='overflow-hidden rounded-md border'>
        <Table className='min-w-3xl'>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={videosColumns.length} className='h-24 text-center'>
                  暂无视频
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
```

- [ ] **Step 4: 创建视频列表页面**

Create `apps/admin/src/features/videos/index.tsx`:

```typescript
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getVideos } from '@/lib/api'
import { type Video } from './data/schema'
import { VideosTable } from './components/videos-table'

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<string>('')
  const [category, setCategory] = useState<string>('')

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (platform) params.platform = platform
      if (category) params.category = category
      const data = await getVideos(params)
      setVideos(data as Video[])
    } catch {
      toast.error('获取视频列表失败')
    } finally {
      setLoading(false)
    }
  }, [platform, category])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>视频列表</h2>
            <p className='text-muted-foreground'>查看爬虫抓取的视频数据</p>
          </div>
          <div className='flex gap-2'>
            <Select value={platform} onValueChange={(v) => setPlatform(v === 'all' ? '' : v)}>
              <SelectTrigger className='w-28'>
                <SelectValue placeholder='平台' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部平台</SelectItem>
                <SelectItem value='BILIBILI'>B站</SelectItem>
                <SelectItem value='DOUYIN'>抖音</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
              <SelectTrigger className='w-28'>
                <SelectValue placeholder='分类' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部分类</SelectItem>
                <SelectItem value='REVIEW'>评测</SelectItem>
                <SelectItem value='SENTIMENT'>舆情</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <VideosTable data={videos} />
        )}
      </Main>
    </>
  )
}
```

- [ ] **Step 5: 创建路由文件**

Create `apps/admin/src/routes/_authenticated/videos/route.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import VideosPage from '@/features/videos'

export const Route = createFileRoute('/_authenticated/videos')({
  component: VideosPage,
})
```

- [ ] **Step 6: Commit**

```bash
cd /Users/microud/Projects/delta-club-info/apps/admin && git add -A && git commit -m "feat: add video list page with platform and category filters"
```

---

## Task 13: 验证全流程

- [ ] **Step 1: 启动数据库**

```bash
cd /Users/microud/Projects/delta-club-info && make db-up
```

- [ ] **Step 2: 启动后端并检查启动日志**

```bash
cd /Users/microud/Projects/delta-club-info && pnpm --filter @delta-club/server run dev
```

Expected: 看到 `Crawler scheduled every 60 minutes` 日志，无报错。

- [ ] **Step 3: 启动前端并验证页面**

```bash
cd /Users/microud/Projects/delta-club-info && pnpm --filter @delta-club/admin run dev
```

验证：
- 侧边栏出现「博主管理」「爬虫管理」「视频列表」
- 博主管理：可以添加、启停、删除博主
- 爬虫管理：可以查看频率、修改频率、手动触发
- 视频列表：可以筛选平台和分类

- [ ] **Step 4: Commit 最终调整（如有）**

```bash
cd /Users/microud/Projects/delta-club-info && git add -A && git commit -m "fix: Stage 3 integration fixes"
```
