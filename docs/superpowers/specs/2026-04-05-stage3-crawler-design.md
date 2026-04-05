# Stage 3: 爬虫与视频采集 — 设计文档

> 前置：Stage 2 完成（Club 数据可用于关键词搜索）

## 设计决策

1. **平台范围**：MVP 只实现 B站 Adapter，抖音定义统一接口但暂不实现
2. **字幕抓取**：暂不实现，AI 解析（Stage 4）只用标题 + 简介作为输入
3. **定时任务**：动态频率，从 SystemConfig 读取 `crawler.frequency`，通过 NestJS `SchedulerRegistry` 动态注册/更新 Interval，Admin 后台可实时调整

## 数据模型

### Blogger（监控博主）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| platform | enum(BILIBILI, DOUYIN) | 平台 |
| externalId | varchar | 平台用户 ID |
| name | varchar | 博主名称 |
| isActive | boolean | 是否启用，默认 true |
| createdAt | timestamp | |

### CrawlTask（爬虫执行记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| type | enum(BLOGGER, KEYWORD) | 博主抓取 / 关键词搜索 |
| targetId | varchar | 博主 ID 或搜索关键词 |
| status | enum(RUNNING, SUCCESS, FAILED) | |
| startedAt | timestamp | |
| finishedAt | timestamp | nullable |
| videoCount | int | 本次抓取新视频数，默认 0 |
| errorMessage | text | 失败原因，nullable |

### Video（视频）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| clubId | uuid | nullable，AI 匹配或手动关联 |
| platform | enum(BILIBILI, DOUYIN) | |
| externalId | varchar | 平台视频 ID |
| title | varchar | |
| coverUrl | varchar | |
| videoUrl | varchar | |
| description | text | nullable |
| authorName | varchar | |
| authorId | varchar | 博主平台 ID |
| category | enum(REVIEW, SENTIMENT) | 评测 vs 舆情 |
| subtitleText | text | nullable，本期不抓取 |
| aiParsed | boolean | 默认 false |
| aiClubMatch | varchar | nullable |
| aiSummary | text | nullable |
| aiSentiment | enum(POSITIVE, NEGATIVE, NEUTRAL) | nullable |
| publishedAt | timestamp | 视频发布时间 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

唯一索引：`platform + externalId`

## 爬虫 Adapter 接口

```typescript
interface CrawlerAdapter {
  platform: VideoPlatform;
  fetchBloggerVideos(bloggerId: string): Promise<RawVideo[]>;
  searchVideos(keyword: string): Promise<RawVideo[]>;
}

interface RawVideo {
  externalId: string;
  title: string;
  coverUrl: string;
  videoUrl: string;
  description?: string;
  authorName: string;
  authorId: string;
  publishedAt: Date;
}
```

- `BilibiliAdapter`：调用 B站公开接口实现
- `DouyinAdapter`：实现接口但所有方法抛出 NotImplemented

## 两条抓取任务线

| | BloggerCrawl (REVIEW) | KeywordCrawl (SENTIMENT) |
|---|---|---|
| 来源 | Blogger 表中 isActive=true 的博主 | Club 表中 published 状态的俱乐部名称 |
| Adapter 方法 | `fetchBloggerVideos(bloggerId)` | `searchVideos(clubName)` |
| 去重 | `platform + externalId` 唯一索引，冲突跳过 | 同左 |
| 入库 category | REVIEW | SENTIMENT |
| aiParsed | false（Stage 4 处理） | false |

## 定时任务机制

- 使用 `@nestjs/schedule` 的 `SchedulerRegistry`
- 启动时从 SystemConfig 读取 `crawler.frequency`（分钟），注册 Interval
- Admin 更新 `crawler.frequency` 时，删除旧 Interval 并注册新的
- 每次触发执行：先跑 BloggerCrawl，再跑 KeywordCrawl
- 支持 Admin 手动触发（独立于定时任务）

## Admin 后台功能

### 博主管理
- 列表（分页、按平台筛选）
- 新增博主（平台 + 平台用户 ID + 名称）
- 编辑、启用/停用、删除

### 爬虫管理
- 爬虫任务执行记录列表（分页、按状态/类型筛选）
- 抓取频率配置（读写 SystemConfig `crawler.frequency`）
- 手动触发抓取按钮

### 视频列表（只读预览）
- 视频列表（分页、按平台/分类筛选）
- 本期只做列表展示，手动关联和视频管理放 Stage 4

## NestJS 模块结构

```
server/src/
├── crawler/
│   ├── crawler.module.ts
│   ├── crawler.service.ts          # 定时任务调度 + 手动触发
│   ├── adapters/
│   │   ├── crawler-adapter.interface.ts
│   │   ├── bilibili.adapter.ts
│   │   └── douyin.adapter.ts       # NotImplemented 占位
│   └── crawl-task.service.ts       # CrawlTask 记录管理
├── admin/
│   ├── bloggers/
│   │   ├── bloggers.controller.ts
│   │   └── bloggers.service.ts
│   ├── crawl-tasks/
│   │   ├── crawl-tasks.controller.ts
│   │   └── crawl-tasks.service.ts
│   ├── videos/
│   │   ├── videos.controller.ts
│   │   └── videos.service.ts
│   └── system-configs/
│       ├── system-configs.controller.ts
│       └── system-configs.service.ts
└── database/schema/
    ├── blogger.schema.ts
    ├── crawl-task.schema.ts
    └── video.schema.ts
```
