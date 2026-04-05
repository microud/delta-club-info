# 微信集成与 AI 订单解析设计

## 概述

通过企业微信接收运营者转发的俱乐部推广图片/消息，借助 xAI Grok Vision 自动提取俱乐部服务定价和规则信息，生成结构化草稿供人工审核后入库。同时补充俱乐部工商信息维护和公众号头像获取能力。

## 一、数据模型变更

### 1.1 clubs 表新增工商信息字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `companyName` | varchar(300) | 公司全称 |
| `creditCode` | varchar(18) | 统一社会信用代码 |
| `legalPerson` | varchar(100) | 法人 |
| `registeredAddress` | text | 注册地址 |
| `businessScope` | text | 经营范围 |
| `registeredCapital` | varchar(100) | 注册资本（如"100万元"） |
| `companyEstablishedAt` | date | 公司成立日期 |
| `businessStatus` | varchar(50) | 经营状态（存续、注销等） |

### 1.2 新增 wechat_messages 表

存储企业微信接收到的原始消息。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid, PK | |
| `msgId` | varchar(64) | 企业微信消息ID |
| `msgType` | varchar(20) | text / image |
| `content` | text, nullable | 文本内容（text 类型时） |
| `mediaUrl` | varchar(500), nullable | 图片在 S3 的存储路径 |
| `fromUser` | varchar(100) | 发送者企业微信ID |
| `rawPayload` | jsonb | 原始消息体 |
| `createdAt` | timestamp with timezone | 接收时间 |

### 1.3 新增 parse_tasks 表

AI 解析任务及结果。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid, PK | |
| `status` | enum(pending, parsing, completed, failed) | 解析状态 |
| `clubId` | uuid, nullable, FK → clubs | 人工确认时关联的俱乐部 |
| `parsedResult` | jsonb, nullable | AI 提取的结构化数据 |
| `errorMessage` | text, nullable | 失败原因 |
| `createdAt` | timestamp with timezone | |
| `updatedAt` | timestamp with timezone | |

### 1.4 新增 parse_task_messages 关联表

一个解析任务可关联多条消息（合并转发 / 逐条转发场景）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `parseTaskId` | uuid, FK → parse_tasks | |
| `wechatMessageId` | uuid, FK → wechat_messages | |

联合主键：`(parseTaskId, wechatMessageId)`。

### 1.5 parsedResult 结构

AI 解析后存入 `parse_tasks.parsedResult` 的 JSON 结构：

```json
{
  "clubName": "卡丁车电竞工作室",
  "services": [
    {
      "name": "绝密趣味单",
      "tiers": [
        { "price": 128, "guarantee": "788W", "note": "仅限一次" },
        { "price": 168, "guarantee": "688W", "note": "每周一次" }
      ]
    }
  ],
  "rules": [
    { "content": "体验单不包全卡（至少一张红色饭卡）包过点卡", "category": "体验须知" },
    { "content": "统一为绝密：巴克什，航天基地炸单+65W 监狱+85W", "category": "炸单标准" }
  ]
}
```

## 二、企业微信集成

### 2.1 企业微信配置（一次性）

1. 在企业微信管理后台创建自建应用
2. 配置应用的消息接收：回调 URL 指向 `{server}/webhook/wechat-work`
3. 设置 Token 和 EncodingAESKey
4. 应用可见范围设为运营者自己

### 2.2 消息接收流程

```
运营者转发图片/消息 → 企业微信 → POST /webhook/wechat-work
                                        ↓
                                  验签 + 解密消息（企业微信加密方案）
                                        ↓
                                  图片类型 → 调用企业微信媒体 API 下载 → 上传 S3
                                  文本类型 → 直接存储 content 字段
                                        ↓
                                  存入 wechat_messages
                                        ↓
                                  消息分组（同一用户 30 秒时间窗口内的消息归为一组）
                                        ↓
                                  创建 parse_task (status: pending)
                                        ↓
                                  关联 parse_task_messages
                                        ↓
                                  异步触发 AI 解析
```

### 2.3 回调接口

- 路径：`POST /webhook/wechat-work`
- 不经过 AdminGuard 鉴权，使用企业微信签名验证
- 同时支持 `GET` 请求用于企业微信的 URL 验证（echostr 回调）

### 2.4 消息分组策略

逐条转发场景下，多条消息会短时间内连续到达。使用时间窗口聚合：

- 同一 `fromUser`，30 秒内的连续消息归为一组
- 收到第一条消息时创建 parse_task，启动 30 秒定时器
- 定时器到期后触发 AI 解析，期间到达的消息追加到同一 task

### 2.5 后端模块

新增 `WechatWorkModule`：

- **WechatWorkController**：处理回调请求（验签、解密）
- **WechatWorkService**：消息处理、媒体文件下载、消息分组逻辑
- 企业微信配置从 `system_configs` 表读取

## 三、系统配置

### 3.1 环境变量（基础设施级）

| 变量 | 说明 |
|------|------|
| `S3_ENDPOINT` | 对象存储端点 |
| `S3_REGION` | 区域 |
| `S3_ACCESS_KEY_ID` | AK |
| `S3_SECRET_ACCESS_KEY` | SK |
| `S3_BUCKET` | 桶名 |

### 3.2 system_configs 表（业务配置，Admin 后台可维护）

| Key | 说明 |
|-----|------|
| `wechat_work.corp_id` | 企业ID |
| `wechat_work.agent_id` | 应用AgentId |
| `wechat_work.secret` | 应用Secret |
| `wechat_work.token` | 回调Token |
| `wechat_work.encoding_aes_key` | 回调加密Key |
| `xai.api_key` | xAI API Key |
| `xai.model` | 模型名（默认 `grok-4-1-fast-non-reasoning`） |

敏感字段（secret、api_key 等）在 Admin 后台展示时做脱敏处理（仅显示末4位）。

### 3.3 后端模块

新增 `StorageModule`（全局）：

- 封装 S3 Client（`@aws-sdk/client-s3`）
- 提供 `upload(key: string, buffer: Buffer, contentType: string): Promise<string>` — 返回存储 URL
- 提供 `getSignedUrl(key: string): Promise<string>` — 生成临时访问链接

## 四、AI 解析

### 4.1 技术选型

- SDK：`ai` + `@ai-sdk/xai`
- 模型：`grok-4-1-fast-non-reasoning`（支持 Vision，2M 上下文，$0.20/$0.50 per 1M tokens）

### 4.2 解析流程

1. parse_task 状态变为 `parsing`
2. 从关联的 `wechat_messages` 收集所有图片和文本
3. 从 S3 下载图片为 Buffer
4. 构造 prompt + 图片，调用 Grok Vision
5. 解析返回的结构化 JSON，存入 `parse_tasks.parsedResult`
6. 状态变为 `completed`（成功）或 `failed`（失败，记录 errorMessage）

### 4.3 Prompt 设计要点

- 要求返回严格 JSON 格式（使用 AI SDK 的 structured output 能力）
- 指导模型识别：俱乐部名称、服务类型、价格档位、保底数值、规则条款
- 对于多图场景，说明这些图片来自同一俱乐部

### 4.4 后端模块

新增 `AiParseModule`：

- **AiParseService**：调用 xAI API 进行图片解析
- **ParseTaskService**：管理解析任务生命周期（创建、状态流转、结果存储）

### 4.5 Admin 后台审核页面

新增路由 `/parse-tasks`：

- **列表页**：展示所有解析任务，按状态筛选（pending / parsing / completed / failed）
- **详情/审核页**：
  - 左侧：原始图片展示
  - 右侧：AI 提取的结构化结果，可编辑修正
  - 操作：选择关联到已有俱乐部或新建俱乐部，确认后写入 `club_services` 和 `club_rules`

## 五、公众号头像获取

### 5.1 交互设计

Club 编辑页面的 logo 区域提供两种方式：

1. **上传**：手动选择图片文件 → 上传 S3 → 回填 logo URL
2. **一键获取公众号头像**：点击按钮 → 后端尝试抓取 → 成功则上传 S3 并回填 → 失败则提示手动上传

按钮仅在 `wechatOfficialAccount` 字段有值时可用。

### 5.2 后端接口

```
POST /admin/clubs/fetch-wechat-avatar
Body: { wechatOfficialAccount: "xxx" }

成功响应: { logoUrl: "https://s3.../avatar.jpg" }
失败响应: 400 { message: "获取失败，请手动上传" }
```

实现方式：通过微信公众平台公开页面抓取头像图片 URL，下载后上传 S3。此接口依赖非官方途径，不保证长期稳定，失败时用户手动上传即可。

## 六、新增依赖

| 包 | 用途 |
|---|------|
| `@aws-sdk/client-s3` | S3 兼容对象存储 |
| `@aws-sdk/s3-request-presigner` | S3 签名 URL |
| `ai` | Vercel AI SDK |
| `@ai-sdk/xai` | xAI Grok provider |
| `@wecom/crypto` | 企业微信官方加解密库，处理回调验签和消息解密 |
| `xml2js` | 解析企业微信 XML 消息体 |

注：企业微信无官方综合 Node.js SDK，REST API（access_token 管理、媒体文件下载等）直接使用 axios 调用。
