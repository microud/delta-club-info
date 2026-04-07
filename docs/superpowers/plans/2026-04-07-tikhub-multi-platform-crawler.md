# TikHub 多平台数据采集重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将爬虫模块从直接调用平台 API 重构为统一接入 TikHub，扩展至 5 个平台（B站、抖音、小红书、视频号、公众号），泛化 Video 模型为 Content，支持跨平台内容聚合。

**Architecture:** TikHubClient 统一封装 API 调用（认证、限流、重试），每平台一个 PlatformAdapter 做数据标准化。CrawlTask 表定义独立采集任务，CrawlTaskRun 记录执行结果。Content 单表通过 groupId/isPrimary/groupPlatforms 实现跨平台聚合。

**Tech Stack:** NestJS, Drizzle ORM, PostgreSQL, axios (TikHub HTTP), React + shadcn + TanStack (Admin)

---

## File Structure

### Database Schema (Create/Modify)
- Modify: `apps/server/src/database/schema/blogger.schema.ts` — 重写 platform enum，改造 bloggers 表，新增 bloggerAccounts 表
- Create: `apps/server/src/database/schema/content.schema.ts` — 替代 video.schema.ts
- Modify: `apps/server/src/database/schema/crawl-task.schema.ts` — 拆分为 crawlTasks（任务定义）+ crawlTaskRuns（执行记录）
- Modify: `apps/server/src/database/schema/club.schema.ts` — 新增 wechatMpGhid 字段
- Modify: `apps/server/src/database/schema/index.ts` — 更新导出

### Shared Types (Modify)
- Modify: `packages/shared/src/types.ts` — 新增 ContentDto、BloggerAccountDto 等
- Modify: `packages/shared/src/enums.ts` — 更新 Platform、ContentType、ContentCategory 枚举

### Crawler Module (Create/Modify)
- Create: `apps/server/src/crawler/tikhub.client.ts` — TikHub API 统一封装
- Create: `apps/server/src/crawler/adapters/platform-adapter.interface.ts` — 新接口
- Create: `apps/server/src/crawler/adapters/bilibili.adapter.ts` — 重写，基于 TikHub
- Create: `apps/server/src/crawler/adapters/douyin.adapter.ts` — 重写，基于 TikHub
- Create: `apps/server/src/crawler/adapters/xiaohongshu.adapter.ts` — 新增
- Create: `apps/server/src/crawler/adapters/wechat-channels.adapter.ts` — 新增
- Create: `apps/server/src/crawler/adapters/wechat-mp.adapter.ts` — 新增
- Modify: `apps/server/src/crawler/crawler.service.ts` — 重写采集编排逻辑
- Create: `apps/server/src/crawler/crawler-scheduler.service.ts` — 独立调度管理
- Modify: `apps/server/src/crawler/crawl-task.service.ts` — 适配新表结构
- Modify: `apps/server/src/crawler/crawler.module.ts` — 更新 providers

### Admin Backend (Modify)
- Modify: `apps/server/src/admin/bloggers/bloggers.service.ts` — 支持多账号
- Modify: `apps/server/src/admin/bloggers/bloggers.controller.ts` — 新增账号管理端点
- Create: `apps/server/src/admin/bloggers/dto/create-blogger.dto.ts` — 重写
- Create: `apps/server/src/admin/bloggers/dto/update-blogger.dto.ts` — 重写
- Create: `apps/server/src/admin/bloggers/dto/create-blogger-account.dto.ts` — 新增
- Create: `apps/server/src/admin/bloggers/dto/update-blogger-account.dto.ts` — 新增
- Create: `apps/server/src/admin/contents/contents.service.ts` — 替代 videos service
- Create: `apps/server/src/admin/contents/contents.controller.ts` — 替代 videos controller
- Modify: `apps/server/src/admin/crawl-tasks/crawl-tasks.service.ts` — 适配新表结构
- Modify: `apps/server/src/admin/crawl-tasks/crawl-tasks.controller.ts` — 适配新 API
- Modify: `apps/server/src/admin/admin.module.ts` — 更新注册

### Admin Frontend (Modify)
- Modify: `apps/admin/src/features/bloggers/` — 多账号管理 UI
- Create: `apps/admin/src/features/contents/` — 替代 videos
- Modify: `apps/admin/src/features/crawler/` — 适配新任务结构
- Modify: `apps/admin/src/lib/api.ts` — 新增/更新 API 函数
- Modify: `apps/admin/src/components/layout/data/sidebar-data.ts` — 更新导航
- Modify: `apps/admin/src/routes/_authenticated/` — 更新路由

### Client API (Modify)
- Modify: `apps/server/src/client/home/home.service.ts` — 支持多 Tab feed
- Modify: `apps/server/src/client/home/home.controller.ts` — 新增 category 参数
- Modify: `apps/server/src/client/videos/` → `contents/` — 重命名适配
- Modify: `apps/server/src/client/clubs/client-clubs.service.ts` — 关联内容改为 Content

---

## Task 1: 更新 Shared 枚举和类型

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: 更新枚举定义**

```typescript
// packages/shared/src/enums.ts — 替换 VideoPlatform, VideoCategory 相关枚举

// 替换原有的 VideoPlatform
export enum ContentPlatform {
  BILIBILI = 'BILIBILI',
  DOUYIN = 'DOUYIN',
  XIAOHONGSHU = 'XIAOHONGSHU',
  WECHAT_CHANNELS = 'WECHAT_CHANNELS',
  WECHAT_MP = 'WECHAT_MP',
}

export enum ContentType {
  VIDEO = 'VIDEO',
  NOTE = 'NOTE',
  ARTICLE = 'ARTICLE',
}

// 替换原有的 VideoCategory
export enum ContentCategory {
  REVIEW = 'REVIEW',
  SENTIMENT = 'SENTIMENT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

// 替换原有的 CrawlTaskType
export enum CrawlTaskType {
  BLOGGER_POSTS = 'BLOGGER_POSTS',
  KEYWORD_SEARCH = 'KEYWORD_SEARCH',
  MP_ARTICLES = 'MP_ARTICLES',
}

// CrawlTaskStatus 改为 CrawlTaskRunStatus
export enum CrawlTaskRunStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
```

保留原有的 `VideoPlatform`、`VideoCategory`、`CrawlTaskType`、`CrawlTaskStatus` 作为别名导出，避免破坏尚未更新的代码（后续任务逐步替换后删除）。

- [ ] **Step 2: 更新 shared types**

在 `packages/shared/src/types.ts` 中新增/替换：

```typescript
// 替换 BloggerDto
export interface BloggerDto {
  id: string
  name: string
  avatar: string | null
  isActive: boolean
  accounts: BloggerAccountDto[]
  createdAt: string
  updatedAt: string
}

export interface BloggerAccountDto {
  id: string
  bloggerId: string
  platform: string
  platformUserId: string
  platformUsername: string | null
  crawlCategories: string[]
  lastCrawledAt: string | null
  createdAt: string
  updatedAt: string
}

// 替换 VideoDto → ContentDto
export interface ContentDto {
  id: string
  platform: string
  contentType: string
  category: string
  externalId: string
  externalUrl: string | null
  title: string
  description: string | null
  coverUrl: string | null
  authorName: string | null
  publishedAt: string | null
  bloggerId: string | null
  bloggerName: string | null
  clubId: string | null
  clubName: string | null
  groupId: string | null
  isPrimary: boolean
  groupPlatforms: string[] | null
  aiParsed: boolean
  aiSummary: string | null
  aiSentiment: string | null
  aiClubMatch: string | null
  createdAt: string
  updatedAt: string
}

// 替换 CrawlTaskDto → 拆分为 CrawlTaskDto + CrawlTaskRunDto
export interface CrawlTaskDto {
  id: string
  taskType: string
  category: string
  platform: string
  targetId: string
  targetName?: string  // 冗余展示名（博主名/俱乐部名）
  cronExpression: string
  isActive: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CrawlTaskRunDto {
  id: string
  crawlTaskId: string
  status: string
  startedAt: string
  finishedAt: string | null
  itemsFetched: number
  itemsCreated: number
  errorMessage: string | null
}
```

- [ ] **Step 3: 构建验证**

Run: `cd /Users/microud/Projects/delta-club-info && pnpm --filter @delta-club/shared build`
Expected: 编译成功

- [ ] **Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat: update shared enums and types for multi-platform content model"
```

---

## Task 2: 数据库 Schema 变更 — 新增 Content 和 BloggerAccount

**Files:**
- Modify: `apps/server/src/database/schema/blogger.schema.ts`
- Create: `apps/server/src/database/schema/content.schema.ts`
- Modify: `apps/server/src/database/schema/crawl-task.schema.ts`
- Modify: `apps/server/src/database/schema/club.schema.ts`
- Modify: `apps/server/src/database/schema/index.ts`

- [ ] **Step 1: 重写 blogger.schema.ts**

```typescript
// apps/server/src/database/schema/blogger.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 扩展平台枚举（替换原 video_platform，需要 migration ALTER）
export const contentPlatformEnum = pgEnum('content_platform', [
  'BILIBILI',
  'DOUYIN',
  'XIAOHONGSHU',
  'WECHAT_CHANNELS',
  'WECHAT_MP',
]);

export const crawlCategoryEnum = pgEnum('crawl_category', [
  'REVIEW',
  'SENTIMENT',
]);

export const bloggers = pgTable('bloggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  avatar: varchar('avatar', { length: 1000 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const bloggerAccounts = pgTable(
  'blogger_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bloggerId: uuid('blogger_id')
      .notNull()
      .references(() => bloggers.id, { onDelete: 'cascade' }),
    platform: contentPlatformEnum('platform').notNull(),
    platformUserId: varchar('platform_user_id', { length: 200 }).notNull(),
    platformUsername: varchar('platform_username', { length: 200 }),
    crawlCategories: crawlCategoryEnum('crawl_categories')
      .array()
      .notNull()
      .default([]),
    lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('blogger_accounts_platform_user_id_idx').on(
      table.platform,
      table.platformUserId,
    ),
  ],
);
```

- [ ] **Step 2: 创建 content.schema.ts**

```typescript
// apps/server/src/database/schema/content.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';
import { bloggers, contentPlatformEnum } from './blogger.schema';

export const contentTypeEnum = pgEnum('content_type', [
  'VIDEO',
  'NOTE',
  'ARTICLE',
]);

export const contentCategoryEnum = pgEnum('content_category', [
  'REVIEW',
  'SENTIMENT',
  'ANNOUNCEMENT',
]);

export const aiSentimentEnum = pgEnum('ai_sentiment', [
  'POSITIVE',
  'NEGATIVE',
  'NEUTRAL',
]);

export const contents = pgTable(
  'contents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platform: contentPlatformEnum('platform').notNull(),
    contentType: contentTypeEnum('content_type').notNull(),
    category: contentCategoryEnum('category').notNull(),
    externalId: varchar('external_id', { length: 500 }).notNull(),
    externalUrl: varchar('external_url', { length: 1000 }),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    coverUrl: varchar('cover_url', { length: 1000 }),
    authorName: varchar('author_name', { length: 200 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    bloggerId: uuid('blogger_id').references(() => bloggers.id, {
      onDelete: 'set null',
    }),
    clubId: uuid('club_id').references(() => clubs.id, {
      onDelete: 'set null',
    }),
    groupId: uuid('group_id'),
    isPrimary: boolean('is_primary').notNull().default(true),
    groupPlatforms: contentPlatformEnum('group_platforms').array(),
    aiParsed: boolean('ai_parsed').notNull().default(false),
    aiClubMatch: varchar('ai_club_match', { length: 200 }),
    aiSummary: text('ai_summary'),
    aiSentiment: aiSentimentEnum('ai_sentiment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('contents_platform_external_id_idx').on(
      table.platform,
      table.externalId,
    ),
    index('contents_is_primary_idx').on(table.isPrimary),
    index('contents_group_id_idx').on(table.groupId),
    index('contents_category_idx').on(table.category),
    index('contents_published_at_idx').on(table.publishedAt),
  ],
);
```

- [ ] **Step 3: 重写 crawl-task.schema.ts**

```typescript
// apps/server/src/database/schema/crawl-task.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { contentPlatformEnum } from './blogger.schema';

export const crawlTaskTypeEnum = pgEnum('crawl_task_type_v2', [
  'BLOGGER_POSTS',
  'KEYWORD_SEARCH',
  'MP_ARTICLES',
]);

export const crawlTaskRunStatusEnum = pgEnum('crawl_task_run_status', [
  'RUNNING',
  'SUCCESS',
  'FAILED',
]);

export const crawlTasks = pgTable('crawl_tasks_v2', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskType: crawlTaskTypeEnum('task_type').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // REVIEW / SENTIMENT / ANNOUNCEMENT
  platform: contentPlatformEnum('platform').notNull(),
  targetId: varchar('target_id', { length: 500 }).notNull(),
  cronExpression: varchar('cron_expression', { length: 100 }).notNull().default('0 */1 * * *'),
  isActive: boolean('is_active').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const crawlTaskRuns = pgTable('crawl_task_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  crawlTaskId: uuid('crawl_task_id')
    .notNull()
    .references(() => crawlTasks.id, { onDelete: 'cascade' }),
  status: crawlTaskRunStatusEnum('status').notNull().default('RUNNING'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  itemsFetched: integer('items_fetched').notNull().default(0),
  itemsCreated: integer('items_created').notNull().default(0),
  errorMessage: text('error_message'),
});
```

注意：使用 `crawl_tasks_v2` 和 `crawl_task_type_v2` 避免与旧表/旧枚举冲突。旧表在 migration 中处理。

- [ ] **Step 4: 修改 club.schema.ts 新增 wechatMpGhid**

在 `clubs` 表定义中，`predecessorId` 之后新增：

```typescript
wechatMpGhid: varchar('wechat_mp_ghid', { length: 100 }),
```

- [ ] **Step 5: 更新 schema/index.ts**

```typescript
// 新增导出
export * from './content.schema';
// blogger.schema.ts 已包含 bloggerAccounts 导出
// crawl-task.schema.ts 已包含 crawlTaskRuns 导出
```

确保删除或保留旧的 video.schema.ts 导出（此阶段保留，后续迁移后删除）。

- [ ] **Step 6: 生成 Drizzle migration**

Run: `cd /Users/microud/Projects/delta-club-info/apps/server && npx drizzle-kit generate`
Expected: 生成新的 migration SQL 文件

- [ ] **Step 7: 审核生成的 migration SQL**

检查 migration 文件，确保：
- 新建 `contents` 表和相关枚举
- 新建 `blogger_accounts` 表
- 新建 `crawl_tasks_v2` 和 `crawl_task_runs` 表
- `clubs` 表新增 `wechat_mp_ghid` 列
- `bloggers` 表结构变更（移除 platform/externalId，新增 avatar/updatedAt）
- 不会误删旧表数据（旧表保留，后续手动迁移数据后再删）

如果 migration 有问题，手动编辑 SQL 修正。

- [ ] **Step 8: 执行 migration**

Run: `cd /Users/microud/Projects/delta-club-info/apps/server && npx drizzle-kit push`
Expected: migration 成功应用

- [ ] **Step 9: Commit**

```bash
git add apps/server/src/database/schema/ apps/server/drizzle/
git commit -m "feat: add content, blogger_accounts, crawl_tasks_v2 schemas and migration"
```

---

## Task 3: TikHubClient 统一 API 封装

**Files:**
- Create: `apps/server/src/crawler/tikhub.client.ts`

- [ ] **Step 1: 实现 TikHubClient**

```typescript
// apps/server/src/crawler/tikhub.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import axios, { AxiosInstance } from 'axios';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';

export interface TikHubResponse {
  code: number;
  data: unknown;
  message?: string;
}

@Injectable()
export class TikHubClient {
  private readonly logger = new Logger(TikHubClient.name);
  private client: AxiosInstance | null = null;
  private lastRequestTime = 0;
  private minInterval = 100; // 默认 100ms（10 req/s）

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private async getClient(): Promise<AxiosInstance> {
    if (this.client) return this.client;

    const configs = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, 'tikhub.apiKey'));

    const apiKey = configs[0]?.value;
    if (!apiKey) {
      throw new Error('TikHub API Key not configured in system_configs');
    }

    const baseUrlConfigs = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, 'tikhub.baseUrl'));
    const baseUrl = baseUrlConfigs[0]?.value || 'https://api.tikhub.io';

    const rateLimitConfigs = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, 'tikhub.rateLimit'));
    const rateLimit = parseInt(rateLimitConfigs[0]?.value || '10', 10);
    this.minInterval = Math.ceil(1000 / rateLimit);

    this.client = axios.create({
      baseURL: baseUrl,
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });

    return this.client;
  }

  /** 重置 client（API Key 变更后调用） */
  resetClient() {
    this.client = null;
  }

  private async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private async request<T = unknown>(
    method: 'get' | 'post',
    url: string,
    params?: Record<string, unknown>,
    data?: Record<string, unknown>,
    retries = 3,
  ): Promise<T> {
    await this.throttle();
    const client = await this.getClient();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await client.request({ method, url, params, data });
        return response.data as T;
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 429 && attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        if (status >= 500 && attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(`Server error ${status}, retrying in ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        this.logger.error(`TikHub request failed: ${method.toUpperCase()} ${url}`, error?.message);
        throw error;
      }
    }
    throw new Error('Unreachable');
  }

  // ── 抖音 ──
  fetchDouyinUserPosts(secUserId: string, maxCursor?: number, count = 20) {
    return this.request('get', '/api/v1/douyin/app/v3/fetch_user_post_videos', {
      sec_user_id: secUserId,
      max_cursor: maxCursor ?? 0,
      count,
    });
  }

  searchDouyinVideos(keyword: string, cursor = 0, sortType = '2') {
    return this.request('post', '/api/v1/douyin/search/fetch_video_search_v2', undefined, {
      keyword,
      cursor,
      sort_type: sortType, // 2 = 最新发布
      publish_time: '7', // 最近一周
    });
  }

  // ── B站 ──
  fetchBilibiliUserPosts(uid: string, page = 1) {
    return this.request('get', '/api/v1/bilibili/web/fetch_user_post_videos', {
      uid,
      pn: page,
      order: 'pubdate',
    });
  }

  searchBilibiliVideos(keyword: string, page = 1, pageSize = 20) {
    return this.request('get', '/api/v1/bilibili/web/fetch_general_search', {
      keyword,
      page,
      page_size: pageSize,
      order: 'pubdate',
    });
  }

  // ── 小红书 ──
  fetchXiaohongshuUserNotes(userId: string, cursor?: string) {
    return this.request('get', '/api/v1/xiaohongshu/web_v3/fetch_user_notes', {
      user_id: userId,
      cursor,
      num: 30,
    });
  }

  searchXiaohongshuNotes(keyword: string, page = 1) {
    return this.request('get', '/api/v1/xiaohongshu/web_v3/fetch_search_notes', {
      keyword,
      page,
      sort: 'time_descending',
    });
  }

  // ── 视频号 ──
  fetchWechatChannelsUserPosts(username: string, lastBuffer?: string) {
    return this.request('post', '/api/v1/wechat_channels/fetch_home_page', undefined, {
      username,
      last_buffer: lastBuffer,
    });
  }

  searchWechatChannelsVideos(keywords: string) {
    return this.request('get', '/api/v1/wechat_channels/fetch_search_latest', {
      keywords,
    });
  }

  // ── 公众号 ──
  fetchWechatMpArticles(ghid: string, offset = 0) {
    return this.request('get', '/api/v1/wechat_mp/web/fetch_mp_article_list', {
      ghid,
      offset,
    });
  }
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /Users/microud/Projects/delta-club-info/apps/server && npx tsc --noEmit`
Expected: 无编译错误（可能有其他模块的错误，只要 tikhub.client.ts 本身无错）

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/crawler/tikhub.client.ts
git commit -m "feat: add TikHubClient with rate limiting and retry"
```

---

## Task 4: PlatformAdapter 接口和 5 个实现

**Files:**
- Create: `apps/server/src/crawler/adapters/platform-adapter.interface.ts`
- Create: `apps/server/src/crawler/adapters/bilibili.adapter.ts` (重写)
- Create: `apps/server/src/crawler/adapters/douyin.adapter.ts` (重写)
- Create: `apps/server/src/crawler/adapters/xiaohongshu.adapter.ts`
- Create: `apps/server/src/crawler/adapters/wechat-channels.adapter.ts`
- Create: `apps/server/src/crawler/adapters/wechat-mp.adapter.ts`

- [ ] **Step 1: 定义 PlatformAdapter 接口**

```typescript
// apps/server/src/crawler/adapters/platform-adapter.interface.ts

export interface RawContent {
  platform: string;
  externalId: string;
  externalUrl: string | null;
  contentType: 'VIDEO' | 'NOTE' | 'ARTICLE';
  title: string;
  description: string | null;
  coverUrl: string | null;
  authorName: string | null;
  authorPlatformId: string | null;
  publishedAt: Date | null;
}

export interface PlatformAdapter {
  platform: string;
  normalizeUserPosts(raw: unknown): RawContent[];
  normalizeSearchResults(raw: unknown): RawContent[];
}
```

- [ ] **Step 2: 实现 BilibiliAdapter**

```typescript
// apps/server/src/crawler/adapters/bilibili.adapter.ts
import { Injectable } from '@nestjs/common';
import { PlatformAdapter, RawContent } from './platform-adapter.interface';

@Injectable()
export class BilibiliAdapter implements PlatformAdapter {
  platform = 'BILIBILI';

  normalizeUserPosts(raw: any): RawContent[] {
    const list = raw?.data?.list?.vlist || raw?.data?.list || [];
    if (!Array.isArray(list)) return [];

    return list.map((item: any) => ({
      platform: this.platform,
      externalId: String(item.bvid || item.aid),
      externalUrl: item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : null,
      contentType: 'VIDEO' as const,
      title: item.title || '',
      description: item.description || item.desc || null,
      coverUrl: item.pic ? (item.pic.startsWith('//') ? `https:${item.pic}` : item.pic) : null,
      authorName: item.author || item.owner?.name || null,
      authorPlatformId: String(item.mid || item.owner?.mid || ''),
      publishedAt: item.created ? new Date(item.created * 1000) : null,
    }));
  }

  normalizeSearchResults(raw: any): RawContent[] {
    const list = raw?.data?.result || [];
    if (!Array.isArray(list)) return [];

    return list
      .filter((item: any) => item.type === 'video' || item.bvid)
      .map((item: any) => ({
        platform: this.platform,
        externalId: String(item.bvid || item.aid),
        externalUrl: item.bvid ? `https://www.bilibili.com/video/${item.bvid}` : null,
        contentType: 'VIDEO' as const,
        title: (item.title || '').replace(/<[^>]*>/g, ''), // 去除高亮 HTML 标签
        description: item.description || null,
        coverUrl: item.pic ? (item.pic.startsWith('//') ? `https:${item.pic}` : item.pic) : null,
        authorName: item.author || null,
        authorPlatformId: String(item.mid || ''),
        publishedAt: item.pubdate ? new Date(item.pubdate * 1000) : null,
      }));
  }
}
```

- [ ] **Step 3: 实现 DouyinAdapter**

```typescript
// apps/server/src/crawler/adapters/douyin.adapter.ts
import { Injectable } from '@nestjs/common';
import { PlatformAdapter, RawContent } from './platform-adapter.interface';

@Injectable()
export class DouyinAdapter implements PlatformAdapter {
  platform = 'DOUYIN';

  normalizeUserPosts(raw: any): RawContent[] {
    const list = raw?.data?.aweme_list || raw?.data?.data || [];
    if (!Array.isArray(list)) return [];

    return list.map((item: any) => ({
      platform: this.platform,
      externalId: String(item.aweme_id),
      externalUrl: `https://www.douyin.com/video/${item.aweme_id}`,
      contentType: 'VIDEO' as const,
      title: item.desc || item.title || '',
      description: item.desc || null,
      coverUrl: item.video?.cover?.url_list?.[0] || item.video?.origin_cover?.url_list?.[0] || null,
      authorName: item.author?.nickname || null,
      authorPlatformId: item.author?.sec_uid || String(item.author?.uid || ''),
      publishedAt: item.create_time ? new Date(item.create_time * 1000) : null,
    }));
  }

  normalizeSearchResults(raw: any): RawContent[] {
    const list = raw?.data?.data || raw?.data?.aweme_list || [];
    if (!Array.isArray(list)) return [];

    return list
      .filter((item: any) => item.aweme_info || item.aweme_id)
      .map((item: any) => {
        const aweme = item.aweme_info || item;
        return {
          platform: this.platform,
          externalId: String(aweme.aweme_id),
          externalUrl: `https://www.douyin.com/video/${aweme.aweme_id}`,
          contentType: 'VIDEO' as const,
          title: aweme.desc || aweme.title || '',
          description: aweme.desc || null,
          coverUrl: aweme.video?.cover?.url_list?.[0] || null,
          authorName: aweme.author?.nickname || null,
          authorPlatformId: aweme.author?.sec_uid || '',
          publishedAt: aweme.create_time ? new Date(aweme.create_time * 1000) : null,
        };
      });
  }
}
```

- [ ] **Step 4: 实现 XiaohongshuAdapter**

```typescript
// apps/server/src/crawler/adapters/xiaohongshu.adapter.ts
import { Injectable } from '@nestjs/common';
import { PlatformAdapter, RawContent } from './platform-adapter.interface';

@Injectable()
export class XiaohongshuAdapter implements PlatformAdapter {
  platform = 'XIAOHONGSHU';

  private mapContentType(item: any): 'VIDEO' | 'NOTE' {
    if (item.type === 'video' || item.note_type === 'video') return 'VIDEO';
    return 'NOTE';
  }

  normalizeUserPosts(raw: any): RawContent[] {
    const list = raw?.data?.notes || raw?.data?.items || [];
    if (!Array.isArray(list)) return [];

    return list.map((item: any) => ({
      platform: this.platform,
      externalId: String(item.note_id || item.id),
      externalUrl: `https://www.xiaohongshu.com/explore/${item.note_id || item.id}`,
      contentType: this.mapContentType(item),
      title: item.display_title || item.title || '',
      description: item.desc || null,
      coverUrl: item.cover?.url || item.cover?.info_list?.[0]?.url || null,
      authorName: item.user?.nickname || item.user?.nick_name || null,
      authorPlatformId: item.user?.user_id || item.user?.id || '',
      publishedAt: item.time ? new Date(item.time * 1000) : null,
    }));
  }

  normalizeSearchResults(raw: any): RawContent[] {
    const list = raw?.data?.items || raw?.data?.notes || [];
    if (!Array.isArray(list)) return [];

    return list
      .filter((item: any) => item.note_card || item.note_id)
      .map((wrapper: any) => {
        const item = wrapper.note_card || wrapper;
        return {
          platform: this.platform,
          externalId: String(wrapper.id || item.note_id || item.id),
          externalUrl: `https://www.xiaohongshu.com/explore/${wrapper.id || item.note_id || item.id}`,
          contentType: this.mapContentType(item),
          title: item.display_title || item.title || '',
          description: item.desc || null,
          coverUrl: item.cover?.url || item.cover?.info_list?.[0]?.url || null,
          authorName: item.user?.nickname || item.user?.nick_name || null,
          authorPlatformId: item.user?.user_id || item.user?.id || '',
          publishedAt: item.time ? new Date(item.time * 1000) : null,
        };
      });
  }
}
```

- [ ] **Step 5: 实现 WechatChannelsAdapter**

```typescript
// apps/server/src/crawler/adapters/wechat-channels.adapter.ts
import { Injectable } from '@nestjs/common';
import { PlatformAdapter, RawContent } from './platform-adapter.interface';

@Injectable()
export class WechatChannelsAdapter implements PlatformAdapter {
  platform = 'WECHAT_CHANNELS';

  normalizeUserPosts(raw: any): RawContent[] {
    const list = raw?.data?.object_list || raw?.data?.objects || [];
    if (!Array.isArray(list)) return [];

    return list.map((item: any) => {
      const obj = item.object_info || item;
      return {
        platform: this.platform,
        externalId: String(obj.id || obj.export_id || item.id),
        externalUrl: null, // 视频号无直接 web URL
        contentType: 'VIDEO' as const,
        title: obj.description || obj.desc || '',
        description: obj.description || obj.desc || null,
        coverUrl: obj.cover_url || obj.media?.cover_url || null,
        authorName: obj.nickname || item.nickname || null,
        authorPlatformId: obj.username || item.username || '',
        publishedAt: obj.create_time ? new Date(obj.create_time * 1000) : null,
      };
    });
  }

  normalizeSearchResults(raw: any): RawContent[] {
    // 搜索结果结构与用户视频类似
    return this.normalizeUserPosts(raw);
  }
}
```

- [ ] **Step 6: 实现 WechatMpAdapter**

```typescript
// apps/server/src/crawler/adapters/wechat-mp.adapter.ts
import { Injectable } from '@nestjs/common';
import { PlatformAdapter, RawContent } from './platform-adapter.interface';

@Injectable()
export class WechatMpAdapter implements PlatformAdapter {
  platform = 'WECHAT_MP';

  normalizeUserPosts(raw: any): RawContent[] {
    const list = raw?.data?.general_msg_list || raw?.data?.app_msg_list || [];
    const articles = Array.isArray(list) ? list : [];

    return articles.map((item: any) => {
      const info = item.app_msg_ext_info || item;
      return {
        platform: this.platform,
        externalId: String(info.fileid || info.content_url || item.comm_msg_info?.id || ''),
        externalUrl: info.content_url || null,
        contentType: 'ARTICLE' as const,
        title: info.title || '',
        description: info.digest || null,
        coverUrl: info.cover || null,
        authorName: info.author || null,
        authorPlatformId: '', // 公众号文章无独立作者 ID
        publishedAt: item.comm_msg_info?.datetime
          ? new Date(item.comm_msg_info.datetime * 1000)
          : null,
      };
    });
  }

  normalizeSearchResults(_raw: unknown): RawContent[] {
    // 公众号不支持搜索
    return [];
  }
}
```

- [ ] **Step 7: 删除旧的 adapter 文件**

删除旧的直接调用 B 站 API 的 adapter：
- `apps/server/src/crawler/adapters/crawler-adapter.interface.ts`（被新 platform-adapter.interface.ts 替代）
- 旧的 `apps/server/src/crawler/adapters/bilibili.adapter.ts`（已重写）
- 旧的 `apps/server/src/crawler/adapters/douyin.adapter.ts`（已重写）

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/crawler/adapters/
git commit -m "feat: add PlatformAdapter interface and 5 platform implementations via TikHub"
```

---

## Task 5: 重写 CrawlerService 和新增 CrawlerSchedulerService

**Files:**
- Modify: `apps/server/src/crawler/crawler.service.ts`
- Create: `apps/server/src/crawler/crawler-scheduler.service.ts`
- Modify: `apps/server/src/crawler/crawl-task.service.ts`
- Modify: `apps/server/src/crawler/crawler.module.ts`

- [ ] **Step 1: 重写 crawl-task.service.ts**

```typescript
// apps/server/src/crawler/crawl-task.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';

@Injectable()
export class CrawlTaskService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getActiveTasks() {
    return this.db
      .select()
      .from(schema.crawlTasks)
      .where(eq(schema.crawlTasks.isActive, true));
  }

  async createRun(crawlTaskId: string) {
    const [run] = await this.db
      .insert(schema.crawlTaskRuns)
      .values({ crawlTaskId })
      .returning();
    return run;
  }

  async finishRun(
    runId: string,
    result: { status: 'SUCCESS' | 'FAILED'; itemsFetched: number; itemsCreated: number; errorMessage?: string },
  ) {
    await this.db
      .update(schema.crawlTaskRuns)
      .set({
        status: result.status,
        finishedAt: new Date(),
        itemsFetched: result.itemsFetched,
        itemsCreated: result.itemsCreated,
        errorMessage: result.errorMessage,
      })
      .where(eq(schema.crawlTaskRuns.id, runId));
  }

  async updateTaskLastRun(taskId: string) {
    await this.db
      .update(schema.crawlTasks)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.crawlTasks.id, taskId));
  }
}
```

- [ ] **Step 2: 重写 crawler.service.ts**

```typescript
// apps/server/src/crawler/crawler.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { TikHubClient } from './tikhub.client';
import { CrawlTaskService } from './crawl-task.service';
import { PlatformAdapter, RawContent } from './adapters/platform-adapter.interface';
import { BilibiliAdapter } from './adapters/bilibili.adapter';
import { DouyinAdapter } from './adapters/douyin.adapter';
import { XiaohongshuAdapter } from './adapters/xiaohongshu.adapter';
import { WechatChannelsAdapter } from './adapters/wechat-channels.adapter';
import { WechatMpAdapter } from './adapters/wechat-mp.adapter';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly adapters: Map<string, PlatformAdapter>;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly tikHub: TikHubClient,
    private readonly crawlTaskService: CrawlTaskService,
    private readonly bilibiliAdapter: BilibiliAdapter,
    private readonly douyinAdapter: DouyinAdapter,
    private readonly xiaohongshuAdapter: XiaohongshuAdapter,
    private readonly wechatChannelsAdapter: WechatChannelsAdapter,
    private readonly wechatMpAdapter: WechatMpAdapter,
  ) {
    this.adapters = new Map([
      ['BILIBILI', bilibiliAdapter],
      ['DOUYIN', douyinAdapter],
      ['XIAOHONGSHU', xiaohongshuAdapter],
      ['WECHAT_CHANNELS', wechatChannelsAdapter],
      ['WECHAT_MP', wechatMpAdapter],
    ]);
  }

  async executeTask(taskId: string) {
    const [task] = await this.db
      .select()
      .from(schema.crawlTasks)
      .where(eq(schema.crawlTasks.id, taskId));

    if (!task || !task.isActive) return;

    const run = await this.crawlTaskService.createRun(task.id);

    try {
      let rawContents: RawContent[] = [];

      switch (task.taskType) {
        case 'BLOGGER_POSTS':
          rawContents = await this.fetchBloggerPosts(task);
          break;
        case 'KEYWORD_SEARCH':
          rawContents = await this.searchByKeyword(task);
          break;
        case 'MP_ARTICLES':
          rawContents = await this.fetchMpArticles(task);
          break;
      }

      const created = await this.saveContents(rawContents, task.category);

      await this.crawlTaskService.finishRun(run.id, {
        status: 'SUCCESS',
        itemsFetched: rawContents.length,
        itemsCreated: created,
      });
      await this.crawlTaskService.updateTaskLastRun(task.id);

      this.logger.log(`Task ${task.id} completed: ${rawContents.length} fetched, ${created} created`);
    } catch (error: any) {
      this.logger.error(`Task ${task.id} failed: ${error.message}`);
      await this.crawlTaskService.finishRun(run.id, {
        status: 'FAILED',
        itemsFetched: 0,
        itemsCreated: 0,
        errorMessage: error.message,
      });
    }
  }

  private async fetchBloggerPosts(task: typeof schema.crawlTasks.$inferSelect): Promise<RawContent[]> {
    // targetId = BloggerAccount ID
    const [account] = await this.db
      .select()
      .from(schema.bloggerAccounts)
      .where(eq(schema.bloggerAccounts.id, task.targetId));

    if (!account) return [];

    const adapter = this.adapters.get(task.platform);
    if (!adapter) return [];

    let raw: unknown;
    switch (task.platform) {
      case 'BILIBILI':
        raw = await this.tikHub.fetchBilibiliUserPosts(account.platformUserId);
        break;
      case 'DOUYIN':
        raw = await this.tikHub.fetchDouyinUserPosts(account.platformUserId);
        break;
      case 'XIAOHONGSHU':
        raw = await this.tikHub.fetchXiaohongshuUserNotes(account.platformUserId);
        break;
      case 'WECHAT_CHANNELS':
        raw = await this.tikHub.fetchWechatChannelsUserPosts(account.platformUserId);
        break;
      default:
        return [];
    }

    // 更新 lastCrawledAt
    await this.db
      .update(schema.bloggerAccounts)
      .set({ lastCrawledAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.bloggerAccounts.id, account.id));

    return adapter.normalizeUserPosts(raw);
  }

  private async searchByKeyword(task: typeof schema.crawlTasks.$inferSelect): Promise<RawContent[]> {
    // targetId = Club ID
    const [club] = await this.db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.id, task.targetId));

    if (!club) return [];

    const adapter = this.adapters.get(task.platform);
    if (!adapter) return [];

    let raw: unknown;
    switch (task.platform) {
      case 'BILIBILI':
        raw = await this.tikHub.searchBilibiliVideos(club.name);
        break;
      case 'DOUYIN':
        raw = await this.tikHub.searchDouyinVideos(club.name);
        break;
      case 'XIAOHONGSHU':
        raw = await this.tikHub.searchXiaohongshuNotes(club.name);
        break;
      case 'WECHAT_CHANNELS':
        raw = await this.tikHub.searchWechatChannelsVideos(club.name);
        break;
      default:
        return [];
    }

    return adapter.normalizeSearchResults(raw);
  }

  private async fetchMpArticles(task: typeof schema.crawlTasks.$inferSelect): Promise<RawContent[]> {
    // targetId = Club ID
    const [club] = await this.db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.id, task.targetId));

    if (!club?.wechatMpGhid) return [];

    const raw = await this.tikHub.fetchWechatMpArticles(club.wechatMpGhid);
    return this.wechatMpAdapter.normalizeUserPosts(raw);
  }

  private async saveContents(rawContents: RawContent[], category: string): Promise<number> {
    let created = 0;

    for (const raw of rawContents) {
      try {
        const result = await this.db
          .insert(schema.contents)
          .values({
            platform: raw.platform as any,
            contentType: raw.contentType as any,
            category: category as any,
            externalId: raw.externalId,
            externalUrl: raw.externalUrl,
            title: raw.title,
            description: raw.description,
            coverUrl: raw.coverUrl,
            authorName: raw.authorName,
            publishedAt: raw.publishedAt,
          })
          .onConflictDoNothing({
            target: [schema.contents.platform, schema.contents.externalId],
          })
          .returning({ id: schema.contents.id });

        if (result.length > 0) created++;
      } catch (error: any) {
        this.logger.warn(`Failed to save content ${raw.externalId}: ${error.message}`);
      }
    }

    return created;
  }
}
```

- [ ] **Step 3: 创建 crawler-scheduler.service.ts**

```typescript
// apps/server/src/crawler/crawler-scheduler.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CrawlerService } from './crawler.service';
import { CrawlTaskService } from './crawl-task.service';

@Injectable()
export class CrawlerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerSchedulerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly crawlerService: CrawlerService,
    private readonly crawlTaskService: CrawlTaskService,
  ) {}

  async onModuleInit() {
    await this.loadAllTasks();
  }

  async loadAllTasks() {
    const tasks = await this.crawlTaskService.getActiveTasks();
    this.logger.log(`Loading ${tasks.length} active crawl tasks`);

    for (const task of tasks) {
      this.registerTask(task.id, task.cronExpression);
    }
  }

  registerTask(taskId: string, cronExpression: string) {
    const jobName = `crawl-${taskId}`;

    // 先删除已有的同名 job
    this.unregisterTask(taskId);

    const job = new CronJob(cronExpression, () => {
      this.crawlerService.executeTask(taskId).catch((err) => {
        this.logger.error(`Scheduled task ${taskId} failed: ${err.message}`);
      });
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
    this.logger.log(`Registered task ${taskId} with cron: ${cronExpression}`);
  }

  unregisterTask(taskId: string) {
    const jobName = `crawl-${taskId}`;
    try {
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
      }
    } catch {
      // Job doesn't exist, ignore
    }
  }

  updateTaskSchedule(taskId: string, cronExpression: string) {
    this.registerTask(taskId, cronExpression);
  }
}
```

- [ ] **Step 4: 更新 crawler.module.ts**

```typescript
// apps/server/src/crawler/crawler.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlerService } from './crawler.service';
import { CrawlerSchedulerService } from './crawler-scheduler.service';
import { CrawlTaskService } from './crawl-task.service';
import { TikHubClient } from './tikhub.client';
import { BilibiliAdapter } from './adapters/bilibili.adapter';
import { DouyinAdapter } from './adapters/douyin.adapter';
import { XiaohongshuAdapter } from './adapters/xiaohongshu.adapter';
import { WechatChannelsAdapter } from './adapters/wechat-channels.adapter';
import { WechatMpAdapter } from './adapters/wechat-mp.adapter';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    CrawlerService,
    CrawlerSchedulerService,
    CrawlTaskService,
    TikHubClient,
    BilibiliAdapter,
    DouyinAdapter,
    XiaohongshuAdapter,
    WechatChannelsAdapter,
    WechatMpAdapter,
  ],
  exports: [CrawlerService, CrawlTaskService, CrawlerSchedulerService],
})
export class CrawlerModule {}
```

- [ ] **Step 5: 验证编译**

Run: `cd /Users/microud/Projects/delta-club-info/apps/server && npx tsc --noEmit`
Expected: 无编译错误

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/crawler/
git commit -m "feat: rewrite crawler service with TikHub integration and scheduler"
```

---

## Task 6: Admin 后端 — 博主管理支持多账号

**Files:**
- Modify: `apps/server/src/admin/bloggers/bloggers.service.ts`
- Modify: `apps/server/src/admin/bloggers/bloggers.controller.ts`
- Modify: `apps/server/src/admin/bloggers/dto/create-blogger.dto.ts`
- Modify: `apps/server/src/admin/bloggers/dto/update-blogger.dto.ts`
- Create: `apps/server/src/admin/bloggers/dto/create-blogger-account.dto.ts`
- Create: `apps/server/src/admin/bloggers/dto/update-blogger-account.dto.ts`

- [ ] **Step 1: 更新 DTOs**

```typescript
// dto/create-blogger.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class CreateBloggerDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  avatar?: string;
}
```

```typescript
// dto/update-blogger.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateBloggerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```

```typescript
// dto/create-blogger-account.dto.ts
import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';

export class CreateBloggerAccountDto {
  @IsEnum(['BILIBILI', 'DOUYIN', 'XIAOHONGSHU', 'WECHAT_CHANNELS'])
  platform: string;

  @IsString()
  platformUserId: string;

  @IsString()
  @IsOptional()
  platformUsername?: string;

  @IsArray()
  @IsEnum(['REVIEW', 'SENTIMENT'], { each: true })
  crawlCategories: string[];
}
```

```typescript
// dto/update-blogger-account.dto.ts
import { IsString, IsArray, IsEnum, IsOptional } from 'class-validator';

export class UpdateBloggerAccountDto {
  @IsString()
  @IsOptional()
  platformUsername?: string;

  @IsArray()
  @IsEnum(['REVIEW', 'SENTIMENT'], { each: true })
  @IsOptional()
  crawlCategories?: string[];
}
```

- [ ] **Step 2: 重写 bloggers.service.ts**

```typescript
// apps/server/src/admin/bloggers/bloggers.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateBloggerDto } from './dto/create-blogger.dto';
import { UpdateBloggerDto } from './dto/update-blogger.dto';
import { CreateBloggerAccountDto } from './dto/create-blogger-account.dto';
import { UpdateBloggerAccountDto } from './dto/update-blogger-account.dto';

@Injectable()
export class BloggersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    const bloggerRows = await this.db
      .select()
      .from(schema.bloggers)
      .orderBy(desc(schema.bloggers.createdAt));

    const bloggerIds = bloggerRows.map((b) => b.id);
    if (bloggerIds.length === 0) return [];

    const accounts = await this.db
      .select()
      .from(schema.bloggerAccounts);

    // Group accounts by bloggerId
    const accountMap = new Map<string, typeof accounts>();
    for (const acc of accounts) {
      const list = accountMap.get(acc.bloggerId) || [];
      list.push(acc);
      accountMap.set(acc.bloggerId, list);
    }

    return bloggerRows.map((b) => ({
      ...b,
      accounts: accountMap.get(b.id) || [],
    }));
  }

  async create(dto: CreateBloggerDto) {
    const [blogger] = await this.db
      .insert(schema.bloggers)
      .values({ name: dto.name, avatar: dto.avatar })
      .returning();
    return { ...blogger, accounts: [] };
  }

  async update(id: string, dto: UpdateBloggerDto) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) values.name = dto.name;
    if (dto.avatar !== undefined) values.avatar = dto.avatar;
    if (dto.isActive !== undefined) values.isActive = dto.isActive;

    const [updated] = await this.db
      .update(schema.bloggers)
      .set(values)
      .where(eq(schema.bloggers.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Blogger not found');
    return updated;
  }

  async remove(id: string) {
    await this.db.delete(schema.bloggers).where(eq(schema.bloggers.id, id));
  }

  // ── Account CRUD ──

  async addAccount(bloggerId: string, dto: CreateBloggerAccountDto) {
    const [account] = await this.db
      .insert(schema.bloggerAccounts)
      .values({
        bloggerId,
        platform: dto.platform as any,
        platformUserId: dto.platformUserId,
        platformUsername: dto.platformUsername,
        crawlCategories: dto.crawlCategories as any,
      })
      .returning();
    return account;
  }

  async updateAccount(accountId: string, dto: UpdateBloggerAccountDto) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.platformUsername !== undefined) values.platformUsername = dto.platformUsername;
    if (dto.crawlCategories !== undefined) values.crawlCategories = dto.crawlCategories;

    const [updated] = await this.db
      .update(schema.bloggerAccounts)
      .set(values)
      .where(eq(schema.bloggerAccounts.id, accountId))
      .returning();

    if (!updated) throw new NotFoundException('Account not found');
    return updated;
  }

  async removeAccount(accountId: string) {
    await this.db
      .delete(schema.bloggerAccounts)
      .where(eq(schema.bloggerAccounts.id, accountId));
  }
}
```

- [ ] **Step 3: 重写 bloggers.controller.ts**

```typescript
// apps/server/src/admin/bloggers/bloggers.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { BloggersService } from './bloggers.service';
import { CreateBloggerDto } from './dto/create-blogger.dto';
import { UpdateBloggerDto } from './dto/update-blogger.dto';
import { CreateBloggerAccountDto } from './dto/create-blogger-account.dto';
import { UpdateBloggerAccountDto } from './dto/update-blogger-account.dto';

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

  // ── Account endpoints ──

  @Post(':id/accounts')
  addAccount(@Param('id') bloggerId: string, @Body() dto: CreateBloggerAccountDto) {
    return this.bloggersService.addAccount(bloggerId, dto);
  }

  @Patch('accounts/:accountId')
  updateAccount(@Param('accountId') accountId: string, @Body() dto: UpdateBloggerAccountDto) {
    return this.bloggersService.updateAccount(accountId, dto);
  }

  @Delete('accounts/:accountId')
  removeAccount(@Param('accountId') accountId: string) {
    return this.bloggersService.removeAccount(accountId);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/admin/bloggers/
git commit -m "feat: update blogger admin to support multi-platform accounts"
```

---

## Task 7: Admin 后端 — 内容管理（替代视频管理）+ 爬虫管理更新

**Files:**
- Create: `apps/server/src/admin/contents/contents.service.ts`
- Create: `apps/server/src/admin/contents/contents.controller.ts`
- Modify: `apps/server/src/admin/crawl-tasks/crawl-tasks.service.ts`
- Modify: `apps/server/src/admin/crawl-tasks/crawl-tasks.controller.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 创建 contents.service.ts**

```typescript
// apps/server/src/admin/contents/contents.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, and, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AdminContentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(filters: {
    platform?: string;
    contentType?: string;
    category?: string;
    aiParsed?: string;
    hasClub?: string;
  }) {
    const conditions: SQL[] = [];

    if (filters.platform) {
      conditions.push(eq(schema.contents.platform, filters.platform as any));
    }
    if (filters.contentType) {
      conditions.push(eq(schema.contents.contentType, filters.contentType as any));
    }
    if (filters.category) {
      conditions.push(eq(schema.contents.category, filters.category as any));
    }
    if (filters.aiParsed === 'true') {
      conditions.push(eq(schema.contents.aiParsed, true));
    } else if (filters.aiParsed === 'false') {
      conditions.push(eq(schema.contents.aiParsed, false));
    }

    const rows = await this.db
      .select({
        id: schema.contents.id,
        platform: schema.contents.platform,
        contentType: schema.contents.contentType,
        category: schema.contents.category,
        externalId: schema.contents.externalId,
        externalUrl: schema.contents.externalUrl,
        title: schema.contents.title,
        description: schema.contents.description,
        coverUrl: schema.contents.coverUrl,
        authorName: schema.contents.authorName,
        publishedAt: schema.contents.publishedAt,
        bloggerId: schema.contents.bloggerId,
        clubId: schema.contents.clubId,
        clubName: schema.clubs.name,
        groupId: schema.contents.groupId,
        isPrimary: schema.contents.isPrimary,
        groupPlatforms: schema.contents.groupPlatforms,
        aiParsed: schema.contents.aiParsed,
        aiSummary: schema.contents.aiSummary,
        aiSentiment: schema.contents.aiSentiment,
        aiClubMatch: schema.contents.aiClubMatch,
        createdAt: schema.contents.createdAt,
        updatedAt: schema.contents.updatedAt,
      })
      .from(schema.contents)
      .leftJoin(schema.clubs, eq(schema.contents.clubId, schema.clubs.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.contents.createdAt))
      .limit(200);

    return rows;
  }

  async linkClub(contentId: string, clubId: string) {
    await this.db
      .update(schema.contents)
      .set({ clubId, updatedAt: new Date() })
      .where(eq(schema.contents.id, contentId));
  }

  async mergeGroup(contentIds: string[], primaryId: string) {
    const groupId = crypto.randomUUID();
    const primaryContent = await this.db
      .select()
      .from(schema.contents)
      .where(eq(schema.contents.id, primaryId));

    if (!primaryContent[0]) return;

    // 获取所有内容的平台列表
    const allContents = [];
    for (const id of contentIds) {
      const [c] = await this.db
        .select()
        .from(schema.contents)
        .where(eq(schema.contents.id, id));
      if (c) allContents.push(c);
    }

    const platforms = [...new Set(allContents.map((c) => c.platform))];

    // 更新所有内容
    for (const id of contentIds) {
      await this.db
        .update(schema.contents)
        .set({
          groupId,
          isPrimary: id === primaryId,
          groupPlatforms: id === primaryId ? (platforms as any) : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.contents.id, id));
    }
  }

  async splitFromGroup(contentId: string) {
    const [content] = await this.db
      .select()
      .from(schema.contents)
      .where(eq(schema.contents.id, contentId));

    if (!content?.groupId) return;

    // 从组中移除
    await this.db
      .update(schema.contents)
      .set({ groupId: null, isPrimary: true, groupPlatforms: null, updatedAt: new Date() })
      .where(eq(schema.contents.id, contentId));

    // 更新组内剩余内容的 groupPlatforms
    const remaining = await this.db
      .select()
      .from(schema.contents)
      .where(eq(schema.contents.groupId, content.groupId));

    if (remaining.length <= 1) {
      // 组内只剩一条，解散
      for (const r of remaining) {
        await this.db
          .update(schema.contents)
          .set({ groupId: null, isPrimary: true, groupPlatforms: null, updatedAt: new Date() })
          .where(eq(schema.contents.id, r.id));
      }
    } else {
      const platforms = [...new Set(remaining.map((c) => c.platform))];
      const primary = remaining.find((c) => c.isPrimary) || remaining[0];
      await this.db
        .update(schema.contents)
        .set({ groupPlatforms: platforms as any, updatedAt: new Date() })
        .where(eq(schema.contents.id, primary.id));
    }
  }
}
```

- [ ] **Step 2: 创建 contents.controller.ts**

```typescript
// apps/server/src/admin/contents/contents.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminContentsService } from './contents.service';

@Controller('admin/contents')
@UseGuards(AdminGuard)
export class AdminContentsController {
  constructor(private readonly contentsService: AdminContentsService) {}

  @Get()
  findAll(
    @Query('platform') platform?: string,
    @Query('contentType') contentType?: string,
    @Query('category') category?: string,
    @Query('aiParsed') aiParsed?: string,
    @Query('hasClub') hasClub?: string,
  ) {
    return this.contentsService.findAll({ platform, contentType, category, aiParsed, hasClub });
  }

  @Post(':id/link-club')
  linkClub(@Param('id') id: string, @Body() body: { clubId: string }) {
    return this.contentsService.linkClub(id, body.clubId);
  }

  @Post('merge')
  mergeGroup(@Body() body: { contentIds: string[]; primaryId: string }) {
    return this.contentsService.mergeGroup(body.contentIds, body.primaryId);
  }

  @Post(':id/split')
  splitFromGroup(@Param('id') id: string) {
    return this.contentsService.splitFromGroup(id);
  }
}
```

- [ ] **Step 3: 重写 crawl-tasks admin service 和 controller**

```typescript
// apps/server/src/admin/crawl-tasks/crawl-tasks.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AdminCrawlTasksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAllTasks() {
    return this.db
      .select()
      .from(schema.crawlTasks)
      .orderBy(desc(schema.crawlTasks.createdAt));
  }

  async findTaskRuns(taskId?: string) {
    const query = this.db
      .select()
      .from(schema.crawlTaskRuns)
      .orderBy(desc(schema.crawlTaskRuns.startedAt))
      .limit(100);

    if (taskId) {
      return query.where(eq(schema.crawlTaskRuns.crawlTaskId, taskId));
    }
    return query;
  }

  async updateTask(id: string, data: { cronExpression?: string; isActive?: boolean }) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.cronExpression !== undefined) values.cronExpression = data.cronExpression;
    if (data.isActive !== undefined) values.isActive = data.isActive;

    const [updated] = await this.db
      .update(schema.crawlTasks)
      .set(values)
      .where(eq(schema.crawlTasks.id, id))
      .returning();

    return updated;
  }
}
```

```typescript
// apps/server/src/admin/crawl-tasks/crawl-tasks.controller.ts
import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminCrawlTasksService } from './crawl-tasks.service';
import { CrawlerService } from '../../crawler/crawler.service';
import { CrawlerSchedulerService } from '../../crawler/crawler-scheduler.service';

@Controller('admin/crawl-tasks')
@UseGuards(AdminGuard)
export class AdminCrawlTasksController {
  constructor(
    private readonly crawlTasksService: AdminCrawlTasksService,
    private readonly crawlerService: CrawlerService,
    private readonly crawlerScheduler: CrawlerSchedulerService,
  ) {}

  @Get()
  findAllTasks() {
    return this.crawlTasksService.findAllTasks();
  }

  @Get('runs')
  findRuns(@Query('taskId') taskId?: string) {
    return this.crawlTasksService.findTaskRuns(taskId);
  }

  @Patch(':id')
  async updateTask(@Param('id') id: string, @Body() body: { cronExpression?: string; isActive?: boolean }) {
    const updated = await this.crawlTasksService.updateTask(id, body);

    // 同步更新调度
    if (updated) {
      if (updated.isActive) {
        this.crawlerScheduler.updateTaskSchedule(updated.id, updated.cronExpression);
      } else {
        this.crawlerScheduler.unregisterTask(updated.id);
      }
    }

    return updated;
  }

  @Post(':id/trigger')
  async triggerTask(@Param('id') id: string) {
    this.crawlerService.executeTask(id);
    return { message: 'Task triggered' };
  }
}
```

- [ ] **Step 4: 更新 admin.module.ts**

在 `admin.module.ts` 中：
- 导入 `AdminContentsController` 和 `AdminContentsService`
- 将 `AdminVideosController` 和 `AdminVideosService` 替换为新的
- 确保 `CrawlerSchedulerService` 从 CrawlerModule 导出并可用

```typescript
// 新增导入
import { AdminContentsController } from './contents/contents.controller';
import { AdminContentsService } from './contents/contents.service';

// controllers 数组中替换 AdminVideosController 为 AdminContentsController
// providers 数组中替换 AdminVideosService 为 AdminContentsService
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/admin/
git commit -m "feat: add contents admin and update crawl-tasks admin for new schema"
```

---

## Task 8: Club 表更新 — 新增 wechatMpGhid 管理

**Files:**
- Modify: `apps/server/src/admin/clubs/clubs.service.ts`

- [ ] **Step 1: 在 ClubsService 的 create 和 update 方法中支持 wechatMpGhid 字段**

在 `clubs.service.ts` 的 `create` 和 `update` 方法的字段映射中增加 `wechatMpGhid`。具体位置：找到已有的字段赋值，如 `predecessorId`，在其后增加 `wechatMpGhid`。

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/admin/clubs/
git commit -m "feat: add wechatMpGhid field to club management"
```

---

## Task 9: Client API 更新 — Feed 多 Tab 和内容接口

**Files:**
- Modify: `apps/server/src/client/home/home.service.ts`
- Modify: `apps/server/src/client/home/home.controller.ts`
- Modify: `apps/server/src/client/videos/` → rename to `contents/`
- Modify: `apps/server/src/client/clubs/client-clubs.service.ts`
- Modify: `apps/server/src/client/client.module.ts`

- [ ] **Step 1: 重写 home.service.ts 支持多 Tab**

```typescript
// apps/server/src/client/home/home.service.ts
// getFeed 方法改为支持 category 参数
async getFeed(page = 1, pageSize = 20, category?: string) {
  const offset = (page - 1) * pageSize;
  const conditions: SQL[] = [eq(schema.contents.isPrimary, true)];

  if (category && category !== 'all') {
    if (category === 'ANNOUNCEMENT') {
      // 公告 Tab：Content 中的 ANNOUNCEMENT + 系统公告
      conditions.push(eq(schema.contents.category, 'ANNOUNCEMENT' as any));
    } else {
      conditions.push(eq(schema.contents.category, category as any));
    }
  }

  const contentRows = await this.db
    .select({
      id: schema.contents.id,
      type: sql<string>`'content'`,
      title: schema.contents.title,
      coverUrl: schema.contents.coverUrl,
      authorName: schema.contents.authorName,
      platform: schema.contents.platform,
      contentType: schema.contents.contentType,
      category: schema.contents.category,
      clubId: schema.contents.clubId,
      clubName: schema.clubs.name,
      groupPlatforms: schema.contents.groupPlatforms,
      publishedAt: schema.contents.publishedAt,
    })
    .from(schema.contents)
    .leftJoin(schema.clubs, eq(schema.contents.clubId, schema.clubs.id))
    .where(and(...conditions))
    .orderBy(desc(schema.contents.publishedAt))
    .limit(pageSize)
    .offset(offset);

  // 如果是推荐 Tab 或公告 Tab，混入系统公告
  if (!category || category === 'all' || category === 'ANNOUNCEMENT') {
    const announcementRows = await this.db
      .select({
        id: schema.announcements.id,
        title: schema.announcements.title,
        content: schema.announcements.content,
        publishedAt: schema.announcements.publishedAt,
      })
      .from(schema.announcements)
      .where(eq(schema.announcements.status, 'published'));

    const announcementItems = announcementRows.map((a) => ({
      id: a.id,
      type: 'announcement' as const,
      title: a.title,
      content: a.content?.slice(0, 100) || '',
      publishedAt: a.publishedAt,
    }));

    const merged = [...contentRows, ...announcementItems];
    merged.sort((a: any, b: any) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    });

    return { data: merged.slice(0, pageSize), total: merged.length, page, pageSize };
  }

  return { data: contentRows, total: contentRows.length, page, pageSize };
}
```

- [ ] **Step 2: 更新 home.controller.ts 增加 category 参数**

```typescript
@Get('feed')
getFeed(
  @Query('page') page?: string,
  @Query('pageSize') pageSize?: string,
  @Query('category') category?: string,
) {
  return this.homeService.getFeed(
    page ? parseInt(page) : 1,
    pageSize ? parseInt(pageSize) : 20,
    category,
  );
}
```

- [ ] **Step 3: 重命名 client/videos → client/contents**

将 `client-videos.service.ts` 和 `client-videos.controller.ts` 重命名为 `client-contents.*`，更新内部查询从 `schema.videos` 改为 `schema.contents`，路由从 `/api/client/videos` 改为 `/api/client/contents`。

- [ ] **Step 4: 更新 client-clubs.service.ts**

将 club 详情页中关联视频的查询从 `schema.videos` 改为 `schema.contents`。

- [ ] **Step 5: 更新 client.module.ts 注册**

替换 Videos 相关的 Controller 和 Service 为 Contents 版本。

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/client/
git commit -m "feat: update client API for multi-tab feed and content model"
```

---

## Task 10: Admin 前端 — 更新博主管理页面

**Files:**
- Modify: `apps/admin/src/features/bloggers/data/schema.ts`
- Modify: `apps/admin/src/features/bloggers/index.tsx`
- Modify: `apps/admin/src/features/bloggers/components/blogger-form.tsx`
- Modify: `apps/admin/src/features/bloggers/components/bloggers-table.tsx`
- Modify: `apps/admin/src/features/bloggers/components/bloggers-columns.tsx`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: 更新 api.ts 博主相关函数**

```typescript
// 替换博主相关 API 函数
export const getBloggers = () =>
  api.get<BloggerDto[]>('/bloggers').then((res) => res.data)

export const createBlogger = (data: { name: string; avatar?: string }) =>
  api.post<BloggerDto>('/bloggers', data).then((res) => res.data)

export const updateBlogger = (id: string, data: { name?: string; avatar?: string; isActive?: boolean }) =>
  api.patch<BloggerDto>(`/bloggers/${id}`, data).then((res) => res.data)

export const deleteBlogger = (id: string) =>
  api.delete(`/bloggers/${id}`)

// 新增账号管理
export const addBloggerAccount = (bloggerId: string, data: {
  platform: string
  platformUserId: string
  platformUsername?: string
  crawlCategories: string[]
}) =>
  api.post(`/bloggers/${bloggerId}/accounts`, data).then((res) => res.data)

export const updateBloggerAccount = (accountId: string, data: {
  platformUsername?: string
  crawlCategories?: string[]
}) =>
  api.patch(`/bloggers/accounts/${accountId}`, data).then((res) => res.data)

export const deleteBloggerAccount = (accountId: string) =>
  api.delete(`/bloggers/accounts/${accountId}`)
```

- [ ] **Step 2: 更新 bloggers/data/schema.ts**

```typescript
import { z } from 'zod'

export const platformLabels: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
  XIAOHONGSHU: '小红书',
  WECHAT_CHANNELS: '视频号',
  WECHAT_MP: '公众号',
}

export const categoryLabels: Record<string, string> = {
  REVIEW: '评测',
  SENTIMENT: '舆情',
}

export const bloggerAccountSchema = z.object({
  id: z.string(),
  bloggerId: z.string(),
  platform: z.string(),
  platformUserId: z.string(),
  platformUsername: z.string().nullable(),
  crawlCategories: z.array(z.string()),
  lastCrawledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type BloggerAccount = z.infer<typeof bloggerAccountSchema>

export const bloggerSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  isActive: z.boolean(),
  accounts: z.array(bloggerAccountSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Blogger = z.infer<typeof bloggerSchema>

export const bloggerFormSchema = z.object({
  name: z.string().min(1, '博主名称不能为空'),
  avatar: z.string().optional(),
})

export type BloggerFormValues = z.infer<typeof bloggerFormSchema>

export const bloggerAccountFormSchema = z.object({
  platform: z.enum(['BILIBILI', 'DOUYIN', 'XIAOHONGSHU', 'WECHAT_CHANNELS']),
  platformUserId: z.string().min(1, '平台用户 ID 不能为空'),
  platformUsername: z.string().optional(),
  crawlCategories: z.array(z.enum(['REVIEW', 'SENTIMENT'])).min(1, '至少选择一个采集分类'),
})

export type BloggerAccountFormValues = z.infer<typeof bloggerAccountFormSchema>
```

- [ ] **Step 3: 更新博主管理页面和组件**

重写 `bloggers/index.tsx` 和相关组件，主要变更：
- 博主表格展示关联的平台账号数量和平台图标
- 点击博主行展开/进入详情，显示账号列表
- 新增博主时只需填 name（不再选平台和 ID）
- 新增"添加账号"弹窗：选平台、填用户 ID、选采集分类
- 账号支持编辑和删除

具体 UI 实现根据现有的 bloggers 组件模式（Dialog + Form + Table）改造。

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/bloggers/ apps/admin/src/lib/api.ts
git commit -m "feat: update blogger admin UI for multi-platform accounts"
```

---

## Task 11: Admin 前端 — 内容管理页面（替代视频列表）

**Files:**
- Create: `apps/admin/src/features/contents/index.tsx`
- Create: `apps/admin/src/features/contents/data/schema.ts`
- Create: `apps/admin/src/features/contents/components/contents-table.tsx`
- Create: `apps/admin/src/features/contents/components/contents-columns.tsx`
- Modify: `apps/admin/src/routes/_authenticated/videos/route.tsx` → rename to `contents/route.tsx`
- Modify: `apps/admin/src/components/layout/data/sidebar-data.ts`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: 更新 api.ts 内容相关函数**

```typescript
// 替换视频 API 为内容 API
export const getContents = (params?: {
  platform?: string
  contentType?: string
  category?: string
  aiParsed?: string
}) =>
  api.get<ContentDto[]>('/contents', { params }).then((res) => res.data)

export const linkContentClub = (contentId: string, clubId: string) =>
  api.post(`/contents/${contentId}/link-club`, { clubId }).then((res) => res.data)

export const mergeContentGroup = (contentIds: string[], primaryId: string) =>
  api.post('/contents/merge', { contentIds, primaryId }).then((res) => res.data)

export const splitContentFromGroup = (contentId: string) =>
  api.post(`/contents/${contentId}/split`).then((res) => res.data)
```

- [ ] **Step 2: 创建 contents/data/schema.ts**

```typescript
import { z } from 'zod'

export const platformLabels: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
  XIAOHONGSHU: '小红书',
  WECHAT_CHANNELS: '视频号',
  WECHAT_MP: '公众号',
}

export const contentTypeLabels: Record<string, string> = {
  VIDEO: '视频',
  NOTE: '笔记',
  ARTICLE: '文章',
}

export const categoryLabels: Record<string, string> = {
  REVIEW: '评测',
  SENTIMENT: '舆情',
  ANNOUNCEMENT: '公告',
}

export const contentSchema = z.object({
  id: z.string(),
  platform: z.string(),
  contentType: z.string(),
  category: z.string(),
  externalId: z.string(),
  externalUrl: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  authorName: z.string().nullable(),
  publishedAt: z.string().nullable(),
  bloggerId: z.string().nullable(),
  clubId: z.string().nullable(),
  clubName: z.string().nullable(),
  groupId: z.string().nullable(),
  isPrimary: z.boolean(),
  groupPlatforms: z.array(z.string()).nullable(),
  aiParsed: z.boolean(),
  aiSummary: z.string().nullable(),
  aiSentiment: z.string().nullable(),
  aiClubMatch: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Content = z.infer<typeof contentSchema>
```

- [ ] **Step 3: 创建内容列表页和组件**

基于现有 `features/videos/` 的模式，创建 `features/contents/` 页面：
- 筛选条件：平台（5 个）、内容类型（VIDEO/NOTE/ARTICLE）、分类（REVIEW/SENTIMENT/ANNOUNCEMENT）、AI 解析状态
- 表格列：标题、平台图标、内容类型、分类、作者、关联俱乐部、AI 状态、发布时间
- 操作：关联俱乐部、合并、拆分

- [ ] **Step 4: 更新路由和侧边栏**

将 `routes/_authenticated/videos/route.tsx` 改为 `contents/route.tsx`，指向新的 contents feature。

更新 `sidebar-data.ts`：

```typescript
{
  title: '内容管理',
  url: '/contents',
  icon: Video, // 或换一个更合适的图标如 FileText
},
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/contents/ apps/admin/src/routes/ apps/admin/src/components/layout/data/sidebar-data.ts apps/admin/src/lib/api.ts
git commit -m "feat: add contents management page replacing videos"
```

---

## Task 12: Admin 前端 — 爬虫管理页面更新

**Files:**
- Modify: `apps/admin/src/features/crawler/index.tsx`
- Modify: `apps/admin/src/features/crawler/data/schema.ts`
- Modify: `apps/admin/src/features/crawler/components/`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: 更新 api.ts 爬虫相关函数**

```typescript
// 替换旧的爬虫 API
export const getCrawlTasks = () =>
  api.get<CrawlTaskDto[]>('/crawl-tasks').then((res) => res.data)

export const getCrawlTaskRuns = (taskId?: string) =>
  api.get<CrawlTaskRunDto[]>('/crawl-tasks/runs', { params: { taskId } }).then((res) => res.data)

export const updateCrawlTask = (id: string, data: { cronExpression?: string; isActive?: boolean }) =>
  api.patch<CrawlTaskDto>(`/crawl-tasks/${id}`, data).then((res) => res.data)

export const triggerCrawlTask = (id: string) =>
  api.post(`/crawl-tasks/${id}/trigger`).then((res) => res.data)
```

- [ ] **Step 2: 更新 crawler 页面**

重写爬虫管理页面：
- 任务列表：展示 CrawlTask（任务类型、分类、平台、目标、cron、状态）
- 每个任务可编辑 cron、启用/停用、手动触发
- 执行记录 Tab：展示 CrawlTaskRun 列表

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/crawler/ apps/admin/src/lib/api.ts
git commit -m "feat: update crawler admin UI for task-based management"
```

---

## Task 13: 清理旧代码和数据迁移

**Files:**
- Delete: `apps/server/src/admin/videos/` (replaced by contents)
- Modify: `apps/server/src/database/schema/index.ts` — 清理旧导出
- 旧的 video.schema.ts — 可保留但标记 deprecated，或在确认数据迁移后删除

- [ ] **Step 1: 删除旧的 videos admin 模块**

删除 `apps/server/src/admin/videos/` 目录（已被 contents 替代）。

- [ ] **Step 2: 清理 admin.module.ts 中的旧引用**

确保 `admin.module.ts` 不再引用 `AdminVideosController` 和 `AdminVideosService`。

- [ ] **Step 3: 清理旧的 features/videos 前端代码**

删除 `apps/admin/src/features/videos/` 目录（已被 contents 替代）。

- [ ] **Step 4: 更新 shared types 删除旧的类型别名**

如果 Step 1 中保留了 `VideoDto` 等旧类型的别名，在确认所有引用都更新后可以删除。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated video module and clean up old code"
```

---

## Task 14: 端到端验证

- [ ] **Step 1: 启动服务验证编译**

Run: `cd /Users/microud/Projects/delta-club-info && pnpm build`
Expected: 所有 packages 编译成功

- [ ] **Step 2: 启动 server 验证启动**

Run: `cd /Users/microud/Projects/delta-club-info/apps/server && pnpm dev`
Expected: NestJS 启动成功，CrawlerSchedulerService 加载任务

- [ ] **Step 3: 启动 admin 验证页面**

Run: `cd /Users/microud/Projects/delta-club-info/apps/admin && pnpm dev`
Expected: Admin 前端启动，博主管理和内容管理页面正常渲染

- [ ] **Step 4: 验证关键 API**

手动测试：
1. `GET /admin/bloggers` — 返回博主列表（含 accounts）
2. `POST /admin/bloggers` — 创建博主
3. `POST /admin/bloggers/:id/accounts` — 添加账号
4. `GET /admin/contents` — 返回内容列表
5. `GET /admin/crawl-tasks` — 返回任务列表
6. `GET /api/client/home/feed?category=REVIEW` — 返回评测 Tab 数据

- [ ] **Step 5: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: resolve integration issues from e2e verification"
```
