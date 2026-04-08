# Admin 概览页重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Admin `Dashboard` 改名为"概览"，用真实业务数据替换 shadcn 模板的假数据，按 5 个 Tab 组织（概览 / 待处理 / 商业化 / 爬虫健康 / 数据完整度）。

**Architecture:** 后端新增 `OverviewModule`，提供 `/admin/overview/*` 只读聚合接口；前端 `features/dashboard` 保留目录但替换内容，每个 Tab 一个组件文件，通过 TanStack Query 按 Tab 懒加载各自数据，图表使用 Recharts。

**Tech Stack:** NestJS + Drizzle ORM + PostgreSQL（后端）；React + TanStack Router + TanStack Query + shadcn/ui + Recharts（前端）。项目无单元测试基础设施，每步通过 `curl` 或 UI 手动验证。

**Spec:** `docs/superpowers/specs/2026-04-08-admin-overview-redesign-design.md`

**Execution Note:** 项目目前无测试框架（server 仅有 lint 命令，无 jest/vitest）。验证改为：
- 后端改动后跑 `pnpm --filter @delta-club/server lint` + 启服务并用 `curl` 命中接口
- 前端改动后跑 `pnpm --filter @delta-club/admin lint` + 打开浏览器目视验证
- 每个 task 完成即 commit

---

## File Structure

### 后端新增 / 修改

```
apps/server/src/admin/overview/
├── overview.module.ts          # 模块定义
├── overview.controller.ts      # /admin/overview/* 路由
└── overview.service.ts         # 所有聚合查询逻辑
```

- 修改：`apps/server/src/admin/admin.module.ts` —— 注册 OverviewController / OverviewService

### 前端新增 / 修改

```
apps/admin/src/features/dashboard/
├── index.tsx                   # 重写：改名概览 + 5 Tab 框架
├── api.ts                      # 新建：所有概览接口调用
├── types.ts                    # 新建：概览接口响应类型
└── components/
    ├── stat-card.tsx           # 新建：通用 Stat Card
    ├── overview-tab.tsx        # 新建：Tab 1
    ├── todos-tab.tsx           # 新建：Tab 2
    ├── business-tab.tsx        # 新建：Tab 3
    ├── crawler-health-tab.tsx  # 新建：Tab 4
    └── data-quality-tab.tsx    # 新建：Tab 5
```

- 删除：`apps/admin/src/features/dashboard/components/analytics.tsx`
- 删除：`apps/admin/src/features/dashboard/components/analytics-chart.tsx`
- 删除：`apps/admin/src/features/dashboard/components/overview.tsx`
- 删除：`apps/admin/src/features/dashboard/components/recent-sales.tsx`
- 修改：`apps/admin/src/components/layout/data/sidebar-data.ts` —— `Dashboard` → `概览`

---

## Phase 1: 后端 OverviewModule 骨架 + 核心接口

### Task 1: 创建 OverviewModule 骨架

**Files:**
- Create: `apps/server/src/admin/overview/overview.module.ts`
- Create: `apps/server/src/admin/overview/overview.controller.ts`
- Create: `apps/server/src/admin/overview/overview.service.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: Write `overview.service.ts` (空壳)**

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class OverviewService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async ping() {
    return { ok: true };
  }
}
```

- [ ] **Step 2: Write `overview.controller.ts` (空壳)**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { OverviewService } from './overview.service';

@Controller('admin/overview')
@UseGuards(AdminGuard)
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('ping')
  ping() {
    return this.overviewService.ping();
  }
}
```

- [ ] **Step 3: Write `overview.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';

@Module({
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class OverviewModule {}
```

- [ ] **Step 4: Register in `admin.module.ts`**

在 `apps/server/src/admin/admin.module.ts` 的 imports 数组加入 `OverviewController` / `OverviewService`。该项目惯例是把 admin 子模块的 controller/service 直接列在 `AdminModule` 的 `controllers`/`providers` 里而不是导入子 module。照此执行：

在文件顶部新增：
```typescript
import { OverviewController } from './overview/overview.controller';
import { OverviewService } from './overview/overview.service';
```

在 `controllers: [...]` 数组末尾追加 `OverviewController`；在 `providers: [...]` 数组末尾追加 `OverviewService`。

- [ ] **Step 5: Lint + 启动服务验证**

```bash
pnpm --filter @delta-club/server lint
pnpm --filter @delta-club/server start:dev
```

另开终端：
```bash
# 先拿到 admin token（登录），此处假设已有 TOKEN 环境变量
curl -s http://localhost:3001/admin/overview/ping -H "Authorization: Bearer $TOKEN"
```
Expected: `{"ok":true}`

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/admin/overview apps/server/src/admin/admin.module.ts
git commit -m "feat(server): scaffold OverviewModule"
```

---

### Task 2: 实现 `GET /admin/overview/summary`

返回 Tab1 的 4 个 Stat Card 所需数据：俱乐部数、内容数、博主数、生效推广订单数（及副文案所需字段）。

**Files:**
- Modify: `apps/server/src/admin/overview/overview.service.ts`
- Modify: `apps/server/src/admin/overview/overview.controller.ts`

- [ ] **Step 1: 在 service 添加 `getSummary` 方法**

替换现有 service 内容为：

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, eq, gte, lte, sql, sum } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class OverviewService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getSummary() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const [
      [{ value: clubTotal }],
      [{ value: clubPublished }],
      [{ value: clubClosed }],
      [{ value: contentTotal }],
      [{ value: contentLast7d }],
      [{ value: bloggerTotal }],
      [{ value: bloggerAccountTotal }],
      [{ value: activePromotionCount }],
      [{ value: activePromotionDailyRateSum }],
    ] = await Promise.all([
      this.db.select({ value: count() }).from(schema.clubs),
      this.db
        .select({ value: count() })
        .from(schema.clubs)
        .where(eq(schema.clubs.status, 'published')),
      this.db
        .select({ value: count() })
        .from(schema.clubs)
        .where(eq(schema.clubs.status, 'closed')),
      this.db.select({ value: count() }).from(schema.contents),
      this.db
        .select({ value: count() })
        .from(schema.contents)
        .where(gte(schema.contents.createdAt, sevenDaysAgo)),
      this.db.select({ value: count() }).from(schema.bloggers),
      this.db.select({ value: count() }).from(schema.bloggerAccounts),
      this.db
        .select({ value: count() })
        .from(schema.promotionOrders)
        .where(
          and(
            lte(schema.promotionOrders.startAt, today),
            gte(schema.promotionOrders.endAt, today),
          ),
        ),
      this.db
        .select({
          value: sql<string>`COALESCE(SUM(${schema.promotionOrders.dailyRate}), 0)`,
        })
        .from(schema.promotionOrders)
        .where(
          and(
            lte(schema.promotionOrders.startAt, today),
            gte(schema.promotionOrders.endAt, today),
          ),
        ),
    ]);

    return {
      clubs: {
        total: Number(clubTotal),
        published: Number(clubPublished),
        closed: Number(clubClosed),
      },
      contents: {
        total: Number(contentTotal),
        last7dNew: Number(contentLast7d),
      },
      bloggers: {
        total: Number(bloggerTotal),
        accountTotal: Number(bloggerAccountTotal),
      },
      promotions: {
        activeCount: Number(activePromotionCount),
        activeDailyRateSum: Number(activePromotionDailyRateSum),
      },
    };
  }

  async ping() {
    return { ok: true };
  }
}
```

- [ ] **Step 2: 在 controller 暴露 `GET /summary`**

替换现有 controller 内容为：

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { OverviewService } from './overview.service';

@Controller('admin/overview')
@UseGuards(AdminGuard)
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('ping')
  ping() {
    return this.overviewService.ping();
  }

  @Get('summary')
  getSummary() {
    return this.overviewService.getSummary();
  }
}
```

- [ ] **Step 3: Lint + 手动验证**

```bash
pnpm --filter @delta-club/server lint
curl -s http://localhost:3001/admin/overview/summary -H "Authorization: Bearer $TOKEN" | jq
```
Expected: JSON 含 `clubs/contents/bloggers/promotions` 四个 key，数值对应数据库当前状态。

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/admin/overview
git commit -m "feat(server): add overview summary endpoint"
```

---

### Task 3: 实现 `GET /admin/overview/todos` + `GET /admin/overview/recent-contents`

**Files:**
- Modify: `apps/server/src/admin/overview/overview.service.ts`
- Modify: `apps/server/src/admin/overview/overview.controller.ts`

- [ ] **Step 1: 在 service 追加 `getTodos` 方法**

在 `OverviewService` 内追加（放在 `getSummary` 下方）：

```typescript
async getTodos() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    [{ value: failedCrawlLast24h }],
    [{ value: aiParseFailedContents }],
  ] = await Promise.all([
    this.db
      .select({ value: count() })
      .from(schema.crawlTaskRuns)
      .where(
        and(
          eq(schema.crawlTaskRuns.status, 'FAILED'),
          gte(schema.crawlTaskRuns.startedAt, dayAgo),
        ),
      ),
    // AI 解析失败：aiParsed=false 且有 aiClubMatch 为空占位的判断比较弱，
    // 现阶段 content 表没有独立的 AI parse failed 字段，按 `aiParsed = false`
    // 作为"待/失败"合集返回即可，前端把它标为"待 AI 解析"。
    this.db
      .select({ value: count() })
      .from(schema.contents)
      .where(eq(schema.contents.aiParsed, false)),
  ]);

  return {
    pendingReviewComments: 0, // Stage 6 占位
    failedCrawlLast24h: Number(failedCrawlLast24h),
    aiParseFailedContents: Number(aiParseFailedContents),
  };
}
```

说明：`content` 当前 schema 没有独立的"AI 解析失败"状态字段，本版先口径为"未解析内容数"，文案上在前端写成"待/失败 AI 解析内容"。若后续引入 `aiParseStatus` 枚举再精确化。

- [ ] **Step 2: 在 service 追加 `getRecentContents` 方法**

继续追加：

```typescript
async getRecentContents(limit = 10) {
  const rows = await this.db
    .select({
      id: schema.contents.id,
      title: schema.contents.title,
      platform: schema.contents.platform,
      category: schema.contents.category,
      authorName: schema.contents.authorName,
      coverUrl: schema.contents.coverUrl,
      createdAt: schema.contents.createdAt,
      clubId: schema.contents.clubId,
      clubName: schema.clubs.name,
    })
    .from(schema.contents)
    .leftJoin(schema.clubs, eq(schema.contents.clubId, schema.clubs.id))
    .orderBy(sql`${schema.contents.createdAt} DESC`)
    .limit(limit);

  return rows;
}
```

记得在 `drizzle-orm` 的 import 里补上 `desc` 或直接使用上面的 `sql` 片段——保持现状，已用 `sql` 片段即可。

- [ ] **Step 3: 在 controller 暴露两个路由**

在 `OverviewController` 追加：

```typescript
@Get('todos')
getTodos() {
  return this.overviewService.getTodos();
}

@Get('recent-contents')
getRecentContents(@Query('limit') limit?: string) {
  const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) : 10;
  return this.overviewService.getRecentContents(n);
}
```

在文件头 import 区补 `Query`：`import { Controller, Get, Query, UseGuards } from '@nestjs/common';`

- [ ] **Step 4: Lint + 手动验证**

```bash
pnpm --filter @delta-club/server lint
curl -s http://localhost:3001/admin/overview/todos -H "Authorization: Bearer $TOKEN" | jq
curl -s "http://localhost:3001/admin/overview/recent-contents?limit=5" -H "Authorization: Bearer $TOKEN" | jq
```
Expected: `/todos` 返回三个计数字段；`/recent-contents` 返回最多 5 条内容，按 createdAt 倒序。

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/admin/overview
git commit -m "feat(server): add overview todos and recent-contents endpoints"
```

---

## Phase 2: 前端改名 + Tab 框架

### Task 4: 侧栏文案改为"概览"

**Files:**
- Modify: `apps/admin/src/components/layout/data/sidebar-data.ts`

- [ ] **Step 1: Edit**

将 `title: 'Dashboard'` 改为 `title: '概览'`：

```typescript
{
  title: '概览',
  url: '/',
  icon: LayoutDashboard,
},
```

- [ ] **Step 2: Lint + 目视验证**

```bash
pnpm --filter @delta-club/admin lint
pnpm --filter @delta-club/admin dev
```
浏览器打开 admin 后台，确认左侧栏第一项显示"概览"。

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/components/layout/data/sidebar-data.ts
git commit -m "feat(admin): rename Dashboard to 概览 in sidebar"
```

---

### Task 5: 删除 dashboard 模板遗留组件

**Files:**
- Delete: `apps/admin/src/features/dashboard/components/analytics.tsx`
- Delete: `apps/admin/src/features/dashboard/components/analytics-chart.tsx`
- Delete: `apps/admin/src/features/dashboard/components/overview.tsx`
- Delete: `apps/admin/src/features/dashboard/components/recent-sales.tsx`

- [ ] **Step 1: 删除 4 个文件**

```bash
rm apps/admin/src/features/dashboard/components/analytics.tsx
rm apps/admin/src/features/dashboard/components/analytics-chart.tsx
rm apps/admin/src/features/dashboard/components/overview.tsx
rm apps/admin/src/features/dashboard/components/recent-sales.tsx
```

- [ ] **Step 2: 暂不 lint / build**（`index.tsx` 仍在 import 这些组件，下一 task 会改写 index.tsx；两个 task 合并 commit 即可）

- [ ] **Step 3: 暂不 commit**，与 Task 6 合并 commit。

---

### Task 6: 重写 `features/dashboard/index.tsx` 为概览 5-Tab 框架

**Files:**
- Modify: `apps/admin/src/features/dashboard/index.tsx`
- Create: `apps/admin/src/features/dashboard/components/overview-tab.tsx` (占位)
- Create: `apps/admin/src/features/dashboard/components/todos-tab.tsx` (占位)
- Create: `apps/admin/src/features/dashboard/components/business-tab.tsx` (占位)
- Create: `apps/admin/src/features/dashboard/components/crawler-health-tab.tsx` (占位)
- Create: `apps/admin/src/features/dashboard/components/data-quality-tab.tsx` (占位)

- [ ] **Step 1: 创建 5 个 Tab 占位组件**

每个文件内容类似下面（按文件名替换 export name）：

`overview-tab.tsx`:
```tsx
export function OverviewTab() {
  return <div className='text-sm text-muted-foreground'>TODO: 概览数据</div>
}
```

`todos-tab.tsx`:
```tsx
export function TodosTab() {
  return <div className='text-sm text-muted-foreground'>TODO: 待处理</div>
}
```

`business-tab.tsx`:
```tsx
export function BusinessTab() {
  return <div className='text-sm text-muted-foreground'>TODO: 商业化</div>
}
```

`crawler-health-tab.tsx`:
```tsx
export function CrawlerHealthTab() {
  return <div className='text-sm text-muted-foreground'>TODO: 爬虫健康</div>
}
```

`data-quality-tab.tsx`:
```tsx
export function DataQualityTab() {
  return <div className='text-sm text-muted-foreground'>TODO: 数据完整度</div>
}
```

- [ ] **Step 2: 重写 `index.tsx`**

完全替换为：

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { OverviewTab } from './components/overview-tab'
import { TodosTab } from './components/todos-tab'
import { BusinessTab } from './components/business-tab'
import { CrawlerHealthTab } from './components/crawler-health-tab'
import { DataQualityTab } from './components/data-quality-tab'

export function Dashboard() {
  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>概览</h1>
        </div>
        <Tabs defaultValue='overview' className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>概览</TabsTrigger>
              <TabsTrigger value='todos'>待处理</TabsTrigger>
              <TabsTrigger value='business'>商业化</TabsTrigger>
              <TabsTrigger value='crawler'>爬虫健康</TabsTrigger>
              <TabsTrigger value='data-quality'>数据完整度</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <OverviewTab />
          </TabsContent>
          <TabsContent value='todos' className='space-y-4'>
            <TodosTab />
          </TabsContent>
          <TabsContent value='business' className='space-y-4'>
            <BusinessTab />
          </TabsContent>
          <TabsContent value='crawler' className='space-y-4'>
            <CrawlerHealthTab />
          </TabsContent>
          <TabsContent value='data-quality' className='space-y-4'>
            <DataQualityTab />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
```

说明：
- 移除了 `TopNav`（原模板带的假 Customers/Products 导航，没意义）
- 移除了右上角 `Download` 按钮
- 不再导入旧模板的 `Button` / `Card*` / `Analytics` 等

- [ ] **Step 3: Lint + 目视验证**

```bash
pnpm --filter @delta-club/admin lint
```
刷新浏览器，确认：
- 页面标题是"概览"
- 出现 5 个 Tab：概览 / 待处理 / 商业化 / 爬虫健康 / 数据完整度
- 每个 Tab 内容是 `TODO: …` 占位
- 无控制台报错

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/dashboard
git commit -m "feat(admin): rebuild overview page with 5-tab shell"
```

---

## Phase 3: Tab 1 概览数据（Stat Cards）

### Task 7: 新建 dashboard API / types / StatCard 组件

**Files:**
- Create: `apps/admin/src/features/dashboard/types.ts`
- Create: `apps/admin/src/features/dashboard/api.ts`
- Create: `apps/admin/src/features/dashboard/components/stat-card.tsx`

- [ ] **Step 1: 写 `types.ts`**

```typescript
export interface OverviewSummary {
  clubs: { total: number; published: number; closed: number }
  contents: { total: number; last7dNew: number }
  bloggers: { total: number; accountTotal: number }
  promotions: { activeCount: number; activeDailyRateSum: number }
}

export interface OverviewTodos {
  pendingReviewComments: number
  failedCrawlLast24h: number
  aiParseFailedContents: number
}

export interface RecentContentItem {
  id: string
  title: string
  platform: string
  category: string
  authorName: string | null
  coverUrl: string | null
  createdAt: string
  clubId: string | null
  clubName: string | null
}
```

- [ ] **Step 2: 写 `api.ts`**

```typescript
import axios from 'axios'
import type { OverviewSummary, OverviewTodos, RecentContentItem } from './types'

const api = axios.create({ baseURL: '/admin' })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getOverviewSummary = () =>
  api.get<OverviewSummary>('/overview/summary').then((r) => r.data)

export const getOverviewTodos = () =>
  api.get<OverviewTodos>('/overview/todos').then((r) => r.data)

export const getRecentContents = (limit = 10) =>
  api
    .get<RecentContentItem[]>('/overview/recent-contents', { params: { limit } })
    .then((r) => r.data)
```

说明：本项目 `apps/admin/src/lib/api.ts` 已有相同 axios 配置；这里为 feature 自包含再建一个实例，保持与现有 feature 风格一致（如已有约定请沿用 `lib/api.ts` 并把这些函数加到那里——实现时检查 `lib/api.ts` 是否更合适，最多选一种）。

**决定一次：** 沿用项目现有做法，把这些函数加到 `apps/admin/src/lib/api.ts` 末尾即可，避免新建重复 axios 实例。**本 step 改为：**

编辑 `apps/admin/src/lib/api.ts`，在文件末尾追加：

```typescript
// Overview
export interface OverviewSummary {
  clubs: { total: number; published: number; closed: number }
  contents: { total: number; last7dNew: number }
  bloggers: { total: number; accountTotal: number }
  promotions: { activeCount: number; activeDailyRateSum: number }
}
export interface OverviewTodos {
  pendingReviewComments: number
  failedCrawlLast24h: number
  aiParseFailedContents: number
}
export interface RecentContentItem {
  id: string
  title: string
  platform: string
  category: string
  authorName: string | null
  coverUrl: string | null
  createdAt: string
  clubId: string | null
  clubName: string | null
}

export const getOverviewSummary = () =>
  api.get<OverviewSummary>('/overview/summary').then((res) => res.data)
export const getOverviewTodos = () =>
  api.get<OverviewTodos>('/overview/todos').then((res) => res.data)
export const getRecentContents = (limit = 10) =>
  api
    .get<RecentContentItem[]>('/overview/recent-contents', { params: { limit } })
    .then((res) => res.data)
```

并 **跳过** 上面的 `types.ts` 与 `api.ts` 新建。

- [ ] **Step 3: 写 `stat-card.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: ReactNode
  subtext?: ReactNode
  icon?: ReactNode
  highlight?: 'warning' | 'danger'
}

export function StatCard({ title, value, subtext, icon, highlight }: StatCardProps) {
  return (
    <Card
      className={cn(
        highlight === 'warning' && 'border-yellow-500/50',
        highlight === 'danger' && 'border-red-500/50',
      )}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon && <div className='h-4 w-4 text-muted-foreground'>{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {subtext && (
          <p className='text-xs text-muted-foreground'>{subtext}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Lint**

```bash
pnpm --filter @delta-club/admin lint
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/api.ts apps/admin/src/features/dashboard/components/stat-card.tsx
git commit -m "feat(admin): add overview api helpers and StatCard component"
```

---

### Task 8: 实现 `OverviewTab` —— 4 张 Stat Card

**Files:**
- Modify: `apps/admin/src/features/dashboard/components/overview-tab.tsx`

- [ ] **Step 1: 实现 OverviewTab**

```tsx
import { useQuery } from '@tanstack/react-query'
import { Building2, FileText, UserSearch, Megaphone } from 'lucide-react'
import { getOverviewSummary } from '@/lib/api'
import { StatCard } from './stat-card'

export function OverviewTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview', 'summary'],
    queryFn: getOverviewSummary,
  })

  if (isLoading) {
    return <div className='text-sm text-muted-foreground'>加载中…</div>
  }
  if (isError || !data) {
    return <div className='text-sm text-red-500'>加载失败</div>
  }

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <StatCard
        title='俱乐部总数'
        value={data.clubs.total}
        subtext={`运营中 ${data.clubs.published} / 倒闭 ${data.clubs.closed}`}
        icon={<Building2 />}
      />
      <StatCard
        title='内容总数'
        value={data.contents.total}
        subtext={`最近 7 天新增 +${data.contents.last7dNew}`}
        icon={<FileText />}
      />
      <StatCard
        title='博主总数'
        value={data.bloggers.total}
        subtext={`${data.bloggers.accountTotal} 个平台账号`}
        icon={<UserSearch />}
      />
      <StatCard
        title='生效推广'
        value={data.promotions.activeCount}
        subtext={`日均 ¥${data.promotions.activeDailyRateSum.toFixed(2)}`}
        icon={<Megaphone />}
      />
    </div>
  )
}
```

- [ ] **Step 2: Lint + 目视验证**

```bash
pnpm --filter @delta-club/admin lint
```
浏览器刷新，点"概览" Tab，应看到 4 张 Stat Card 显示真实数据；网络面板看到 `/admin/overview/summary` 请求 200。

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/dashboard/components/overview-tab.tsx
git commit -m "feat(admin): render overview stat cards from summary endpoint"
```

---

## Phase 4: Tab 2 待处理

### Task 9: 实现 `TodosTab`

**Files:**
- Modify: `apps/admin/src/features/dashboard/components/todos-tab.tsx`

- [ ] **Step 1: 实现 TodosTab**

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, MessageSquareWarning, Bot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getOverviewTodos,
  getRecentContents,
  type RecentContentItem,
} from '@/lib/api'

const platformLabel: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
  XIAOHONGSHU: '小红书',
  WECHAT_CHANNELS: '视频号',
  WECHAT_MP: '公众号',
}

function TodoItem({
  icon,
  label,
  count,
  to,
}: {
  icon: React.ReactNode
  label: string
  count: number
  to: string
}) {
  const danger = count > 0
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent ${
        danger ? 'border-red-500/50' : ''
      }`}
    >
      <div className='flex items-center gap-2'>
        <span className={danger ? 'text-red-500' : 'text-muted-foreground'}>
          {icon}
        </span>
        <span className='text-sm'>{label}</span>
      </div>
      <span className={`text-lg font-bold ${danger ? 'text-red-500' : ''}`}>
        {count}
      </span>
    </Link>
  )
}

export function TodosTab() {
  const todos = useQuery({
    queryKey: ['overview', 'todos'],
    queryFn: getOverviewTodos,
  })
  const recent = useQuery({
    queryKey: ['overview', 'recent-contents'],
    queryFn: () => getRecentContents(10),
  })

  return (
    <div className='grid gap-4 lg:grid-cols-7'>
      <Card className='lg:col-span-3'>
        <CardHeader>
          <CardTitle>待处理事项</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {todos.isLoading && (
            <div className='text-sm text-muted-foreground'>加载中…</div>
          )}
          {todos.data && (
            <>
              <TodoItem
                icon={<MessageSquareWarning className='h-4 w-4' />}
                label='待审核评论'
                count={todos.data.pendingReviewComments}
                to='/'
              />
              <TodoItem
                icon={<AlertTriangle className='h-4 w-4' />}
                label='最近 24h 失败的爬虫执行'
                count={todos.data.failedCrawlLast24h}
                to='/crawler'
              />
              <TodoItem
                icon={<Bot className='h-4 w-4' />}
                label='待/失败 AI 解析内容'
                count={todos.data.aiParseFailedContents}
                to='/videos'
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card className='lg:col-span-4'>
        <CardHeader>
          <CardTitle>最近爬虫新增内容</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.isLoading && (
            <div className='text-sm text-muted-foreground'>加载中…</div>
          )}
          {recent.data && recent.data.length === 0 && (
            <div className='text-sm text-muted-foreground'>暂无数据</div>
          )}
          {recent.data && recent.data.length > 0 && (
            <ul className='space-y-2'>
              {recent.data.map((c: RecentContentItem) => (
                <li
                  key={c.id}
                  className='flex items-center gap-2 text-sm'
                >
                  <span className='shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs'>
                    {platformLabel[c.platform] ?? c.platform}
                  </span>
                  <span className='flex-1 truncate' title={c.title}>
                    {c.title}
                  </span>
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    {c.authorName ?? '—'}
                  </span>
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    {new Date(c.createdAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

说明：`待审核评论` 的 `to='/'` 是占位，Stage 6 启用后再改到评论管理路由。

- [ ] **Step 2: Lint + 目视验证**

```bash
pnpm --filter @delta-club/admin lint
```
浏览器点"待处理" Tab，确认：
- 3 个 TodoItem 显示对应数字，count > 0 的显示红色边框
- 右侧列表显示最近入库内容（最多 10 条）
- 点击 TodoItem 跳转到对应管理页

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/dashboard/components/todos-tab.tsx
git commit -m "feat(admin): implement todos tab with actionable items and recent contents"
```

---

## Phase 5: Tab 3 商业化

### Task 10: 后端 `GET /admin/overview/business`

返回本月推广收入、即将到期订单（未来 7 天）、当前生效推广位列表、累计推广收入。

**Files:**
- Modify: `apps/server/src/admin/overview/overview.service.ts`
- Modify: `apps/server/src/admin/overview/overview.controller.ts`

- [ ] **Step 1: 追加 `getBusiness` 到 service**

```typescript
async getBusiness() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // 本月推广收入：对每个与本月有交集的订单，覆盖天数 * dailyRate
  // 计算交集天数 = LEAST(endAt, monthEnd) - GREATEST(startAt, monthStart) + 1
  const monthRevenueRow = await this.db.execute<{ revenue: string }>(sql`
    SELECT COALESCE(SUM(
      (LEAST(end_at, ${monthEnd}::date) - GREATEST(start_at, ${monthStart}::date) + 1)
      * daily_rate
    ), 0)::text AS revenue
    FROM promotion_orders
    WHERE start_at <= ${monthEnd}::date
      AND end_at >= ${monthStart}::date
  `);
  const monthRevenue = Number(monthRevenueRow.rows[0]?.revenue ?? 0);

  // 累计推广收入 = SUM(fee)
  const [{ value: totalRevenue }] = await this.db
    .select({
      value: sql<string>`COALESCE(SUM(${schema.promotionOrders.fee}), 0)`,
    })
    .from(schema.promotionOrders);

  // 当前生效订单列表
  const activeOrders = await this.db
    .select({
      id: schema.promotionOrders.id,
      clubId: schema.promotionOrders.clubId,
      clubName: schema.clubs.name,
      fee: schema.promotionOrders.fee,
      dailyRate: schema.promotionOrders.dailyRate,
      startAt: schema.promotionOrders.startAt,
      endAt: schema.promotionOrders.endAt,
    })
    .from(schema.promotionOrders)
    .leftJoin(
      schema.clubs,
      eq(schema.promotionOrders.clubId, schema.clubs.id),
    )
    .where(
      and(
        lte(schema.promotionOrders.startAt, today),
        gte(schema.promotionOrders.endAt, today),
      ),
    )
    .orderBy(schema.promotionOrders.endAt);

  // 即将到期订单（未来 7 天内到期）
  const expiringSoon = await this.db
    .select({
      id: schema.promotionOrders.id,
      clubId: schema.promotionOrders.clubId,
      clubName: schema.clubs.name,
      endAt: schema.promotionOrders.endAt,
      dailyRate: schema.promotionOrders.dailyRate,
    })
    .from(schema.promotionOrders)
    .leftJoin(
      schema.clubs,
      eq(schema.promotionOrders.clubId, schema.clubs.id),
    )
    .where(
      and(
        gte(schema.promotionOrders.endAt, today),
        lte(schema.promotionOrders.endAt, sevenDaysLater),
      ),
    )
    .orderBy(schema.promotionOrders.endAt);

  return {
    monthRevenue,
    totalRevenue: Number(totalRevenue),
    activeOrders: activeOrders.map((o) => ({
      ...o,
      fee: Number(o.fee),
      dailyRate: Number(o.dailyRate),
    })),
    expiringSoon: expiringSoon.map((o) => ({
      ...o,
      dailyRate: Number(o.dailyRate),
    })),
  };
}
```

- [ ] **Step 2: 在 controller 暴露 `GET /business`**

```typescript
@Get('business')
getBusiness() {
  return this.overviewService.getBusiness();
}
```

- [ ] **Step 3: Lint + curl 验证**

```bash
pnpm --filter @delta-club/server lint
curl -s http://localhost:3001/admin/overview/business -H "Authorization: Bearer $TOKEN" | jq
```
Expected: 返回 `monthRevenue`、`totalRevenue`、`activeOrders`、`expiringSoon`。

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/admin/overview
git commit -m "feat(server): add overview business endpoint"
```

---

### Task 11: 前端 `BusinessTab`

**Files:**
- Modify: `apps/admin/src/features/dashboard/components/business-tab.tsx`
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: 在 `lib/api.ts` 追加类型和函数**

```typescript
export interface OverviewBusiness {
  monthRevenue: number
  totalRevenue: number
  activeOrders: Array<{
    id: string
    clubId: string
    clubName: string | null
    fee: number
    dailyRate: number
    startAt: string
    endAt: string
  }>
  expiringSoon: Array<{
    id: string
    clubId: string
    clubName: string | null
    endAt: string
    dailyRate: number
  }>
}

export const getOverviewBusiness = () =>
  api.get<OverviewBusiness>('/overview/business').then((res) => res.data)
```

- [ ] **Step 2: 实现 BusinessTab**

```tsx
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getOverviewBusiness } from '@/lib/api'
import { StatCard } from './stat-card'

function formatYuan(n: number) {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
}

export function BusinessTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview', 'business'],
    queryFn: getOverviewBusiness,
  })

  if (isLoading) return <div className='text-sm text-muted-foreground'>加载中…</div>
  if (isError || !data) return <div className='text-sm text-red-500'>加载失败</div>

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <StatCard title='本月推广收入' value={formatYuan(data.monthRevenue)} />
        <StatCard
          title='当前推广位'
          value={data.activeOrders.length}
          subtext='个生效订单'
        />
        <StatCard title='累计推广收入' value={formatYuan(data.totalRevenue)} />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>即将到期（未来 7 天）</CardTitle>
          </CardHeader>
          <CardContent>
            {data.expiringSoon.length === 0 && (
              <div className='text-sm text-muted-foreground'>暂无到期订单</div>
            )}
            {data.expiringSoon.length > 0 && (
              <ul className='space-y-2 text-sm'>
                {data.expiringSoon.map((o) => (
                  <li key={o.id} className='flex justify-between'>
                    <span>{o.clubName ?? '（未知俱乐部）'}</span>
                    <span className='text-muted-foreground'>{o.endAt}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>当前生效推广</CardTitle>
          </CardHeader>
          <CardContent>
            {data.activeOrders.length === 0 && (
              <div className='text-sm text-muted-foreground'>暂无生效订单</div>
            )}
            {data.activeOrders.length > 0 && (
              <ul className='space-y-2 text-sm'>
                {data.activeOrders.map((o) => (
                  <li key={o.id} className='flex justify-between'>
                    <span>{o.clubName ?? '（未知俱乐部）'}</span>
                    <span className='text-muted-foreground'>
                      {formatYuan(o.dailyRate)}/日
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Lint + 目视验证**

```bash
pnpm --filter @delta-club/admin lint
```
点"商业化" Tab，确认 3 张 Stat Card + 两个列表正确显示。

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/dashboard/components/business-tab.tsx apps/admin/src/lib/api.ts
git commit -m "feat(admin): implement business tab with revenue and promotion orders"
```

---

## Phase 6: Tab 4 爬虫健康

### Task 12: 后端 `GET /admin/overview/crawler-health`

**Files:**
- Modify: `apps/server/src/admin/overview/overview.service.ts`
- Modify: `apps/server/src/admin/overview/overview.controller.ts`

- [ ] **Step 1: 追加 `getCrawlerHealth` 到 service**

```typescript
async getCrawlerHealth() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 最近 24h 成功率
  const runs24h = await this.db
    .select({
      status: schema.crawlTaskRuns.status,
      value: count(),
    })
    .from(schema.crawlTaskRuns)
    .where(gte(schema.crawlTaskRuns.startedAt, dayAgo))
    .groupBy(schema.crawlTaskRuns.status);

  const total24h = runs24h.reduce((s, r) => s + Number(r.value), 0);
  const success24h = runs24h
    .filter((r) => r.status === 'SUCCESS')
    .reduce((s, r) => s + Number(r.value), 0);
  const successRate24h =
    total24h === 0 ? null : Math.round((success24h / total24h) * 100);

  // 各平台最近成功采集时间（通过 join crawl_tasks 拿 platform）
  const platformLastSuccessRows = await this.db.execute<{
    platform: string;
    last_success_at: string | null;
  }>(sql`
    SELECT t.platform,
           MAX(r.finished_at) AS last_success_at
    FROM crawl_tasks t
    LEFT JOIN crawl_task_runs r
      ON r.crawl_task_id = t.id AND r.status = 'SUCCESS'
    GROUP BY t.platform
  `);

  // 最近 7 天平均每日采集量（items_created 之和 / 7）
  const weeklyCreated = await this.db
    .select({
      value: sql<string>`COALESCE(SUM(${schema.crawlTaskRuns.itemsCreated}), 0)`,
    })
    .from(schema.crawlTaskRuns)
    .where(
      and(
        eq(schema.crawlTaskRuns.status, 'SUCCESS'),
        gte(schema.crawlTaskRuns.startedAt, weekAgo),
      ),
    );
  const avgDaily = Math.round(Number(weeklyCreated[0]?.value ?? 0) / 7);

  // 最近失败执行记录（最多 10 条）
  const recentFailed = await this.db
    .select({
      id: schema.crawlTaskRuns.id,
      crawlTaskId: schema.crawlTaskRuns.crawlTaskId,
      startedAt: schema.crawlTaskRuns.startedAt,
      errorMessage: schema.crawlTaskRuns.errorMessage,
      platform: schema.crawlTasks.platform,
      taskType: schema.crawlTasks.taskType,
    })
    .from(schema.crawlTaskRuns)
    .leftJoin(
      schema.crawlTasks,
      eq(schema.crawlTaskRuns.crawlTaskId, schema.crawlTasks.id),
    )
    .where(eq(schema.crawlTaskRuns.status, 'FAILED'))
    .orderBy(sql`${schema.crawlTaskRuns.startedAt} DESC`)
    .limit(10);

  return {
    successRate24h,
    totalRuns24h: total24h,
    avgDailyCreated: avgDaily,
    platformLastSuccess: platformLastSuccessRows.rows.map((r) => ({
      platform: r.platform,
      lastSuccessAt: r.last_success_at,
    })),
    recentFailed,
  };
}
```

- [ ] **Step 2: 在 controller 追加路由**

```typescript
@Get('crawler-health')
getCrawlerHealth() {
  return this.overviewService.getCrawlerHealth();
}
```

- [ ] **Step 3: Lint + curl**

```bash
pnpm --filter @delta-club/server lint
curl -s http://localhost:3001/admin/overview/crawler-health -H "Authorization: Bearer $TOKEN" | jq
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/admin/overview
git commit -m "feat(server): add overview crawler-health endpoint"
```

---

### Task 13: 前端 `CrawlerHealthTab`

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/features/dashboard/components/crawler-health-tab.tsx`

- [ ] **Step 1: 在 `lib/api.ts` 追加**

```typescript
export interface OverviewCrawlerHealth {
  successRate24h: number | null
  totalRuns24h: number
  avgDailyCreated: number
  platformLastSuccess: Array<{
    platform: string
    lastSuccessAt: string | null
  }>
  recentFailed: Array<{
    id: string
    crawlTaskId: string
    startedAt: string
    errorMessage: string | null
    platform: string | null
    taskType: string | null
  }>
}

export const getOverviewCrawlerHealth = () =>
  api
    .get<OverviewCrawlerHealth>('/overview/crawler-health')
    .then((res) => res.data)
```

- [ ] **Step 2: 实现 CrawlerHealthTab**

```tsx
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getOverviewCrawlerHealth } from '@/lib/api'
import { StatCard } from './stat-card'

const platformLabel: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
  XIAOHONGSHU: '小红书',
  WECHAT_CHANNELS: '视频号',
  WECHAT_MP: '公众号',
}

const STALE_HOURS = 6

function relativeTime(iso: string | null) {
  if (!iso) return '从未'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

function isStale(iso: string | null) {
  if (!iso) return true
  return Date.now() - new Date(iso).getTime() > STALE_HOURS * 3600_000
}

export function CrawlerHealthTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview', 'crawler-health'],
    queryFn: getOverviewCrawlerHealth,
  })

  if (isLoading) return <div className='text-sm text-muted-foreground'>加载中…</div>
  if (isError || !data) return <div className='text-sm text-red-500'>加载失败</div>

  const rateHighlight: 'danger' | 'warning' | undefined =
    data.successRate24h === null
      ? undefined
      : data.successRate24h < 80
        ? 'danger'
        : data.successRate24h < 95
          ? 'warning'
          : undefined

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <StatCard
          title='最近 24h 成功率'
          value={
            data.successRate24h === null ? '—' : `${data.successRate24h}%`
          }
          subtext={`${data.totalRuns24h} 次执行`}
          highlight={rateHighlight}
        />
        <StatCard
          title='平均每日新增内容'
          value={data.avgDailyCreated}
          subtext='最近 7 天均值'
        />
        <StatCard
          title='监控平台数'
          value={data.platformLastSuccess.length}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>各平台最近成功采集</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className='space-y-2 text-sm'>
            {data.platformLastSuccess.map((p) => (
              <li
                key={p.platform}
                className='flex items-center justify-between'
              >
                <span>{platformLabel[p.platform] ?? p.platform}</span>
                <span
                  className={
                    isStale(p.lastSuccessAt)
                      ? 'text-red-500'
                      : 'text-muted-foreground'
                  }
                >
                  {relativeTime(p.lastSuccessAt)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近失败执行</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentFailed.length === 0 && (
            <div className='text-sm text-muted-foreground'>无失败记录</div>
          )}
          {data.recentFailed.length > 0 && (
            <ul className='space-y-2 text-sm'>
              {data.recentFailed.map((r) => (
                <li key={r.id} className='space-y-0.5'>
                  <div className='flex items-center justify-between'>
                    <span>
                      {platformLabel[r.platform ?? ''] ?? r.platform ?? '—'} ·{' '}
                      {r.taskType ?? '—'}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {new Date(r.startedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  {r.errorMessage && (
                    <div className='truncate text-xs text-red-500'>
                      {r.errorMessage}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Lint + 目视验证**

```bash
pnpm --filter @delta-club/admin lint
```
点"爬虫健康" Tab，确认 3 张 Stat Card、平台最近采集时间、失败列表正常显示。

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/dashboard/components/crawler-health-tab.tsx apps/admin/src/lib/api.ts
git commit -m "feat(admin): implement crawler-health tab with platform freshness"
```

---

## Phase 7: Tab 5 数据完整度

### Task 14: 后端 `GET /admin/overview/data-quality`

**Files:**
- Modify: `apps/server/src/admin/overview/overview.service.ts`
- Modify: `apps/server/src/admin/overview/overview.controller.ts`

- [ ] **Step 1: 追加 `getDataQuality` 到 service**

```typescript
async getDataQuality() {
  const [
    [{ value: missingBusinessInfo }],
    [{ value: missingServices }],
    [{ value: missingRules }],
    [{ value: orphanClubs }],
  ] = await Promise.all([
    // 缺失工商信息：companyName 为空
    this.db
      .select({ value: count() })
      .from(schema.clubs)
      .where(sql`${schema.clubs.companyName} IS NULL OR ${schema.clubs.companyName} = ''`),
    // 没有任何服务项：left join club_services 为空
    this.db.execute<{ value: string }>(sql`
      SELECT COUNT(*)::text AS value FROM clubs c
      WHERE NOT EXISTS (SELECT 1 FROM club_services s WHERE s.club_id = c.id)
    `).then((r) => [{ value: Number(r.rows[0]?.value ?? 0) }]),
    // 没有规则：left join club_rules 为空
    this.db.execute<{ value: string }>(sql`
      SELECT COUNT(*)::text AS value FROM clubs c
      WHERE NOT EXISTS (SELECT 1 FROM club_rules r WHERE r.club_id = c.id)
    `).then((r) => [{ value: Number(r.rows[0]?.value ?? 0) }]),
    // 孤岛俱乐部：无任何 content
    this.db.execute<{ value: string }>(sql`
      SELECT COUNT(*)::text AS value FROM clubs c
      WHERE NOT EXISTS (SELECT 1 FROM contents ct WHERE ct.club_id = c.id)
    `).then((r) => [{ value: Number(r.rows[0]?.value ?? 0) }]),
  ]);

  return {
    missingBusinessInfo: Number(missingBusinessInfo),
    missingServices: Number(missingServices),
    missingRules: Number(missingRules),
    orphanClubs: Number(orphanClubs),
  };
}
```

注：实现者执行时先确认 `club_services` / `club_rules` 表名是否与 drizzle schema 中的 `tableName` 一致。若不同需要改为对应表名。

- [ ] **Step 2: 在 controller 追加路由**

```typescript
@Get('data-quality')
getDataQuality() {
  return this.overviewService.getDataQuality();
}
```

- [ ] **Step 3: Lint + curl**

```bash
pnpm --filter @delta-club/server lint
curl -s http://localhost:3001/admin/overview/data-quality -H "Authorization: Bearer $TOKEN" | jq
```
Expected: 4 个字段，每个都是非负整数。

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/admin/overview
git commit -m "feat(server): add overview data-quality endpoint"
```

---

### Task 15: 前端 `DataQualityTab`

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/features/dashboard/components/data-quality-tab.tsx`

- [ ] **Step 1: 在 `lib/api.ts` 追加**

```typescript
export interface OverviewDataQuality {
  missingBusinessInfo: number
  missingServices: number
  missingRules: number
  orphanClubs: number
}

export const getOverviewDataQuality = () =>
  api
    .get<OverviewDataQuality>('/overview/data-quality')
    .then((res) => res.data)
```

- [ ] **Step 2: 实现 DataQualityTab**

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getOverviewDataQuality } from '@/lib/api'
import { StatCard } from './stat-card'

export function DataQualityTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview', 'data-quality'],
    queryFn: getOverviewDataQuality,
  })

  if (isLoading) return <div className='text-sm text-muted-foreground'>加载中…</div>
  if (isError || !data) return <div className='text-sm text-red-500'>加载失败</div>

  const items: Array<{ title: string; value: number; to: string }> = [
    { title: '缺失工商信息的俱乐部', value: data.missingBusinessInfo, to: '/clubs' },
    { title: '没有服务项的俱乐部', value: data.missingServices, to: '/clubs' },
    { title: '没有规则的俱乐部', value: data.missingRules, to: '/clubs' },
    { title: '孤岛俱乐部（无内容）', value: data.orphanClubs, to: '/clubs' },
  ]

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {items.map((it) => (
        <Link key={it.title} to={it.to} className='block'>
          <StatCard
            title={it.title}
            value={it.value}
            highlight={it.value > 0 ? 'warning' : undefined}
          />
        </Link>
      ))}
    </div>
  )
}
```

说明：目前 `/clubs` 列表页不支持"缺某字段"筛选；本版卡片点击统一跳转到 `/clubs`，后续可在俱乐部列表加筛选 query param 再回来串联。

- [ ] **Step 3: Lint + 目视验证**

```bash
pnpm --filter @delta-club/admin lint
```
点"数据完整度" Tab，确认 4 张 StatCard 显示数字并可点击跳转到俱乐部列表。

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/dashboard/components/data-quality-tab.tsx apps/admin/src/lib/api.ts
git commit -m "feat(admin): implement data-quality tab"
```

---

## Phase 8: 全链路冒烟 + 收尾

### Task 16: 端到端目视冒烟测试

- [ ] **Step 1: 启动前后端**

```bash
pnpm --filter @delta-club/server start:dev
pnpm --filter @delta-club/admin dev
```

- [ ] **Step 2: 逐一点击每个 Tab**

- 概览：4 张 StatCard 正确
- 待处理：3 个 TodoItem 可点击跳转；右侧最近内容列表显示
- 商业化：本月收入 / 累计收入 / 推广位数、两个列表
- 爬虫健康：成功率、各平台最近成功时间、失败列表
- 数据完整度：4 张 StatCard

- [ ] **Step 3: 侧栏目视**

确认左侧栏第一项文案为"概览"，页面标题为"概览"。

- [ ] **Step 4: 全量 lint**

```bash
pnpm --filter @delta-club/server lint
pnpm --filter @delta-club/admin lint
```
Expected: 全部 pass。

- [ ] **Step 5: （无额外代码改动则无 commit）**

如 Step 2 发现 bug，修复后再 commit。

---

## Self-Review Notes

- **Spec coverage**：
  - 改名 概览 ✅ Task 4 / Task 6
  - 删除模板假数据 ✅ Task 5
  - 5 个 Tab 框架 ✅ Task 6
  - Tab1 4 张 Stat Card ✅ Task 7 / 8（图表后续迭代，spec 明确第一版可缺省）
  - Tab2 待处理 3 项 + 最近内容 ✅ Task 3 / 9
  - Tab3 商业化 ✅ Task 10 / 11
  - Tab4 爬虫健康 ✅ Task 12 / 13
  - Tab5 数据完整度 ✅ Task 14 / 15
  - 所有接口放 `OverviewModule` ✅ Task 1~3, 10, 12, 14
- **图表**：spec 明确第一版图表可选择性实现，本计划未包含图表，留给后续迭代 task（避免计划肿）。
- **未决项**：
  - "即将到期订单"依赖 `promotion_orders.endAt`，已确认 schema 存在该字段 ✅
  - "没有规则的俱乐部"依赖 `club_rules` 表存在，Task 14 Step 1 已提醒执行者 SQL 前确认表名
  - `待审核评论` 为 Stage 6 占位，接口已返回 0，前端不跳转
