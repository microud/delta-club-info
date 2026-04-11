# Delta Club Info - 技术设计文档

三角洲行动烽火地带陪玩俱乐部信息平台。帮助玩家快速找到靠谱俱乐部、查看真实评测、对比价格和服务。为俱乐部提供精准引流渠道。

## 目标用户

- **普通玩家**：浏览俱乐部、筛选服务、查看评测视频、阅读用户评价、横向对比
- **俱乐部运营方**：通过付费推广获得曝光

## 技术栈

| 层级 | 选型 |
|------|------|
| 项目结构 | pnpm workspace + Turborepo Monorepo |
| 后端 | NestJS (TypeScript) |
| ORM | Drizzle |
| 数据库 | PostgreSQL |
| Admin 前端 | Vite + React + shadcn-admin + TanStack Router/Table/Query + Zustand |
| 表单验证 | React Hook Form + Zod |
| 小程序 | UniApp (Vue3 + Vite + TypeScript) |
| 对象存储 | S3 兼容（Sealos Cloud ObjectStorage） |
| 部署 | Sealos Cloud |
| AI SDK | Vercel AI SDK (`ai` + provider adapters) |
| AI Providers | xAI Grok（视频/服务解析）、OpenAI、Anthropic（可切换） |
| 内容审核 AI | 国内模型（通过 LLM Provider 接入） |

## 项目结构

```
delta-club-info/
├── apps/
│   ├── server/          # NestJS API (Admin + 小程序共用)
│   ├── admin/           # Vite + React + shadcn-admin
│   └── uniapp/          # UniApp (Vue3 + Vite + TS)（后期）
├── packages/
│   └── shared/          # 共享类型定义、常量、工具函数
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## 系统架构

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Admin SPA  │  │ UniApp 小程序 │  │  微信公众号   │  │  企业微信     │
│  (React)     │  │  (Vue3)      │  │  (后期)      │  │  (Webhook)   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │
       └────────┬────────┴────────┬────────┴────────┬────────┘
                │                 │                 │
         ┌──────▼──────────────────▼──────────────────▼──────┐
         │              NestJS API Server                     │
         │                                                    │
         │  AdminModule      ClientModule    WechatWorkModule │
         │  (JWT 鉴权)       (微信鉴权)      (企微回调)       │
         │                                                    │
         │  CrawlerModule    AiParseModule   StorageModule    │
         │  (定时爬虫)       (多Provider AI) (S3 对象存储)    │
         │                                                    │
         │  SharedModule                                      │
         │  (Entity, 通用 Service)                            │
         └──────────────────────┬─────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
         ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
         │ PostgreSQL   │ │ S3 Storage │ │ AI APIs     │
         └─────────────┘ └────────────┘ │ (xAI/OpenAI │
                                        │  /Anthropic) │
                                        └─────────────┘
```

### 关键架构决策

- **单服务多模块**：AdminModule 和 ClientModule 共存于一个 NestJS 实例，路由隔离，通过不同的 Guard 做鉴权
- **AI Provider 抽象**：通过 Vercel AI SDK 统一接口，支持 xAI/OpenAI/Anthropic 多供应商切换，Admin 后台可配置
- **爬虫内置**：作为 NestJS 模块，用 `@nestjs/schedule` + `SchedulerRegistry` 做动态定时任务
- **企业微信 Webhook**：独立路由，签名验证鉴权，不走 AdminGuard
- **S3 存储**：全局 StorageModule，统一管理文件上传和签名 URL

### API 路由约定

```
/admin/*              — Admin 后台接口，AdminGuard (JWT) 鉴权
/api/client/*         — 小程序端接口，WechatAuthGuard 鉴权（部分接口允许匿名访问）
/webhook/wechat-work  — 企业微信回调，签名验证鉴权
```

RESTful 风格，示例：

```
# Admin
POST   /admin/auth/login
GET    /admin/clubs
POST   /admin/clubs
GET    /admin/clubs/:id
PUT    /admin/clubs/:id
DELETE /admin/clubs/:id
GET    /admin/clubs/:id/services
POST   /admin/clubs/:id/services
POST   /admin/clubs/:id/services/ai-import     (AI 智能录入解析)
POST   /admin/clubs/:id/services/batch          (批量创建服务)
GET    /admin/clubs/:id/rules
POST   /admin/clubs/:id/rules
POST   /admin/clubs/fetch-wechat-avatar         (获取公众号头像)
POST   /admin/upload                            (通用文件上传)
GET    /admin/promotions
POST   /admin/promotions
GET    /admin/bloggers
POST   /admin/bloggers
PATCH  /admin/bloggers/:id
DELETE /admin/bloggers/:id
POST   /admin/bloggers/:id/accounts             (添加博主账号)
PATCH  /admin/bloggers/accounts/:accountId      (更新博主账号)
DELETE /admin/bloggers/accounts/:accountId      (删除博主账号)
GET    /admin/contents                          (内容列表，支持筛选)
POST   /admin/contents/:id/link-club            (手动关联俱乐部)
POST   /admin/contents/merge                    (合并内容组)
POST   /admin/contents/:id/split                (从内容组拆分)
GET    /admin/crawl-tasks                       (爬虫任务列表，含目标名称)
POST   /admin/crawl-tasks                       (新建爬虫任务)
GET    /admin/crawl-tasks/runs                  (爬虫运行记录)
PATCH  /admin/crawl-tasks/:id                   (更新任务全字段)
DELETE /admin/crawl-tasks/:id                   (删除爬虫任务)
POST   /admin/crawl-tasks/:id/trigger           (手动触发单个任务)
GET    /admin/parse-tasks
GET    /admin/parse-tasks/:id
PUT    /admin/parse-tasks/:id                   (审核确认)
GET    /admin/ai-configs
PUT    /admin/ai-configs/:id
GET    /admin/system-configs
PUT    /admin/system-configs/:key

# Webhook
GET    /webhook/wechat-work                     (URL 验证 echostr)
POST   /webhook/wechat-work                     (消息接收)

# Client (小程序)
POST   /api/client/auth/login                   (静默登录，wx.login code → token)
POST   /api/client/auth/profile                 (提交授权后的头像和昵称，需登录)
GET    /api/client/home/banners                 (首页推广轮播)
GET    /api/client/home/feed                    (多 Tab feed 流，?category=REVIEW|SENTIMENT|ANNOUNCEMENT，分页)
GET    /api/client/clubs                        (列表 + 高级筛选 + 搜索，支持 serviceTypes/sortBy/minOperatingDays/hasCompanyInfo)
GET    /api/client/clubs/:id                    (详情：基本信息+工商+前身俱乐部)
GET    /api/client/clubs/:id/services           (服务项列表)
GET    /api/client/clubs/:id/rules              (规则列表)
GET    /api/client/clubs/:id/contents            (关联内容，category=REVIEW|SENTIMENT)
GET    /api/client/contents/:id                 (内容详情，含同组平台源)
GET    /api/client/announcements/:id            (公告详情)
GET    /api/client/user/profile                 (用户信息，需登录)
GET    /api/client/user/favorites               (收藏列表，需登录)
POST   /api/client/user/favorites/:clubId       (添加收藏，需登录+授权)
DELETE /api/client/user/favorites/:clubId       (取消收藏，需登录)
```

### 初始管理员

Stage 1 通过 seed 脚本创建初始管理员账号：
- 用户名和密码从环境变量 `ADMIN_INIT_USERNAME` / `ADMIN_INIT_PASSWORD` 读取
- 密码使用 bcrypt 哈希存储
- 仅在 Admin 表为空时执行，避免重复创建

## 数据模型

### Club (俱乐部)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| name | varchar | 俱乐部名称 |
| logo | varchar | Logo URL |
| description | text | 简介 |
| wechatOfficialAccount | varchar | 公众号 ID (nullable) |
| wechatMiniProgram | varchar | 小程序 AppID (nullable) |
| contactInfo | varchar | 联系方式 (nullable) |
| status | enum | draft / published / closed / archived |
| establishedAt | date | 俱乐部成立日期 (nullable) |
| closedAt | date | 倒闭日期 (nullable) |
| predecessorId | uuid | 前身俱乐部 ID (nullable, 自关联 Club) |
| wechatMpGhid | varchar | 官方公众号 ghid (nullable, 用于公告采集) |
| closureNote | text | 倒闭备注 (nullable) |
| companyName | varchar(300) | 公司全称 (nullable) |
| creditCode | varchar(18) | 统一社会信用代码 (nullable) |
| legalPerson | varchar(100) | 法人 (nullable) |
| registeredAddress | text | 注册地址 (nullable) |
| businessScope | text | 经营范围 (nullable) |
| registeredCapital | varchar(100) | 注册资本 (nullable) |
| companyEstablishedAt | date | 公司成立日期 (nullable) |
| businessStatus | varchar(50) | 经营状态 (nullable) |
| orderPosters | text[] | 订单海报图片 URL 数组，默认空数组 |
| serviceTypes | text[] | 支持的服务类型枚举值数组（KNIFE_RUN/ACCOMPANY/ESCORT_TRIAL/ESCORT_STANDARD/ESCORT_FUN），默认空数组 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

状态说明：
- **draft**：草稿，未发布
- **published**：正常运营中，展示"已运营 X 天"（基于 establishedAt）
- **closed**：已倒闭，进入俱乐部墓碑列表
- **archived**：归档，不展示

秽土转生：新俱乐部的 predecessorId 指向前身俱乐部，支持链式追溯（A → B → C）。

### ClubService (俱乐部服务项)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| clubId | uuid | 关联俱乐部 |
| type | enum | KNIFE_RUN / ACCOMPANY / ESCORT_TRIAL / ESCORT_STANDARD / ESCORT_FUN |
| priceYuan | decimal | 人民币价格 (跑刀/护航体验/护航标准) |
| priceHafuCoin | decimal | 哈夫币数量 (跑刀/护航体验/护航标准) |
| tier | varchar | 陪玩档位名 (娱乐/初级技术/高级技术等) |
| pricePerHour | decimal | 小时单价 (陪玩) |
| gameName | varchar | 趣味玩法名称 (护航趣味) |
| hasGuarantee | boolean | 是否保底 (护航趣味) |
| guaranteeHafuCoin | decimal | 保底哈夫币数 (护航趣味) |
| rules | text | 规则描述 (护航趣味) |
| sortOrder | int | 排序 |
| images | text[] | 辅助图片 URL 数组，默认空数组 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

各字段按 type 使用，不同类型用到的字段不同：

- **KNIFE_RUN (跑刀)**：priceYuan + priceHafuCoin
- **ACCOMPANY (陪玩)**：tier + pricePerHour
- **ESCORT_TRIAL (护航体验单)**：priceYuan + priceHafuCoin（价格更实惠）
- **ESCORT_STANDARD (护航标准单)**：priceYuan + priceHafuCoin
- **ESCORT_FUN (护航趣味玩法)**：gameName + priceYuan + hasGuarantee + guaranteeHafuCoin + rules

### ClubRule (俱乐部规则)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| clubId | uuid | 关联俱乐部 |
| content | text | 规则原文 |
| aiAnalysis | json | AI 分析结果 |
| sentiment | enum | FAVORABLE / UNFAVORABLE / NEUTRAL |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### PromotionOrder (推广订单)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| clubId | uuid | 关联俱乐部 |
| fee | decimal | 总费用 (元) |
| startAt | date | 开始日期 |
| endAt | date | 结束日期 |
| dailyRate | decimal | 日均费用 (fee / 天数) |
| createdAt | timestamp | |

无需维护状态字段，查询时通过 `startAt <= 当天 AND endAt >= 当天` 判定是否生效。

俱乐部推广排序值 = 所有当前生效订单的 dailyRate 之和。

### WechatMessage (企业微信消息)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| msgId | varchar(64) | 企业微信消息 ID |
| msgType | varchar(20) | text / image |
| content | text | 文本内容 (text 类型, nullable) |
| mediaUrl | varchar(500) | 图片 S3 存储路径 (image 类型, nullable) |
| fromUser | varchar(100) | 发送者企业微信 ID |
| rawPayload | jsonb | 原始消息体 |
| createdAt | timestamp | 接收时间 |

### ParseTask (AI 解析任务)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| status | enum | pending / parsing / completed / failed |
| clubId | uuid | 人工确认时关联的俱乐部 (nullable) |
| parsedResult | jsonb | AI 提取的结构化数据 (nullable) |
| errorMessage | text | 失败原因 (nullable) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

parsedResult 结构：
```json
{
  "clubName": "俱乐部名称",
  "services": [
    {
      "name": "服务名称",
      "tiers": [
        { "price": 128, "guarantee": "788W", "note": "备注" }
      ]
    }
  ],
  "rules": [
    { "content": "规则内容", "category": "分类" }
  ]
}
```

### ParseTaskMessage (解析任务-消息关联)

| 字段 | 类型 | 说明 |
|------|------|------|
| parseTaskId | uuid | FK → parse_tasks |
| wechatMessageId | uuid | FK → wechat_messages |

联合主键：`(parseTaskId, wechatMessageId)`

### AiConfig (AI 配置)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| provider | varchar | 供应商标识 (xai / openai / anthropic) |
| apiKey | varchar | API Key（展示时脱敏） |
| model | varchar | 模型名称 |
| isActive | boolean | 是否启用 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Content (内容，原 Video)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| platform | enum | BILIBILI / DOUYIN / XIAOHONGSHU / WECHAT_CHANNELS / WECHAT_MP |
| contentType | enum | VIDEO / NOTE / ARTICLE |
| category | enum | REVIEW / SENTIMENT / ANNOUNCEMENT |
| externalId | varchar | 平台侧唯一 ID |
| externalUrl | varchar | 原始链接 (nullable) |
| title | varchar | 标题 |
| description | text | 简介/正文摘要 (nullable) |
| coverUrl | varchar | 封面图 (nullable) |
| authorName | varchar | 作者名 (nullable, 冗余方便展示) |
| publishedAt | timestamp | 原始发布时间 (nullable) |
| bloggerId | uuid | 关联博主 (nullable, 博主采集时有值) |
| clubId | uuid | 关联俱乐部 (nullable, AI 匹配或手动关联) |
| groupId | uuid | 跨平台聚合组 ID (nullable, 同组内容共享) |
| isPrimary | boolean | 是否为组内主内容（列表展示入口），默认 true |
| groupPlatforms | enum[] | 组内所有平台列表 (nullable, 仅主记录维护) |
| aiParsed | boolean | 是否已 AI 解析，默认 false |
| aiClubMatch | varchar | AI 识别的俱乐部名 (nullable) |
| aiSummary | text | AI 简要评价 (nullable) |
| aiSentiment | enum | POSITIVE / NEGATIVE / NEUTRAL (nullable) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

唯一索引：`platform + externalId`
索引：`isPrimary`、`groupId`、`category`、`platform`、`publishedAt`

**跨平台聚合规则**：
- 未聚合内容：`groupId = null`，`isPrimary = true`
- 聚合组内：多条共享同一 `groupId`，一条 `isPrimary = true`，其余 `false`
- `groupPlatforms` 仅在主记录上维护，聚合/拆分操作时同步更新
- 列表查询：`WHERE isPrimary = true`，详情获取同组源：`WHERE groupId = :groupId`

### Review (用户评价)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| clubId | uuid | 关联俱乐部 |
| userId | uuid | 关联用户 |
| overallScore | smallint | 总分 1-5 |
| serviceScore | smallint | 服务分 1-5 |
| skillScore | smallint | 技术分 1-5 |
| valueScore | smallint | 性价比分 1-5 |
| content | text | 评价内容 |
| aiModerationStatus | enum | APPROVED / REJECTED / PENDING_MANUAL |
| aiModerationResult | json | AI 审核结果 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

评价仅支持发表观点，不支持互相回复。

### ReviewReaction (评价互动)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| reviewId | uuid | 关联评价 |
| userId | uuid | 关联用户 |
| emojiId | uuid | 关联表情 |
| createdAt | timestamp | |

每个用户对同一条评价只能有一个 reaction（可更换）。唯一约束：`reviewId + userId`。

### ReactionEmoji (可用表情)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| code | varchar | Emoji 字符或标识 |
| sortOrder | int | 排序 |
| isActive | boolean | 是否启用 |

点赞和点踩作为内置 Emoji 处理，与自定义 Emoji 统一模型。Admin 后台管理可用的 Emoji 列表。

### User (微信用户)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| openId | varchar | 微信 openId |
| unionId | varchar | 微信 unionId (nullable) |
| nickname | varchar | 昵称 |
| avatar | varchar | 头像 URL |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Admin (管理员)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| username | varchar | 用户名 |
| passwordHash | varchar | 密码哈希 |
| role | varchar | 角色 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### UserFavorite (用户收藏)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| userId | uuid | 关联用户 |
| clubId | uuid | 关联俱乐部 |
| createdAt | timestamp | |

唯一约束：`userId + clubId`

### Announcement (公告/活动)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| title | varchar | 标题 |
| content | text | 正文 |
| status | enum | draft / published |
| publishedAt | timestamp | 发布时间 (nullable) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### SystemConfig (系统配置)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| key | varchar | 配置键（唯一） |
| value | text | 配置值（JSON 字符串） |
| description | varchar | 配置说明 |
| updatedAt | timestamp | |

预置配置项：
- `tikhub.apiKey` — TikHub API Key
- `tikhub.baseUrl` — TikHub API 地址，默认 `https://api.tikhub.io`
- `tikhub.rateLimit` — TikHub 每秒最大请求数，默认 10

> 企业微信相关配置（corp_id / agent_id / secret / token / encoding_aes_key）目前仅通过环境变量注入，Admin 配置 UI 暂未提供。

敏感字段（secret、api_key 等）在 Admin 后台展示时做脱敏处理（仅显示末 4 位）。

### Blogger (监控博主)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| name | varchar | 博主名称（统一显示名） |
| avatar | varchar | 头像 (nullable) |
| isActive | boolean | 是否启用采集 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### BloggerAccount (博主平台账号)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| bloggerId | uuid | 关联 Blogger |
| platform | enum | BILIBILI / DOUYIN / XIAOHONGSHU / WECHAT_CHANNELS |
| platformUserId | varchar | 平台侧用户 ID (uid / sec_user_id / user_id / username) |
| platformUsername | varchar | 平台侧用户名 (nullable) |
| crawlCategories | enum[] | 参与的采集线：REVIEW / SENTIMENT，支持多选 |
| lastCrawledAt | timestamp | 上次采集时间 (nullable) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

唯一约束：`platform + platformUserId`

### CrawlTask (采集任务定义)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| taskType | enum | BLOGGER_POSTS / KEYWORD_SEARCH / MP_ARTICLES |
| category | enum | REVIEW / SENTIMENT / ANNOUNCEMENT |
| platform | enum | 目标平台 |
| targetId | varchar | BloggerAccount ID / Club ID |
| cronExpression | varchar | 调度表达式，默认 `0 */1 * * *`（每小时） |
| isActive | boolean | 是否启用 |
| lastRunAt | timestamp | 上次执行时间 (nullable) |
| nextRunAt | timestamp | 下次计划执行时间 (nullable) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### CrawlTaskRun (采集执行记录)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| crawlTaskId | uuid | 关联 CrawlTask |
| status | enum | RUNNING / SUCCESS / FAILED |
| startedAt | timestamp | |
| finishedAt | timestamp | (nullable) |
| itemsFetched | int | 抓取条数 |
| itemsCreated | int | 新入库条数（去重后） |
| errorMessage | text | 失败原因 (nullable) |

## 企业微信集成

### 配置
1. 企业微信管理后台创建自建应用
2. 回调 URL：`{server}/webhook/wechat-work`
3. 设置 Token 和 EncodingAESKey
4. 应用可见范围设为运营者

### 消息接收流程

```
运营者转发图片/消息 → 企业微信 → POST /webhook/wechat-work
                                      ↓
                                验签 + 解密消息（企业微信加密方案）
                                      ↓
                                图片类型 → 调用企微媒体 API 下载 → 上传 S3
                                文本类型 → 直接存储 content 字段
                                      ↓
                                存入 wechat_messages
                                      ↓
                                消息分组（同一用户 30 秒时间窗口内归为一组）
                                      ↓
                                创建 parse_task (status: pending)
                                      ↓
                                关联 parse_task_messages
                                      ↓
                                异步触发 AI 解析
```

### 后端模块

`WechatWorkModule`：
- **WechatWorkController**：处理回调请求（验签、解密），同时支持 GET（URL 验证）和 POST（消息接收）
- **WechatWorkService**：消息处理、媒体文件下载、消息分组逻辑
- 企业微信配置从 `system_configs` 表读取
- 企微 REST API（access_token、媒体下载等）直接用 axios 调用

## AI 解析模块

### 技术选型
- SDK：`ai` + `@ai-sdk/xai` + `@ai-sdk/openai` + `@ai-sdk/anthropic`
- 默认模型：xAI `grok-4-1-fast-non-reasoning`（Vision，2M 上下文）
- Admin 后台可配置 Provider 和模型

### 解析流程
1. parse_task 状态 → `parsing`
2. 收集关联的 wechat_messages 中所有图片和文本
3. 从 S3 下载图片为 Buffer
4. 构造 prompt + 图片，调用 AI（structured output + Zod schema）
5. 解析结果存入 `parse_tasks.parsedResult`
6. 状态 → `completed`（成功）或 `failed`（失败）

### 模块结构

`AiParseModule`：
- **AiParseService**：调用 AI API 进行图片/文本解析
- **ParseTaskService**：管理解析任务生命周期（创建、状态流转、结果存储）

## 存储模块

### 环境变量

| 变量 | 说明 |
|------|------|
| `S3_ENDPOINT` | 对象存储端点 |
| `S3_REGION` | 区域 |
| `S3_ACCESS_KEY_ID` | AK |
| `S3_SECRET_ACCESS_KEY` | SK |
| `S3_BUCKET` | 桶名 |

### 模块结构

`StorageModule`（全局）：
- 封装 S3 Client（`@aws-sdk/client-s3`）
- `upload(key, buffer, contentType)` → 返回存储 URL
- `getSignedUrl(key)` → 生成临时访问链接

## 爬虫与 AI 解析流程

### 数据源：TikHub 平台

所有平台数据通过 [TikHub](https://www.tikhub.io/) 统一 API 平台采集，支持 5 个社交平台：

| 平台 | 枚举值 | 内容形态 | 采集能力 |
|------|--------|---------|---------|
| B站 | `BILIBILI` | 视频 | 博主视频列表 + 关键词搜索 |
| 抖音 | `DOUYIN` | 视频 | 博主视频列表 + 关键词搜索 |
| 小红书 | `XIAOHONGSHU` | 视频 + 图文笔记 | 博主笔记列表 + 关键词搜索 |
| 视频号 | `WECHAT_CHANNELS` | 视频 | 博主视频列表 + 关键词搜索 |
| 公众号 | `WECHAT_MP` | 文章 | 按公众号 ghid 拉取文章列表（无关键词搜索） |

### 三条采集线

| 采集线 | 分类 | 数据来源 | 覆盖平台 |
|--------|------|---------|---------|
| 评测采集 | REVIEW | 指定博主列表 → 抓最新内容 | B站、抖音、小红书、视频号 |
| 舆情采集 | SENTIMENT | 关键词搜索 + 指定博主采集（两条并行路径） | B站、抖音、小红书、视频号 |
| 公告采集 | ANNOUNCEMENT | 俱乐部官方公众号文章列表 | 仅公众号 |

### 抓取流程

```
定时触发 (SchedulerRegistry，每个 CrawlTask 独立 cron)
  │
  ├─ BLOGGER_POSTS: 遍历 BloggerAccount
  │   ├─ crawlCategories 包含 REVIEW → 评测采集
  │   └─ crawlCategories 包含 SENTIMENT → 舆情采集
  │
  ├─ KEYWORD_SEARCH: 遍历 Club 名称 → 4 个平台搜索 → SENTIMENT
  │
  └─ MP_ARTICLES: 遍历有 wechatMpGhid 的 Club → 拉取公众号文章 → ANNOUNCEMENT
      │
      ▼
  PlatformAdapter 标准化为 RawContent
      │
      ▼
  去重 (platform + externalId)
      │
      ▼
  存入 Content 表 (aiParsed = false, isPrimary = true)
      │
      ▼
  AI 解析 (输入: 标题 + 简介)
    - 识别关联俱乐部名 → 模糊匹配已有 Club
    - 提取简要评价 + 判断情感倾向
    - 跨平台聚合判断（标题相似度 + 同一 Blogger 不同 Account）
      │
      ▼
  更新 Content (aiParsed, aiClubMatch, aiSummary, aiSentiment, groupId, isPrimary, groupPlatforms)
```

### 架构：TikHubClient + PlatformAdapter

```typescript
// TikHub API 统一封装（认证、限流、重试、错误处理）
class TikHubClient {
  fetchDouyinUserPosts(secUserId: string, cursor?: number): Promise<TikHubResponse>
  searchDouyinVideos(keyword: string, cursor?: number): Promise<TikHubResponse>
  fetchBilibiliUserPosts(uid: string, page?: number): Promise<TikHubResponse>
  searchBilibiliVideos(keyword: string, page?: number): Promise<TikHubResponse>
  fetchXiaohongshuUserNotes(userId: string, cursor?: string): Promise<TikHubResponse>
  searchXiaohongshuNotes(keyword: string, page?: number): Promise<TikHubResponse>
  fetchWechatChannelsUserPosts(username: string, lastBuffer?: string): Promise<TikHubResponse>
  searchWechatChannelsVideos(keywords: string): Promise<TikHubResponse>
  fetchWechatMpArticles(ghid: string, offset?: number): Promise<TikHubResponse>
}

// 平台数据标准化
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

5 个实现：`BilibiliAdapter`、`DouyinAdapter`、`XiaohongshuAdapter`、`WechatChannelsAdapter`、`WechatMpAdapter`（仅 `normalizeUserPosts`，无搜索）。

### 跨平台内容聚合

- AI 解析阶段识别跨平台重复内容（标题相似度 + 同一 Blogger 不同 Account）
- 匹配成功 → 设置相同 `groupId`，指定 `isPrimary`，更新主记录 `groupPlatforms`
- 前端以 Content 卡片展示，有 `groupPlatforms` 时显示多平台图标（类似豆瓣影视多平台入口）
- Admin 可手动合并/拆分

### 同步策略：全量 vs 增量

采集任务支持两种同步模式：

- **增量同步（默认）**：逐页获取内容，当某页所有内容均已存在（`saveContents` 返回 0 新增）时停止翻页。适用于定时任务日常运行，减少 API 调用
- **全量同步**：遍历所有分页直到数据取完。适用于首次采集或需要补全历史数据的场景

手动触发任务时，可通过 `POST /admin/crawl-tasks/:id/trigger` 传入 `{ fullSync: true }` 指定全量同步；定时调度默认为增量同步。

目前分页采集已在 B 站平台实现（App API，逐页获取直到空页），其他平台暂为单次获取。

### 关键设计点

- **统一网关**：所有平台 API 调用通过 TikHub，TikHubClient 封装认证、限流（令牌桶）、重试（指数退避）
- **任务粒度**：每个 CrawlTask 独立 cron 表达式，默认每小时，Admin 可单独调整
- **字幕解析**：暂不实现，AI 解析仅用标题 + 简介作为输入
- **失败处理**：AI 解析失败的内容保持 `aiParsed = false`，不阻塞流程

### TikHub API 端点参考

| 平台 | 博主内容列表 | 关键词搜索 | 内容详情 |
|------|------------|-----------|---------|
| 抖音 | `/api/v1/douyin/app/v3/fetch_user_post_videos` | `/api/v1/douyin/search/fetch_video_search_v2` (POST) | `/api/v1/douyin/app/v3/fetch_one_video` |
| B站 | `/api/v1/bilibili/web/fetch_user_post_videos` | `/api/v1/bilibili/web/fetch_general_search` | `/api/v1/bilibili/web/fetch_video_detail` |
| 小红书 | `/api/v1/xiaohongshu/web_v3/fetch_user_notes` | `/api/v1/xiaohongshu/web_v3/fetch_search_notes` | `/api/v1/xiaohongshu/web_v3/fetch_note_detail` |
| 视频号 | `/api/v1/wechat_channels/fetch_home_page` (POST) | `/api/v1/wechat_channels/fetch_default_search` (POST) | `/api/v1/wechat_channels/fetch_video_detail` |
| 公众号 | `/api/v1/wechat_mp/web/fetch_mp_article_list` | — | `/api/v1/wechat_mp/web/fetch_mp_article_detail_json` |

## AI 智能录入

### 用户流程

1. 俱乐部详情页 → Services Tab → 点击「智能录入」
2. 弹出 Modal，输入阶段：上传多张图片（拖拽/粘贴/选择文件）+ 可选文本
3. 图片即时上传到 S3，点击「开始解析」
4. 解析结果阶段：AI 解析出的服务列表表格，可逐行编辑/删除，重复类型标黄
5. 点击「确认导入」，批量创建服务

### 后端接口

- `POST /admin/clubs/:clubId/services/ai-import`：接收 imageKeys + textContent，调用 AiParseService，返回解析结果（不入库）
- `POST /admin/clubs/:clubId/services/batch`：批量创建服务，复用 ClubServicesService
- `POST /admin/upload`：通用文件上传，返回 S3 key

## Admin 后台功能

### 技术栈（基于 shadcn-admin）

| 项目 | 选型 |
|------|------|
| 路由 | TanStack Router（文件式路由） |
| 状态管理 | Zustand (auth) + useState (业务) |
| 表单验证 | React Hook Form + Zod |
| 数据表格 | TanStack Table（排序/筛选/列控制/批量操作） |
| 布局 | 可折叠侧边栏 + 顶部 Header |
| 主题 | Light Slate + Blue Primary (#2563eb)，支持暗色模式 |

### 功能模块

**0. 概览（首页 `/`）**
- 侧栏入口文案为"概览"，对应 `features/dashboard`
- 5 个 Tab：概览 / 待处理 / 商业化 / 爬虫健康 / 数据完整度
- 后端独立 `OverviewModule`，路由前缀 `/admin/overview/*`，提供 summary、charts、todos、business、crawler-health、data-quality 等只读聚合接口
- 前端每个 Tab 按需懒加载各自数据，图表使用 Recharts
- 详细设计见 `docs/superpowers/specs/2026-04-08-admin-overview-redesign-design.md`

**1. 俱乐部管理**
- 俱乐部 CRUD（基本信息 + 工商信息 + 生命周期管理）
- 服务项管理（含 AI 智能录入）
- 规则管理（录入规则文本 → AI 分析利弊 → 标注 sentiment）
- 公众号头像一键获取
- 推广订单管理（新增订单、查看当前 dailyRate 排名）

**2. 博主管理**
- 博主列表 CRUD，展示关联的所有平台账号
- 新增/编辑博主时管理多个 BloggerAccount
- 每个 Account 配置：平台、平台用户 ID、采集分类（REVIEW / SENTIMENT 多选）
- 启用/停用

**3. 爬虫管理**
- 采集任务 CRUD：新建/编辑时选择任务类型、目标（博主账号/俱乐部）、平台、分类、Cron 表达式；创建/更新后自动注册定时任务
- 采集任务列表（CrawlTask），展示目标名称（博主名/俱乐部名），支持全字段编辑、启用/停用、删除
- 手动触发单个任务
- 执行记录列表（CrawlTaskRun）
- 手动触发单个任务

**4. 内容管理（原视频管理）**
- 内容列表（筛选：平台、内容类型、分类、聚合状态、是否已关联俱乐部、AI 解析状态）
- 每行操作列（MoreHorizontal 三点菜单）：
  - 关联俱乐部：弹出 Dialog，内含 Combobox 搜索选择俱乐部，调用 `POST /admin/contents/:id/link-club`
  - AI 解析：占位（需求待定，按钮 disabled）
- 手动合并/拆分 ContentGroup
- 手动添加内容 URL

**5. 解析任务管理**
- 解析任务列表（按状态筛选）
- 审核页面：左侧原始图片，右侧 AI 结构化结果（可编辑修正）
- 确认后写入 club_services 和 club_rules

**6. 系统设置**
- AI Provider 配置（xAI / OpenAI / Anthropic，API Key + 模型选择）
- TikHub API 配置（API Key、速率限制）
- 外观设置（主题切换）

### 后期补充

**7. 评论管理**
- 评论列表（筛选：状态、俱乐部）
- AI 审核失败的进入人工审核队列
- 批量通过/拒绝

**8. 用户管理**
- 微信用户列表，只读查看

**9. Emoji 表情管理**
- 管理可用的 Emoji 列表

### 认证

Admin 登录使用账号密码 + JWT。Zustand store 管理 auth 状态。

## NestJS 模块结构

```
server/src/
├── database/
│   └── schema/                    # Drizzle schema 定义
│       ├── admin.schema.ts
│       ├── club.schema.ts
│       ├── club-service.schema.ts
│       ├── club-rule.schema.ts
│       ├── promotion-order.schema.ts
│       ├── content.schema.ts
│       ├── blogger.schema.ts
│       ├── blogger-account.schema.ts
│       ├── crawl-task.schema.ts
│       ├── crawl-task-run.schema.ts
│       ├── wechat-message.schema.ts
│       ├── parse-task.schema.ts
│       ├── ai-config.schema.ts
│       └── system-config.schema.ts
├── admin/                         # Admin 后台 API
│   ├── auth/
│   ├── clubs/
│   ├── club-services/
│   ├── club-rules/
│   ├── promotions/
│   ├── bloggers/
│   ├── crawl-tasks/
│   ├── contents/
│   ├── parse-tasks/
│   ├── ai-configs/
│   ├── system-configs/
│   └── upload/
├── crawler/                       # 爬虫模块
│   ├── crawler.module.ts
│   ├── crawler.service.ts
│   ├── crawler-scheduler.service.ts
│   ├── tikhub.client.ts
│   └── adapters/
│       ├── platform-adapter.interface.ts
│       ├── bilibili.adapter.ts
│       ├── douyin.adapter.ts
│       ├── xiaohongshu.adapter.ts
│       ├── wechat-channels.adapter.ts
│       └── wechat-mp.adapter.ts
├── wechat-work/                   # 企业微信模块
│   ├── wechat-work.module.ts
│   ├── wechat-work.controller.ts
│   └── wechat-work.service.ts
├── ai-parse/                      # AI 解析模块
│   ├── ai-parse.module.ts
│   ├── ai-parse.service.ts
│   └── parse-task.service.ts
├── storage/                       # S3 存储模块（全局）
│   ├── storage.module.ts
│   └── storage.service.ts
└── common/                        # 通用工具
```

## 依赖清单

### 后端核心依赖

| 包 | 用途 |
|---|------|
| `@aws-sdk/client-s3` | S3 兼容对象存储 |
| `@aws-sdk/s3-request-presigner` | S3 签名 URL |
| `ai` | Vercel AI SDK |
| `@ai-sdk/xai` | xAI Grok provider |
| `@ai-sdk/openai` | OpenAI provider |
| `@ai-sdk/anthropic` | Anthropic provider |
| `@wecom/crypto` | 企业微信加解密 |
| `xml2js` | 解析企微 XML 消息体 |
| `@nestjs/schedule` | 定时任务 |
| `drizzle-orm` | ORM |
| `bcrypt` | 密码哈希 |

### 前端核心依赖

| 包 | 用途 |
|---|------|
| `@tanstack/react-router` | 文件式路由 |
| `@tanstack/react-query` | 数据获取 |
| `@tanstack/react-table` | 高级数据表格 |
| `react-hook-form` | 表单管理 |
| `zod` | Schema 验证 |
| `zustand` | Auth 状态管理 |

## 小程序端功能

### 页面结构

**TabBar：首页 | 俱乐部列表 | 个人中心**

### 首页 (推广 + 运营位)
- 推广俱乐部轮播/卡片（付费曝光，按 dailyRate 排序）
- 精选评测视频推荐
- 公告/活动
- 明牌付费推广，核心作用是曝光换流量

### 俱乐部列表页
- 筛选条件：
  - 服务类型（跑刀/陪玩/护航体验/护航标准/护航趣味）
  - 价格排序（陪玩按小时价，跑刀/护航按汇率性价比）
- 搜索：俱乐部名称模糊搜索
- 多选模式：选中多个俱乐部后进入对比页
- 点击 item 进入俱乐部详情页

### 俱乐部详情页
- 基本信息（Logo、简介、运营时长、公众号/小程序跳转导流到俱乐部自己的渠道）
- 前身俱乐部链接（如有，展示完整转生历史链）
- 服务价格表（按类型分 Tab 展示）
- 规则展示（AI 标注高亮：绿色=有利、红色=不利、灰色=中性）
- 评测视频列表（跳转 B 站/抖音播放）
- 舆情视频列表（单独区域，标注情感倾向）
- 用户评价区（评分统计 + 评价列表 + Emoji 互动）

### 俱乐部对比页
- 从列表页多选进入
- 不限数量
- 对比维度：价格、服务项

### 俱乐部墓碑页
- 展示所有 closed 状态的俱乐部
- 按倒闭时间排列
- 展示运营时长、倒闭备注、转生去向（如有）

### 个人中心
- 收藏的俱乐部
- 我的评价
- 微信头像/昵称

### 认证
- 微信授权登录
- 浏览不需要登录，发评价/收藏需要登录

## MVP 开发顺序

Stage 依赖关系：`1 → 2 → 3 → 4 → 5 → 6`（严格顺序，每个 Stage 依赖前一个的交付物）

### Stage 1: 项目基建
> 目标：搭建可运行的 Monorepo 骨架，跑通前后端开发流程
> 前置：无

- Monorepo 初始化（pnpm workspace + Turborepo）
- NestJS server 搭建（项目结构、模块划分、环境配置）
- Drizzle + PostgreSQL 接入（连接配置、migration 机制）
- Admin 前端搭建（基于 shadcn-admin Fork，集成到 Monorepo）
- 前后端联调跑通（Admin 登录 + JWT 鉴权 + Zustand auth store）
- packages/shared 搭建（共享类型导出）
- 初始管理员 seed 脚本
- S3 StorageModule 搭建

交付物：可登录的 Admin 空壳 + 可运行的 API server + S3 存储可用

### Stage 2: 俱乐部数据管理
> 目标：完成俱乐部核心数据的录入和管理
> 前置：Stage 1 完成

- Club 表及关联表 schema（ClubService、ClubRule、PromotionOrder）
- Admin - 俱乐部 CRUD（基本信息 + 工商信息 + 生命周期管理）
- Admin - 服务项管理（跑刀/陪玩/护航体验/护航标准/护航趣味）
- Admin - 规则管理（录入规则文本）
- Admin - 推广订单管理（新增、dailyRate 计算与排名）

交付物：可以录入和管理完整俱乐部数据的 Admin 后台

### Stage 2.5: 企业微信集成与 AI 解析
> 目标：通过企微自动接收和解析俱乐部信息
> 前置：Stage 2 完成

- WechatMessage、ParseTask、ParseTaskMessage 表 schema
- AiConfig 表 schema + Admin AI Provider 配置
- WechatWorkModule（回调验签、消息存储、分组逻辑）
- AiParseModule（多 Provider AI 解析、结构化输出）
- Admin - 解析任务列表 + 审核页面
- Admin - AI 智能录入（服务项批量导入）
- 公众号头像一键获取

交付物：企微消息自动接收 → AI 解析 → 人工审核入库

### Stage 3: 多平台内容采集
> 目标：通过 TikHub 实现 5 平台自动化内容采集
> 前置：Stage 2 完成（需要 Club 数据用于关键词搜索和公众号采集）

- Blogger、BloggerAccount 表 schema + Admin 博主管理（多平台账号、采集分类配置）
- CrawlTask、CrawlTaskRun 表 schema + Admin 爬虫管理（任务列表含目标名称、cron 配置、手动单任务触发、批量触发、执行记录）
- Content 表 schema（替代 Video）+ 去重逻辑
- Club 表新增 wechatMpGhid 字段
- TikHubClient 封装（认证、限流、重试）
- 5 个 PlatformAdapter 实现（B站、抖音、小红书、视频号、公众号）
- 三条采集线：评测（博主）、舆情（关键词+博主）、公告（公众号）
- CrawlerSchedulerService（SchedulerRegistry 动态定时任务）
- Admin 内容管理（原视频管理，支持多平台筛选）

交付物：定时自动采集 5 平台内容并入库，Admin 可管理采集任务和内容

### Stage 4: LLM 集成（内容解析与聚合）
> 目标：AI 自动解析内容、关联俱乐部、跨平台聚合
> 前置：Stage 3 完成（需要 Content 数据用于 AI 解析）

- 内容 AI 解析流程串联（采集入库 → 自动触发 AI 解析 → 更新 Content）
- 跨平台内容聚合（AI 识别重复内容 → 设置 groupId/isPrimary/groupPlatforms）
- 俱乐部规则 AI 分析（录入规则 → AI 标注 sentiment）
- Admin - 内容管理完善（手动关联俱乐部、手动合并/拆分 ContentGroup）

交付物：内容自动解析并关联俱乐部，跨平台重复内容自动聚合，规则自动标注利弊

### Stage 5: 小程序端
> 目标：面向玩家的小程序上线
> 前置：Stage 4 完成（需要完整的后端 API 和数据）

- UniApp 项目搭建 + Monorepo 集成
- 微信授权登录 + ClientModule 鉴权
- 首页（推广轮播/卡片 + 视频推荐 + 公告）
- 俱乐部列表页（筛选、搜索、多选进入对比）
- 俱乐部详情页（信息、价格、规则高亮、视频、前身俱乐部）
- 俱乐部对比页
- 俱乐部墓碑页
- 个人中心（收藏、我的评价）

交付物：可上线的小程序

### Stage 6: 评论与互动系统
> 目标：用户评价和内容审核
> 前置：Stage 5 完成（需要小程序端 + 用户登录体系）

- Review / ReviewReaction / ReactionEmoji 表 schema
- 国内 AI 模型接入（内容审核）
- 评价发表 + AI 自动审核流程
- Emoji 互动（点赞/点踩/表情）
- Admin - 评论管理（审核队列、批量操作）
- Admin - Emoji 表情管理
- Admin - 用户管理（只读）

交付物：完整的评价互动系统 + 内容审核
