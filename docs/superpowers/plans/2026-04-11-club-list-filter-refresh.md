# 俱乐部列表页下拉刷新与高级筛选 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为小程序俱乐部列表页启用下拉刷新，新增底部弹窗高级筛选（玩法类型、排序方式、运营时长、工商信息），并在俱乐部数据模型中增加 `serviceTypes` 字段。

**Architecture:** 后端 `clubs` 表新增 `service_types` text 数组列，客户端 API 扩展筛选/排序参数。小程序移除原有 chips 筛选栏，替换为搜索栏右侧筛选按钮 + 底部弹窗。管理后台俱乐部表单增加服务类型多选。

**Tech Stack:** Drizzle ORM (migration), NestJS, Vue 3 + uni-app, React (admin), Zod, class-validator

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `apps/server/src/database/schema/club.schema.ts` | 新增 `serviceTypes` 列 |
| Create | `apps/server/src/database/migrations/XXXX_add_club_service_types.sql` | 数据库迁移（由 drizzle-kit generate 生成） |
| Modify | `apps/server/src/admin/clubs/dto/create-club.dto.ts` | 新增 `serviceTypes` 字段验证 |
| Modify | `apps/server/src/admin/clubs/dto/update-club.dto.ts` | 新增 `serviceTypes` 字段验证 |
| Modify | `apps/admin/src/features/clubs/data/schema.ts` | schema 和表单 schema 增加 `serviceTypes` |
| Modify | `apps/admin/src/features/clubs/components/club-form.tsx` | 增加服务类型多选 UI |
| Modify | `apps/server/src/client/clubs/client-clubs.controller.ts` | 新增筛选/排序 query 参数 |
| Modify | `apps/server/src/client/clubs/client-clubs.service.ts` | 实现新筛选/排序逻辑 |
| Modify | `apps/uniapp/src/pages.json` | 启用 `enablePullDownRefresh` |
| Modify | `apps/uniapp/src/pages/clubs/index.vue` | 移除 chips，新增筛选按钮 + 底部弹窗 |
| Modify | `docs/requirements.md` | 更新俱乐部列表页筛选需求 |
| Modify | `docs/design.md` | 更新技术设计文档 |

---

### Task 1: 数据库 Schema — clubs 表新增 serviceTypes 列

**Files:**
- Modify: `apps/server/src/database/schema/club.schema.ts`

- [ ] **Step 1: 修改 club.schema.ts，新增 serviceTypes 列**

在 `clubs` 表定义中，`orderPosters` 之后新增：

```typescript
serviceTypes: text('service_types').array().default([]),
```

- [ ] **Step 2: 生成数据库迁移**

```bash
cd apps/server && pnpm db:generate
```

Expected: 生成一个新的 migration SQL 文件，包含 `ALTER TABLE clubs ADD COLUMN service_types text[] DEFAULT '{}'`。

- [ ] **Step 3: 执行迁移**

```bash
cd apps/server && pnpm db:migrate
```

Expected: 迁移成功，无报错。

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/database/schema/club.schema.ts apps/server/drizzle/
git commit -m "feat(server): add serviceTypes column to clubs table"
```

---

### Task 2: Admin 后端 DTO — 支持 serviceTypes 字段

**Files:**
- Modify: `apps/server/src/admin/clubs/dto/create-club.dto.ts`
- Modify: `apps/server/src/admin/clubs/dto/update-club.dto.ts`

- [ ] **Step 1: 修改 CreateClubDto，新增 serviceTypes**

在 `orderPosters` 字段之后新增：

```typescript
@IsOptional()
@IsArray()
@IsString({ each: true })
serviceTypes?: string[];
```

- [ ] **Step 2: 修改 UpdateClubDto，新增 serviceTypes**

同样在 `orderPosters` 字段之后新增：

```typescript
@IsOptional()
@IsArray()
@IsString({ each: true })
serviceTypes?: string[];
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/admin/clubs/dto/
git commit -m "feat(server): add serviceTypes to club DTOs"
```

---

### Task 3: Admin 前端 — 俱乐部表单增加服务类型多选

**Files:**
- Modify: `apps/admin/src/features/clubs/data/schema.ts`
- Modify: `apps/admin/src/features/clubs/components/club-form.tsx`

- [ ] **Step 1: 修改 schema.ts，增加 serviceTypes 字段**

在 `clubSchema` 中 `orderPosters` 之后新增：

```typescript
serviceTypes: z.array(z.string()).default([]),
```

在 `clubFormSchema` 中 `orderPosters` 之后新增：

```typescript
serviceTypes: z.array(z.string()).optional(),
```

新增服务类型标签映射（在 `clubStatusLabels` 之后）：

```typescript
export const clubServiceTypeLabels: Record<string, string> = {
  KNIFE_RUN: '跑刀',
  ACCOMPANY: '陪玩',
  ESCORT_TRIAL: '护航体验',
  ESCORT_STANDARD: '护航标准',
  ESCORT_FUN: '护航趣味',
}
```

- [ ] **Step 2: 修改 club-form.tsx，在"订单海报"区块之前添加服务类型多选**

在 `establishedAt` FormField 之后、订单海报 `div` 之前插入：

```tsx
<div className='space-y-2'>
  <FormField
    control={form.control}
    name='serviceTypes'
    render={({ field }) => (
      <FormItem>
        <FormLabel>支持的服务类型</FormLabel>
        <div className='flex flex-wrap gap-2'>
          {Object.entries(clubServiceTypeLabels).map(([value, label]) => {
            const selected = field.value?.includes(value) ?? false
            return (
              <Button
                key={value}
                type='button'
                variant={selected ? 'default' : 'outline'}
                size='sm'
                onClick={() => {
                  const current = field.value ?? []
                  field.onChange(
                    selected
                      ? current.filter((v: string) => v !== value)
                      : [...current, value]
                  )
                }}
              >
                {label}
              </Button>
            )
          })}
        </div>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

更新 `defaultValues` 增加 `serviceTypes: []`，更新 import 增加 `clubServiceTypeLabels`。

- [ ] **Step 3: 验证 admin 构建**

```bash
cd apps/admin && pnpm build
```

Expected: 构建成功。

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/clubs/
git commit -m "feat(admin): add serviceTypes multi-select to club form"
```

---

### Task 4: Client API — 扩展俱乐部列表筛选/排序参数

**Files:**
- Modify: `apps/server/src/client/clubs/client-clubs.controller.ts`
- Modify: `apps/server/src/client/clubs/client-clubs.service.ts`

- [ ] **Step 1: 修改 controller，新增 query 参数**

```typescript
import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ClientClubsService } from './client-clubs.service';

@Controller('api/client/clubs')
export class ClientClubsController {
  constructor(private readonly clientClubsService: ClientClubsService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('keyword') keyword?: string,
    @Query('serviceTypes') serviceTypes?: string,
    @Query('sortBy') sortBy?: string,
    @Query('minOperatingDays') minOperatingDays?: string,
    @Query('hasCompanyInfo') hasCompanyInfo?: string,
  ) {
    return this.clientClubsService.findAll(page, pageSize, keyword, serviceTypes, {
      sortBy: sortBy as 'createdAt' | 'operatingDays' | undefined,
      minOperatingDays: minOperatingDays ? parseInt(minOperatingDays, 10) : undefined,
      hasCompanyInfo: hasCompanyInfo === 'true' ? true : undefined,
    });
  }

  // ... existing endpoints unchanged
}
```

- [ ] **Step 2: 修改 service，实现新的筛选/排序逻辑**

```typescript
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, ilike, count, desc, and, asc, arrayOverlaps, isNotNull, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

interface FindAllFilters {
  sortBy?: 'createdAt' | 'operatingDays';
  minOperatingDays?: number;
  hasCompanyInfo?: boolean;
}

@Injectable()
export class ClientClubsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(
    page = 1,
    pageSize = 20,
    keyword?: string,
    serviceTypes?: string,
    filters?: FindAllFilters,
  ) {
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [
      eq(schema.clubs.status, 'published' as typeof schema.clubs.$inferSelect.status),
    ];

    if (keyword) {
      conditions.push(ilike(schema.clubs.name, `%${keyword}%`));
    }

    // Filter by serviceTypes directly on clubs.serviceTypes array column
    if (serviceTypes) {
      const types = serviceTypes.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        conditions.push(arrayOverlaps(schema.clubs.serviceTypes, types));
      }
    }

    // Filter by minimum operating days (based on establishedAt)
    if (filters?.minOperatingDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.minOperatingDays);
      conditions.push(
        sql`${schema.clubs.establishedAt} IS NOT NULL AND ${schema.clubs.establishedAt} <= ${cutoffDate.toISOString().split('T')[0]}`,
      );
    }

    // Filter by has company info
    if (filters?.hasCompanyInfo) {
      conditions.push(isNotNull(schema.clubs.companyName));
    }

    const where = and(...conditions);

    // Determine sort order
    let orderBy;
    if (filters?.sortBy === 'operatingDays') {
      // Clubs with establishedAt earlier = longer operating, so asc on establishedAt
      orderBy = asc(schema.clubs.establishedAt);
    } else {
      orderBy = desc(schema.clubs.createdAt);
    }

    const [clubs, [{ value: total }]] = await Promise.all([
      this.db
        .select({
          id: schema.clubs.id,
          name: schema.clubs.name,
          logo: schema.clubs.logo,
          description: schema.clubs.description,
          establishedAt: schema.clubs.establishedAt,
          serviceTypes: schema.clubs.serviceTypes,
          createdAt: schema.clubs.createdAt,
        })
        .from(schema.clubs)
        .where(where)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.clubs).where(where),
    ]);

    return { data: clubs, total, page, pageSize };
  }

  // ... findOne, findServices, findRules, findContents unchanged
}
```

注意：`findAll` 不再需要 join `club_services` 表查服务类型，因为 `serviceTypes` 已直接存储在 `clubs` 表上。返回数据中直接包含 `serviceTypes` 字段。

- [ ] **Step 3: 验证 server 构建**

```bash
cd apps/server && pnpm build
```

Expected: 构建成功。

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/client/clubs/
git commit -m "feat(server): extend client clubs API with advanced filter and sort params"
```

---

### Task 5: 小程序 — 启用下拉刷新 + 高级筛选底部弹窗

**Files:**
- Modify: `apps/uniapp/src/pages.json`
- Modify: `apps/uniapp/src/pages/clubs/index.vue`

- [ ] **Step 1: pages.json 启用下拉刷新**

将俱乐部列表页配置改为：

```json
{ "path": "pages/clubs/index", "style": { "navigationBarTitleText": "俱乐部", "enablePullDownRefresh": true } }
```

- [ ] **Step 2: 重写 clubs/index.vue**

完整替换为以下实现（移除 chips 筛选栏，新增筛选按钮 + 底部弹窗）：

```vue
<template>
  <view class="page">
    <!-- Search Bar -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索俱乐部"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <text v-if="keyword" class="search-clear" @click="clearSearch">✕</text>
      </view>
      <view class="filter-btn" @click="showFilter = true">
        <text class="filter-icon">⚙</text>
        <view v-if="hasActiveFilters" class="filter-badge" />
      </view>
    </view>

    <!-- Club List -->
    <view class="club-list">
      <view
        v-for="club in clubs"
        :key="club.id"
        class="club-card"
        @click="goDetail(club.id)"
      >
        <image
          class="club-logo"
          :src="club.logo || '/static/logo.png'"
          mode="aspectFill"
        />
        <view class="club-info">
          <view class="club-name">{{ club.name }}</view>
          <view class="club-days">已运营 {{ getOperatingDays(club.establishedAt) }} 天</view>
          <view class="club-tags">
            <text
              v-for="type in club.serviceTypes"
              :key="type"
              class="service-tag"
            >
              {{ getTypeLabel(type) }}
            </text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-hint">加载中...</view>
      <view v-else-if="noMore && clubs.length > 0" class="loading-hint">没有更多了</view>
      <view v-else-if="clubs.length === 0 && !loading" class="empty-hint">
        <text>暂无俱乐部</text>
      </view>
    </view>

    <!-- Filter Bottom Sheet -->
    <view v-if="showFilter" class="filter-mask" @click="showFilter = false" />
    <view class="filter-sheet" :class="{ 'filter-sheet-show': showFilter }">
      <view class="filter-header">
        <text class="filter-title">筛选</text>
        <text class="filter-close" @click="showFilter = false">✕</text>
      </view>

      <!-- Service Types -->
      <view class="filter-section">
        <text class="filter-label">玩法类型</text>
        <view class="filter-chips">
          <view
            v-for="item in serviceTypeOptions"
            :key="item.value"
            class="chip"
            :class="{ 'chip-active': tempSelectedTypes.includes(item.value) }"
            @click="toggleTempType(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <!-- Sort -->
      <view class="filter-section">
        <text class="filter-label">排序方式</text>
        <view class="filter-chips">
          <view
            v-for="item in sortOptions"
            :key="item.value"
            class="chip"
            :class="{ 'chip-active': tempSortBy === item.value }"
            @click="tempSortBy = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <!-- Operating Duration -->
      <view class="filter-section">
        <text class="filter-label">运营时长</text>
        <view class="filter-chips">
          <view
            v-for="item in durationOptions"
            :key="item.value"
            class="chip"
            :class="{ 'chip-active': tempMinDays === item.value }"
            @click="tempMinDays = item.value"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <!-- Has Company Info -->
      <view class="filter-section">
        <text class="filter-label">有工商信息</text>
        <switch :checked="tempHasCompanyInfo" @change="tempHasCompanyInfo = ($event as any).detail.value" />
      </view>

      <!-- Actions -->
      <view class="filter-actions">
        <view class="filter-action-reset" @click="resetTempFilters">重置</view>
        <view class="filter-action-confirm" @click="applyFilters">确认</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app';
import { request } from '../../utils/request';

interface Club {
  id: string;
  name: string;
  logo?: string;
  establishedAt?: string;
  serviceTypes: string[];
}

const serviceTypeOptions = [
  { value: 'KNIFE_RUN', label: '跑刀' },
  { value: 'ACCOMPANY', label: '陪玩' },
  { value: 'ESCORT_TRIAL', label: '护航体验' },
  { value: 'ESCORT_STANDARD', label: '护航标准' },
  { value: 'ESCORT_FUN', label: '护航趣味' },
];

const sortOptions = [
  { value: 'createdAt', label: '最新入驻' },
  { value: 'operatingDays', label: '运营最久' },
];

const durationOptions = [
  { value: 0, label: '不限' },
  { value: 180, label: '半年以上' },
  { value: 365, label: '1年以上' },
  { value: 730, label: '2年以上' },
];

// Main state
const keyword = ref('');
const selectedTypes = ref<string[]>([]);
const sortBy = ref('createdAt');
const minDays = ref(0);
const hasCompanyInfo = ref(false);

// Temp state for bottom sheet
const showFilter = ref(false);
const tempSelectedTypes = ref<string[]>([]);
const tempSortBy = ref('createdAt');
const tempMinDays = ref(0);
const tempHasCompanyInfo = ref(false);

// List state
const clubs = ref<Club[]>([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const loading = ref(false);
const noMore = ref(false);

const hasActiveFilters = computed(() => {
  return selectedTypes.value.length > 0
    || sortBy.value !== 'createdAt'
    || minDays.value > 0
    || hasCompanyInfo.value;
});

function getTypeLabel(type: string) {
  return serviceTypeOptions.find(t => t.value === type)?.label || type;
}

function getOperatingDays(establishedAt?: string) {
  if (!establishedAt) return 0;
  const diff = Date.now() - new Date(establishedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function toggleTempType(value: string) {
  const idx = tempSelectedTypes.value.indexOf(value);
  if (idx >= 0) {
    tempSelectedTypes.value.splice(idx, 1);
  } else {
    tempSelectedTypes.value.push(value);
  }
}

function resetTempFilters() {
  tempSelectedTypes.value = [];
  tempSortBy.value = 'createdAt';
  tempMinDays.value = 0;
  tempHasCompanyInfo.value = false;
}

function applyFilters() {
  selectedTypes.value = [...tempSelectedTypes.value];
  sortBy.value = tempSortBy.value;
  minDays.value = tempMinDays.value;
  hasCompanyInfo.value = tempHasCompanyInfo.value;
  showFilter.value = false;
  resetAndLoad();
}

function handleSearch() {
  resetAndLoad();
}

function clearSearch() {
  keyword.value = '';
  resetAndLoad();
}

function resetAndLoad() {
  clubs.value = [];
  page.value = 1;
  noMore.value = false;
  fetchClubs();
}

async function fetchClubs() {
  if (loading.value) return;
  if (noMore.value) return;

  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set('page', String(page.value));
    params.set('pageSize', String(pageSize));
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim());
    if (selectedTypes.value.length > 0) {
      params.set('serviceTypes', selectedTypes.value.join(','));
    }
    if (sortBy.value !== 'createdAt') params.set('sortBy', sortBy.value);
    if (minDays.value > 0) params.set('minOperatingDays', String(minDays.value));
    if (hasCompanyInfo.value) params.set('hasCompanyInfo', 'true');

    const res = await request<{ data: Club[]; total: number }>({
      url: `/api/client/clubs?${params.toString()}`,
    });

    clubs.value = [...clubs.value, ...res.data];
    total.value = res.total;
    page.value += 1;
    noMore.value = clubs.value.length >= res.total;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/clubs/detail?id=${id}` });
}

// Open filter sheet: sync main state to temp
function openFilter() {
  tempSelectedTypes.value = [...selectedTypes.value];
  tempSortBy.value = sortBy.value;
  tempMinDays.value = minDays.value;
  tempHasCompanyInfo.value = hasCompanyInfo.value;
  showFilter.value = true;
}

onLoad(() => {
  fetchClubs();
});

onReachBottom(() => {
  fetchClubs();
});

onPullDownRefresh(async () => {
  clubs.value = [];
  page.value = 1;
  noMore.value = false;
  await fetchClubs();
  uni.stopPullDownRefresh();
});
</script>

<style scoped>
.page {
  background-color: #f5f5f5;
  min-height: 100vh;
}

.search-bar {
  background: #fff;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 12rpx 24rpx;
  gap: 12rpx;
  flex: 1;
}

.search-icon {
  font-size: 28rpx;
  color: #999;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #222;
  background: transparent;
}

.search-clear {
  font-size: 28rpx;
  color: #bbb;
  padding: 4rpx;
}

.filter-btn {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.filter-icon {
  font-size: 36rpx;
  color: #666;
}

.filter-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #ef4444;
}

.club-list {
  padding: 16rpx;
}

.club-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.club-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}

.club-info {
  flex: 1;
  min-width: 0;
}

.club-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #222;
  margin-bottom: 6rpx;
}

.club-days {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.club-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.service-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #dbeafe;
  color: #3b82f6;
}

.loading-hint {
  text-align: center;
  font-size: 26rpx;
  color: #999;
  padding: 32rpx 0;
}

.empty-hint {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 120rpx 0;
  font-size: 28rpx;
  color: #bbb;
}

/* Filter Bottom Sheet */
.filter-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.filter-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 101;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  max-height: 80vh;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom);
}

.filter-sheet-show {
  transform: translateY(0);
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
}

.filter-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #222;
}

.filter-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.filter-section {
  padding: 20rpx 32rpx;
}

.filter-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
  display: block;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 12rpx 28rpx;
  border-radius: 40rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 26rpx;
  color: #555;
  background: #fff;
}

.chip-active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.filter-actions {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid #f0f0f0;
}

.filter-action-reset {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 40rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 28rpx;
  color: #666;
}

.filter-action-confirm {
  flex: 2;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 40rpx;
  background: #3b82f6;
  font-size: 28rpx;
  color: #fff;
}
</style>
```

注意模板中筛选按钮的 `@click` 应调用 `openFilter()` 而不是直接设置 `showFilter = true`，以同步临时状态：

```html
<view class="filter-btn" @click="openFilter">
```

- [ ] **Step 3: 验证小程序构建**

```bash
cd apps/uniapp && pnpm build:mp-weixin
```

Expected: 构建成功。

- [ ] **Step 4: Commit**

```bash
git add apps/uniapp/src/pages.json apps/uniapp/src/pages/clubs/index.vue
git commit -m "feat(uniapp): enable pull-to-refresh and add advanced filter bottom sheet for club list"
```

---

### Task 6: 更新需求文档和设计文档

**Files:**
- Modify: `docs/requirements.md`
- Modify: `docs/design.md`

- [ ] **Step 1: 更新 requirements.md 俱乐部列表页部分**

将 `#### 俱乐部列表页` 部分更新为：

```markdown
#### 俱乐部列表页
- 卡片展示：Logo + 名称 + 运营时长 + 服务类型标签，不展示价格
- 下拉刷新：支持下拉刷新列表数据
- 搜索：俱乐部名称模糊搜索
- 高级筛选（底部弹窗）：
  - 玩法类型：多选（跑刀、陪玩、护航体验、护航标准、护航趣味）
  - 排序方式：最新入驻（默认）、运营最久
  - 运营时长：不限（默认）、半年以上、1年以上、2年以上
  - 有工商信息：开关
- 搜索与筛选可叠加
- 点击进入俱乐部详情页
```

- [ ] **Step 2: 更新 design.md 相关部分**

在 `clubs` 表字段说明中新增 `serviceTypes` 列的描述。在客户端 API 部分更新 `GET /api/client/clubs` 的参数列表，增加 `sortBy`, `minOperatingDays`, `hasCompanyInfo` 参数说明。

- [ ] **Step 3: Commit**

```bash
git add docs/requirements.md docs/design.md
git commit -m "docs: update requirements and design for club list advanced filter"
```
