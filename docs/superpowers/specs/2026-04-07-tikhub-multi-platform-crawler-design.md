# TikHub 多平台数据采集重构设计

## 概述

将原有的直接调用平台 API 的爬虫方案重构为统一接入 TikHub 数据平台，扩展采集范围至 5 个社交平台（B站、抖音、小红书、视频号、公众号），同时泛化数据模型以支持视频、图文笔记、公众号文章等多种内容形态。

## 支持平台

| 平台 | 枚举值 | 内容形态 | 采集能力 |
|------|--------|---------|---------|
| B站 | `BILIBILI` | 视频 | 博主视频列表 + 关键词搜索 |
| 抖音 | `DOUYIN` | 视频 | 博主视频列表 + 关键词搜索 |
| 小红书 | `XIAOHONGSHU` | 视频 + 图文笔记 | 博主笔记列表 + 关键词搜索 |
| 视频号 | `WECHAT_CHANNELS` | 视频 | 博主视频列表 + 关键词搜索 |
| 公众号 | `WECHAT_MP` | 文章 | 按公众号ID拉取文章列表（无关键词搜索能力） |

## 采集线

### 三条采集线

| 采集线 | 内容分类 | 数据来源 | 覆盖平台 |
|--------|---------|---------|---------|
| 评测采集 | REVIEW | 指定博主列表 → 抓最新内容 | B站、抖音、小红书、视频号 |
| 舆情采集 | SENTIMENT | 俱乐部名称关键词搜索 + 指定博主采集 | B站、抖音、小红书、视频号 |
| 公告采集 | ANNOUNCEMENT | 俱乐部官方公众号文章列表 | 仅公众号 |

### 采集逻辑

- **评测采集**：查询 `crawlCategories` 包含 `REVIEW` 的 BloggerAccount，按平台调用对应 API 获取最新内容
- **舆情采集**：两条并行路径
  1. 按俱乐部名称关键词搜索（4个平台）
  2. 查询 `crawlCategories` 包含 `SENTIMENT` 的 BloggerAccount 采集
- **公告采集**：遍历有 `wechatMpGhid` 的俱乐部，拉取公众号文章列表

## 数据模型变更

### Content 表（替代原 Video 表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| platform | enum | BILIBILI / DOUYIN / XIAOHONGSHU / WECHAT_CHANNELS / WECHAT_MP |
| contentType | enum | VIDEO / NOTE / ARTICLE |
| category | enum | REVIEW / SENTIMENT / ANNOUNCEMENT |
| externalId | string | 平台侧唯一ID |
| externalUrl | string / null | 原始链接 |
| title | string | 标题 |
| description | text / null | 简介/正文摘要 |
| coverUrl | string / null | 封面图 |
| authorName | string / null | 作者名（冗余，方便展示） |
| publishedAt | timestamp / null | 原始发布时间 |
| bloggerId | uuid / null | 关联博主（博主采集时有值） |
| clubId | uuid / null | 关联俱乐部（AI匹配或手动关联） |
| groupId | uuid / null | 跨平台聚合组ID，同组内容共享同一 groupId |
| isPrimary | boolean | 是否为组内主内容（列表展示入口），默认 true |
| groupPlatforms | enum[] / null | 组内所有平台列表（仅主记录维护），用于列表渲染平台图标 |
| aiParsed | boolean | AI 是否已解析，默认 false |
| aiSummary | text / null | AI 摘要 |
| aiSentiment | enum / null | POSITIVE / NEGATIVE / NEUTRAL |
| aiClubMatch | string / null | AI 识别的俱乐部名 |
| createdAt | timestamp | 入库时间 |
| updatedAt | timestamp | 更新时间 |

**唯一约束**：`(platform, externalId)`

**索引**：`isPrimary`、`groupId`、`category`、`platform`、`publishedAt`

**聚合规则**：
- 未聚合内容：`groupId = null`，`isPrimary = true`
- 聚合组内：多条共享同一 `groupId`，一条 `isPrimary = true`，其余 `false`
- 列表查询：`WHERE isPrimary = true ORDER BY publishedAt DESC`
- 获取同组平台源：`WHERE groupId = :groupId`
- `groupPlatforms` 仅在主记录上维护，聚合/拆分操作时同步更新

### Blogger 表（改造）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| name | string | 博主名称（统一显示名） |
| avatar | string / null | 头像 |
| isActive | boolean | 是否启用采集 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### BloggerAccount 表（新增）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| bloggerId | uuid | 关联 Blogger |
| platform | enum | 平台 |
| platformUserId | string | 平台侧用户ID（uid / sec_user_id / user_id / username） |
| platformUsername | string / null | 平台侧用户名 |
| crawlCategories | enum[] | 参与的采集线：REVIEW / SENTIMENT，支持多选 |
| lastCrawledAt | timestamp / null | 上次采集时间 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**唯一约束**：`(platform, platformUserId)`

### Club 表扩展

| 新增字段 | 类型 | 说明 |
|---------|------|------|
| wechatMpGhid | string / null | 官方公众号 ghid，用于公告采集 |

### CrawlTask 表（任务定义）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| taskType | enum | BLOGGER_POSTS / KEYWORD_SEARCH / MP_ARTICLES |
| category | enum | REVIEW / SENTIMENT / ANNOUNCEMENT |
| platform | enum | 目标平台 |
| targetId | string | BloggerAccount ID / Club ID |
| cronExpression | string | 调度表达式，默认 `0 */1 * * *`（每小时） |
| isActive | boolean | 是否启用 |
| lastRunAt | timestamp / null | 上次执行时间 |
| nextRunAt | timestamp / null | 下次计划执行时间 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### CrawlTaskRun 表（执行记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| crawlTaskId | uuid | 关联任务 |
| status | enum | RUNNING / SUCCESS / FAILED |
| startedAt | timestamp | 开始时间 |
| finishedAt | timestamp / null | 结束时间 |
| itemsFetched | integer | 抓取条数 |
| itemsCreated | integer | 新入库条数（去重后） |
| errorMessage | text / null | 失败原因 |

## 架构设计

### TikHubClient

统一封装层，职责：
- 认证管理（Bearer token）
- 速率限制（令牌桶，防触发 429）
- 统一重试（指数退避，最多 3 次）
- 错误处理与日志

```typescript
class TikHubClient {
  // 抖音
  fetchDouyinUserPosts(secUserId: string, cursor?: number): Promise<TikHubResponse>
  searchDouyinVideos(keyword: string, cursor?: number, sortType?: string): Promise<TikHubResponse>

  // B站
  fetchBilibiliUserPosts(uid: string, page?: number): Promise<TikHubResponse>
  searchBilibiliVideos(keyword: string, page?: number): Promise<TikHubResponse>

  // 小红书
  fetchXiaohongshuUserNotes(userId: string, cursor?: string): Promise<TikHubResponse>
  searchXiaohongshuNotes(keyword: string, page?: number): Promise<TikHubResponse>

  // 视频号
  fetchWechatChannelsUserPosts(username: string, lastBuffer?: string): Promise<TikHubResponse>
  searchWechatChannelsVideos(keywords: string): Promise<TikHubResponse>

  // 公众号
  fetchWechatMpArticles(ghid: string, offset?: number): Promise<TikHubResponse>
}
```

### PlatformAdapter

每平台一个实现，将 TikHub 返回数据标准化为统一的 `RawContent`：

```typescript
interface RawContent {
  platform: Platform
  externalId: string
  externalUrl: string | null
  contentType: 'VIDEO' | 'NOTE' | 'ARTICLE'
  title: string
  description: string | null
  coverUrl: string | null
  authorName: string | null
  authorPlatformId: string | null
  publishedAt: Date | null
}

interface PlatformAdapter {
  platform: Platform
  normalizeUserPosts(raw: TikHubResponse): RawContent[]
  normalizeSearchResults(raw: TikHubResponse): RawContent[]
}
```

5 个实现：`BilibiliAdapter`、`DouyinAdapter`、`XiaohongshuAdapter`、`WechatChannelsAdapter`、`WechatMpAdapter`（公众号仅需 `normalizeUserPosts`，无搜索）。

### 调用链路

```
CrawlService (业务编排)
  → PlatformAdapter (选择平台)
    → TikHubClient (发起 API 请求)
      → TikHub API
    ← TikHubResponse (原始数据)
  ← RawContent[] (标准化数据)
  → 去重 (platform + externalId) + 入库 Content 表
  → 触发 AI 解析
```

### 模块目录结构

```
crawler/
├── crawler.module.ts
├── crawler.service.ts              # 采集编排：遍历任务、调用适配器、去重入库
├── crawler-scheduler.service.ts    # 调度管理：注册/更新定时器
├── tikhub.client.ts                # TikHub API 统一封装
├── adapters/
│   ├── platform-adapter.interface.ts
│   ├── bilibili.adapter.ts
│   ├── douyin.adapter.ts
│   ├── xiaohongshu.adapter.ts
│   ├── wechat-channels.adapter.ts
│   └── wechat-mp.adapter.ts
```

### 调度实现

- 启动时从 CrawlTask 表加载所有 active 任务，注册到 `SchedulerRegistry`
- Admin 修改任务配置后，通过 `SchedulerRegistry` 动态更新/删除/新增定时器
- 默认频率：全部每小时一次，Admin 可手动调整单个任务的 cron 表达式

## 跨平台内容聚合

### AI 聚合流程

Content 入库后触发 AI 解析，解析阶段同时判断跨平台重复：

1. 从同一 `category` + 近期（7天内）的 Content 中检索候选
2. AI 判断标题相似度 + 作者是否为同一 Blogger 的不同 Account
3. 匹配成功 → 设置相同 `groupId`，确定 `isPrimary`，更新主记录的 `groupPlatforms`
4. 匹配失败 → `groupId` 保持 null，独立展示

### 前端展示

- 有 `groupPlatforms` 的内容卡片：显示多平台图标，详情页列出所有平台源链接（类似豆瓣影视作品多平台入口）
- 无 `groupPlatforms` 的内容卡片：只显示自身平台图标

### Admin 手动操作

- 合并：选择多条 Content → 设置相同 groupId，指定主记录，更新 groupPlatforms
- 拆分：从组中移除某条 Content → 清空 groupId，重置 isPrimary = true

## 首页改造

### Tab 结构

| Tab | 内容 | 查询条件 |
|-----|------|---------|
| 推荐 | 全类型混排 | `WHERE isPrimary = true ORDER BY publishedAt DESC` |
| 评测 | 仅评测内容 | `WHERE isPrimary = true AND category = 'REVIEW'` |
| 舆情 | 仅舆情内容 | `WHERE isPrimary = true AND category = 'SENTIMENT'` |
| 公告 | 公众号公告 + 系统公告 | `WHERE isPrimary = true AND category = 'ANNOUNCEMENT'` + Announcement 表 |

## Admin 后台变更

### 爬虫管理

- 任务列表：展示所有 CrawlTask，支持按平台/类型/状态筛选
- 单个任务可编辑 cron 表达式、启用/停用
- 执行记录列表（CrawlTaskRun）
- 手动触发单个任务

### 博主管理

- 博主列表展示关联的所有平台账号
- 新增/编辑博主时管理多个 BloggerAccount
- 每个 Account 配置：平台、平台用户ID、采集分类（REVIEW / SENTIMENT 多选）

### 俱乐部管理扩展

- 新增公众号 ghid 字段
- 保存时自动创建/更新对应的公告采集 CrawlTask

### 内容管理（原视频管理）

- 列表支持按平台、内容类型、分类、聚合状态筛选
- 手动关联俱乐部
- 手动合并/拆分 ContentGroup
- 手动添加内容 URL

## SystemConfig 新增项

| key | 默认值 | 说明 |
|-----|--------|------|
| `tikhub.apiKey` | - | TikHub API Key |
| `tikhub.baseUrl` | `https://api.tikhub.io` | TikHub API 地址 |
| `tikhub.rateLimit` | 10 | 每秒最大请求数 |

## TikHub API 端点参考

### 抖音

| 用途 | 端点 | 方法 |
|------|------|------|
| 用户视频列表 | `/api/v1/douyin/app/v3/fetch_user_post_videos` | GET |
| 视频搜索 | `/api/v1/douyin/search/fetch_video_search_v2` | POST |
| 视频详情 | `/api/v1/douyin/app/v3/fetch_one_video` | GET |

### B站

| 用途 | 端点 | 方法 |
|------|------|------|
| 用户视频列表 | `/api/v1/bilibili/web/fetch_user_post_videos` | GET |
| 综合搜索 | `/api/v1/bilibili/web/fetch_general_search` | GET |
| 视频详情 | `/api/v1/bilibili/web/fetch_video_detail` | GET |

### 小红书

| 用途 | 端点 | 方法 |
|------|------|------|
| 用户笔记列表 | `/api/v1/xiaohongshu/web_v3/fetch_user_notes` | GET |
| 搜索笔记 | `/api/v1/xiaohongshu/web_v3/fetch_search_notes` | GET |
| 笔记详情 | `/api/v1/xiaohongshu/web_v3/fetch_note_detail` | GET |

### 视频号

| 用途 | 端点 | 方法 |
|------|------|------|
| 用户主页视频 | `/api/v1/wechat_channels/fetch_home_page` | POST |
| 搜索视频 | `/api/v1/wechat_channels/fetch_default_search` | POST |
| 视频详情 | `/api/v1/wechat_channels/fetch_video_detail` | GET |

### 公众号

| 用途 | 端点 | 方法 |
|------|------|------|
| 文章列表 | `/api/v1/wechat_mp/web/fetch_mp_article_list` | GET |
| 文章详情(JSON) | `/api/v1/wechat_mp/web/fetch_mp_article_detail_json` | GET |
