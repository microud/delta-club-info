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
/api/v1/*             — 小程序端接口，WechatAuthGuard 鉴权（部分接口允许匿名访问）
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
GET    /admin/crawl-tasks
POST   /admin/crawl-tasks/trigger
GET    /admin/videos
PUT    /admin/videos/:id/associate              (手动关联俱乐部)
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
GET    /api/v1/auth/wechat-login
GET    /api/v1/clubs                            (列表 + 筛选)
GET    /api/v1/clubs/:id                        (详情)
GET    /api/v1/clubs/:id/videos
GET    /api/v1/clubs/:id/reviews
POST   /api/v1/clubs/:id/reviews                (需登录)
GET    /api/v1/clubs/compare                    (对比)
GET    /api/v1/clubs/graveyard                  (墓碑)
GET    /api/v1/promotions/home                  (首页推广内容)
GET    /api/v1/user/favorites                   (需登录)
POST   /api/v1/user/favorites/:clubId           (需登录)
DELETE /api/v1/user/favorites/:clubId           (需登录)
POST   /api/v1/reviews/:id/reactions            (需登录)
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

### Video (视频)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| clubId | uuid | 关联俱乐部 (nullable, AI 匹配或手动关联) |
| platform | enum | BILIBILI / DOUYIN |
| externalId | varchar | 平台视频 ID |
| title | varchar | 视频标题 |
| coverUrl | varchar | 封面 URL |
| videoUrl | varchar | 视频链接 |
| description | text | 视频简介 (nullable) |
| authorName | varchar | 博主名称 |
| authorId | varchar | 博主平台 ID |
| category | enum | REVIEW / SENTIMENT (评测 vs 舆情) |
| subtitleText | text | 字幕文本 (nullable, 暂不抓取) |
| aiParsed | boolean | 是否已 AI 解析 |
| aiClubMatch | varchar | AI 识别的俱乐部名 (nullable) |
| aiSummary | text | AI 简要评价 (nullable) |
| aiSentiment | enum | POSITIVE / NEGATIVE / NEUTRAL (nullable) |
| publishedAt | timestamp | 视频发布时间 |
| createdAt | timestamp | |
| updatedAt | timestamp | |

唯一索引：`platform + externalId`

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

### SystemConfig (系统配置)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| key | varchar | 配置键（唯一） |
| value | text | 配置值（JSON 字符串） |
| description | varchar | 配置说明 |
| updatedAt | timestamp | |

预置配置项：
- `crawler.frequency` — 爬虫抓取频率（分钟），默认 60
- `wechat_work.corp_id` — 企业微信企业 ID
- `wechat_work.agent_id` — 应用 AgentId
- `wechat_work.secret` — 应用 Secret
- `wechat_work.token` — 回调 Token
- `wechat_work.encoding_aes_key` — 回调加密 Key

敏感字段（secret、api_key 等）在 Admin 后台展示时做脱敏处理（仅显示末 4 位）。

### Blogger (监控博主)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| platform | enum | BILIBILI / DOUYIN |
| externalId | varchar | 平台用户 ID |
| name | varchar | 博主名称 |
| isActive | boolean | 是否启用 |
| createdAt | timestamp | |

### CrawlTask (爬虫执行记录)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| type | enum | BLOGGER / KEYWORD (博主抓取 / 关键词搜索) |
| targetId | varchar | 博主 ID 或搜索关键词 |
| status | enum | RUNNING / SUCCESS / FAILED |
| startedAt | timestamp | |
| finishedAt | timestamp | (nullable) |
| videoCount | int | 本次抓取到的新视频数 |
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

### 两条抓取任务线

| | 评测/体验 (REVIEW) | 舆情 (SENTIMENT) |
|---|---|---|
| **来源** | 指定博主列表 | 俱乐部名称关键词搜索 |
| **抓取方式** | 按博主抓最新视频 | 按关键词搜索最新视频 |
| **默认频率** | 每小时 | 每小时 |
| **AI 任务** | 匹配俱乐部 + 简要评价 | 匹配俱乐部 + 情感判断 |

频率可在 Admin 后台配置，通过 SchedulerRegistry 动态更新。

### 抓取流程

```
定时触发 (SchedulerRegistry 动态 Interval)
  │
  ├─ BloggerCrawl: 遍历 Blogger 列表 → 各平台 Adapter 抓新视频 → REVIEW
  │
  └─ KeywordCrawl: 遍历 Club 名称搜索 → 各平台 Adapter 搜索 → SENTIMENT
      │
      ▼
  去重 (platform + externalId)
      │
      ▼
  存入 Video 表 (aiParsed = false)
      │
      ▼
  AI 解析 (输入: 标题 + 简介)
    - 识别关联俱乐部名 → 模糊匹配已有 Club
    - 提取简要评价
    - 判断情感倾向
      │
      ▼
  更新 Video (aiParsed = true, aiClubMatch, aiSummary, aiSentiment)
  匹配不上俱乐部的 clubId = null, Admin 可手动关联
```

### Adapter 模式

```typescript
interface CrawlerAdapter {
  platform: VideoPlatform;
  fetchBloggerVideos(bloggerId: string): Promise<RawVideo[]>;
  searchVideos(keyword: string): Promise<RawVideo[]>;
}
```

- `BilibiliAdapter`：调用 B 站公开接口实现
- `DouyinAdapter`：接口已定义，方法抛出 NotImplemented（后续实现）

### 关键设计点

- **动态频率**：从 SystemConfig 读取 `crawler.frequency`，Admin 修改后通过 SchedulerRegistry 实时更新 Interval
- **字幕解析**：暂不实现，AI 解析仅用标题 + 简介作为输入
- **失败处理**：LLM 解析失败的视频保持 `aiParsed = false`，不阻塞流程

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

**1. 俱乐部管理**
- 俱乐部 CRUD（基本信息 + 工商信息 + 生命周期管理）
- 服务项管理（含 AI 智能录入）
- 规则管理（录入规则文本 → AI 分析利弊 → 标注 sentiment）
- 公众号头像一键获取
- 推广订单管理（新增订单、查看当前 dailyRate 排名）

**2. 博主管理**
- 博主列表 CRUD
- 启用/停用

**3. 爬虫管理**
- 爬虫任务执行记录列表
- 抓取频率配置
- 手动触发抓取

**4. 视频管理**
- 视频列表（筛选：平台、分类、是否已关联俱乐部、AI 解析状态）
- 手动关联：AI 匹配不上的视频，手动指定俱乐部
- 手动添加视频 URL → 触发抓取 + 解析

**5. 解析任务管理**
- 解析任务列表（按状态筛选）
- 审核页面：左侧原始图片，右侧 AI 结构化结果（可编辑修正）
- 确认后写入 club_services 和 club_rules

**6. 系统设置**
- AI Provider 配置（xAI / OpenAI / Anthropic，API Key + 模型选择）
- 企业微信配置
- 爬虫频率全局设置
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
│       ├── video.schema.ts
│       ├── blogger.schema.ts
│       ├── crawl-task.schema.ts
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
│   ├── videos/
│   ├── parse-tasks/
│   ├── ai-configs/
│   ├── system-configs/
│   └── upload/
├── crawler/                       # 爬虫模块
│   ├── crawler.module.ts
│   ├── crawler.service.ts
│   └── adapters/
│       ├── crawler-adapter.interface.ts
│       ├── bilibili.adapter.ts
│       └── douyin.adapter.ts
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

### Stage 3: 爬虫与视频采集
> 目标：实现自动化视频抓取入库
> 前置：Stage 2 完成（需要 Club 数据用于关键词搜索）

- Blogger 表 schema + Admin 博主管理 CRUD
- CrawlTask 表 schema + Admin 爬虫管理（记录、频率配置、手动触发）
- 爬虫 Adapter 实现（B 站实现 + 抖音接口预留）
- BloggerCrawl 定时任务（按博主抓取 → REVIEW）
- KeywordCrawl 定时任务（按俱乐部名搜索 → SENTIMENT）
- Video 表 schema + 去重逻辑
- 动态定时任务调度（SchedulerRegistry）

交付物：定时自动抓取视频并入库，Admin 可查看爬虫执行记录

### Stage 4: LLM 集成（视频解析）
> 目标：AI 自动解析视频内容和俱乐部规则
> 前置：Stage 3 完成（需要 Video 数据用于 AI 解析）

- 视频 AI 解析流程串联（爬虫入库 → 自动触发 AI 解析 → 更新 Video）
- 俱乐部规则 AI 分析（录入规则 → AI 标注 sentiment）
- Admin - 视频管理（列表、筛选、手动关联俱乐部、手动添加 URL）

交付物：视频自动解析并关联俱乐部，规则自动标注利弊

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
