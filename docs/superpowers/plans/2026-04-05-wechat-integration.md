# 微信集成与 AI 订单解析 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过企业微信接收转发的俱乐部推广图片，借助 xAI Grok Vision 自动提取服务定价和规则，人工审核后入库；同时为俱乐部补充工商信息维护和公众号头像获取。

**Architecture:** 后端新增 StorageModule（S3）、WechatWorkModule（企业微信回调+消息处理）、AiParseModule（Grok Vision 解析）三个模块。企业微信/xAI 配置存 system_configs 表，S3 配置走环境变量。前端新增解析任务审核页面，扩展俱乐部表单增加工商信息和头像获取。

**Tech Stack:** NestJS, Drizzle ORM, @aws-sdk/client-s3, @wecom/crypto, xml2js, ai + @ai-sdk/xai, React, TanStack Router/Query, Zod

---

## 文件结构

### 后端新增/修改

| 文件 | 职责 |
|------|------|
| **修改** `apps/server/src/database/schema/club.schema.ts` | clubs 表新增 8 个工商信息字段 |
| **修改** `apps/server/src/database/schema/index.ts` | 导出新 schema |
| **新增** `apps/server/src/database/schema/wechat-message.schema.ts` | wechat_messages 表定义 |
| **新增** `apps/server/src/database/schema/parse-task.schema.ts` | parse_tasks + parse_task_messages 表定义 |
| **修改** `apps/server/src/admin/clubs/dto/create-club.dto.ts` | 新增工商信息字段 |
| **修改** `apps/server/src/admin/clubs/dto/update-club.dto.ts` | 新增工商信息字段 |
| **修改** `apps/server/src/admin/clubs/clubs.controller.ts` | 新增 fetch-wechat-avatar 接口 |
| **修改** `apps/server/src/admin/clubs/clubs.service.ts` | 新增头像获取逻辑 |
| **新增** `apps/server/src/storage/storage.module.ts` | S3 客户端全局模块 |
| **新增** `apps/server/src/storage/storage.service.ts` | S3 upload/getUrl 方法 |
| **新增** `apps/server/src/wechat-work/wechat-work.module.ts` | 企业微信模块 |
| **新增** `apps/server/src/wechat-work/wechat-work.controller.ts` | 回调接口（验证+消息接收） |
| **新增** `apps/server/src/wechat-work/wechat-work.service.ts` | 消息处理、媒体下载、分组逻辑 |
| **新增** `apps/server/src/ai-parse/ai-parse.module.ts` | AI 解析模块 |
| **新增** `apps/server/src/ai-parse/ai-parse.service.ts` | 调用 Grok Vision 解析图片 |
| **新增** `apps/server/src/ai-parse/parse-task.service.ts` | 解析任务 CRUD 和生命周期管理 |
| **新增** `apps/server/src/ai-parse/parse-task.controller.ts` | 解析任务管理接口（Admin） |
| **新增** `apps/server/src/ai-parse/dto/confirm-parse.dto.ts` | 审核确认 DTO |
| **修改** `apps/server/src/app.module.ts` | 导入新模块 |
| **修改** `apps/server/package.json` | 新增依赖 |

### 前端新增/修改

| 文件 | 职责 |
|------|------|
| **修改** `packages/shared/src/types.ts` | 新增 DTO 类型 |
| **修改** `packages/shared/src/enums.ts` | 新增 ParseTaskStatus 枚举 |
| **修改** `apps/admin/src/features/clubs/data/schema.ts` | 表单 schema 新增工商字段 |
| **修改** `apps/admin/src/features/clubs/components/club-form.tsx` | 表单新增工商字段 + 头像获取按钮 |
| **修改** `apps/admin/src/lib/api.ts` | 新增 parse-task 和头像获取 API |
| **新增** `apps/admin/src/features/parse-tasks/index.tsx` | 解析任务列表页 |
| **新增** `apps/admin/src/features/parse-tasks/components/parse-tasks-columns.tsx` | 表格列定义 |
| **新增** `apps/admin/src/features/parse-tasks/components/parse-task-review.tsx` | 审核详情页（左图右数据） |
| **新增** `apps/admin/src/routes/_authenticated/parse-tasks/index.tsx` | 列表路由 |
| **新增** `apps/admin/src/routes/_authenticated/parse-tasks/$id/route.tsx` | 审核详情路由 |
| **新增** `apps/admin/src/routes/_authenticated/parse-tasks/route.tsx` | 布局路由 |
| **修改** `apps/admin/src/routes/_authenticated/settings/index.tsx` | 设置页新增企业微信和 AI 配置入口 |

---

## Task 1: 安装后端依赖

**Files:**
- Modify: `apps/server/package.json`

- [ ] **Step 1: 安装新依赖**

```bash
cd apps/server && pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @wecom/crypto xml2js ai @ai-sdk/xai && pnpm add -D @types/xml2js
```

- [ ] **Step 2: 验证安装**

Run: `cd apps/server && pnpm ls @aws-sdk/client-s3 @wecom/crypto ai @ai-sdk/xai xml2js`
Expected: 所有包都列出版本号

- [ ] **Step 3: Commit**

```bash
git add apps/server/package.json pnpm-lock.yaml
git commit -m "chore: add s3, wecom, ai-sdk, xml2js dependencies"
```

---

## Task 2: 数据库 Schema — clubs 表新增工商字段

**Files:**
- Modify: `apps/server/src/database/schema/club.schema.ts`
- Modify: `apps/server/src/admin/clubs/dto/create-club.dto.ts`
- Modify: `apps/server/src/admin/clubs/dto/update-club.dto.ts`
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: clubs schema 新增工商字段**

在 `apps/server/src/database/schema/club.schema.ts` 的 `closureNote` 字段之后、`createdAt` 之前添加：

```typescript
  companyName: varchar('company_name', { length: 300 }),
  creditCode: varchar('credit_code', { length: 18 }),
  legalPerson: varchar('legal_person', { length: 100 }),
  registeredAddress: text('registered_address'),
  businessScope: text('business_scope'),
  registeredCapital: varchar('registered_capital', { length: 100 }),
  companyEstablishedAt: date('company_established_at'),
  businessStatus: varchar('business_status', { length: 50 }),
```

- [ ] **Step 2: 更新 CreateClubDto**

在 `apps/server/src/admin/clubs/dto/create-club.dto.ts` 尾部新增：

```typescript
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  creditCode?: string;

  @IsOptional()
  @IsString()
  legalPerson?: string;

  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @IsOptional()
  @IsString()
  businessScope?: string;

  @IsOptional()
  @IsString()
  registeredCapital?: string;

  @IsOptional()
  @IsDateString()
  companyEstablishedAt?: string;

  @IsOptional()
  @IsString()
  businessStatus?: string;
```

- [ ] **Step 3: 更新 UpdateClubDto**

在 `apps/server/src/admin/clubs/dto/update-club.dto.ts` 尾部新增同样的 8 个字段（同 Step 2 代码）。

- [ ] **Step 4: 更新 shared ClubDto**

在 `packages/shared/src/types.ts` 的 `ClubDto` interface 中，`closureNote` 之后添加：

```typescript
  companyName: string | null;
  creditCode: string | null;
  legalPerson: string | null;
  registeredAddress: string | null;
  businessScope: string | null;
  registeredCapital: string | null;
  companyEstablishedAt: string | null;
  businessStatus: string | null;
```

- [ ] **Step 5: 生成并运行数据库迁移**

```bash
cd apps/server && pnpm db:generate && pnpm db:migrate
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add business registration fields to clubs table"
```

---

## Task 3: 数据库 Schema — wechat_messages 表

**Files:**
- Create: `apps/server/src/database/schema/wechat-message.schema.ts`
- Modify: `apps/server/src/database/schema/index.ts`

- [ ] **Step 1: 创建 wechat-message.schema.ts**

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

export const wechatMessages = pgTable('wechat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  msgId: varchar('msg_id', { length: 64 }).notNull(),
  msgType: varchar('msg_type', { length: 20 }).notNull(),
  content: text('content'),
  mediaUrl: varchar('media_url', { length: 500 }),
  fromUser: varchar('from_user', { length: 100 }).notNull(),
  rawPayload: jsonb('raw_payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: 更新 index.ts 导出**

在 `apps/server/src/database/schema/index.ts` 添加：

```typescript
export * from './wechat-message.schema';
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/database/schema/wechat-message.schema.ts apps/server/src/database/schema/index.ts
git commit -m "feat: add wechat_messages table schema"
```

---

## Task 4: 数据库 Schema — parse_tasks 和 parse_task_messages 表

**Files:**
- Create: `apps/server/src/database/schema/parse-task.schema.ts`
- Modify: `apps/server/src/database/schema/index.ts`
- Modify: `packages/shared/src/enums.ts`
- Modify: `packages/shared/src/types.ts`

- [ ] **Step 1: 新增 ParseTaskStatus 枚举**

在 `packages/shared/src/enums.ts` 尾部添加：

```typescript
export enum ParseTaskStatus {
  PENDING = 'pending',
  PARSING = 'parsing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```

- [ ] **Step 2: 新增 shared DTO 类型**

在 `packages/shared/src/types.ts` 尾部添加：

```typescript
export interface WechatMessageDto {
  id: string;
  msgId: string;
  msgType: string;
  content: string | null;
  mediaUrl: string | null;
  fromUser: string;
  createdAt: string;
}

export interface ParseTaskDto {
  id: string;
  status: string;
  clubId: string | null;
  parsedResult: ParsedResult | null;
  errorMessage: string | null;
  messages?: WechatMessageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ParsedResult {
  clubName: string;
  services: ParsedService[];
  rules: ParsedRule[];
}

export interface ParsedService {
  name: string;
  tiers: ParsedTier[];
}

export interface ParsedTier {
  price: number;
  guarantee: string;
  note?: string;
}

export interface ParsedRule {
  content: string;
  category: string;
}
```

- [ ] **Step 3: 创建 parse-task.schema.ts**

```typescript
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';
import { wechatMessages } from './wechat-message.schema';

export const parseTaskStatusEnum = pgEnum('parse_task_status', [
  'pending',
  'parsing',
  'completed',
  'failed',
]);

export const parseTasks = pgTable('parse_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: parseTaskStatusEnum('status').notNull().default('pending'),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'set null' }),
  parsedResult: jsonb('parsed_result'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const parseTaskMessages = pgTable(
  'parse_task_messages',
  {
    parseTaskId: uuid('parse_task_id')
      .notNull()
      .references(() => parseTasks.id, { onDelete: 'cascade' }),
    wechatMessageId: uuid('wechat_message_id')
      .notNull()
      .references(() => wechatMessages.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.parseTaskId, table.wechatMessageId] })],
);
```

- [ ] **Step 4: 更新 index.ts 导出**

在 `apps/server/src/database/schema/index.ts` 添加：

```typescript
export * from './parse-task.schema';
```

- [ ] **Step 5: 生成并运行迁移**

```bash
cd apps/server && pnpm db:generate && pnpm db:migrate
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add parse_tasks and wechat_messages migration, shared types"
```

---

## Task 5: StorageModule — S3 对象存储

**Files:**
- Create: `apps/server/src/storage/storage.module.ts`
- Create: `apps/server/src/storage/storage.service.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: 创建 storage.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      endpoint: this.config.getOrThrow('S3_ENDPOINT'),
      region: this.config.get('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
    this.bucket = this.config.getOrThrow('S3_BUCKET');
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  getPublicUrl(key: string): string {
    const endpoint = this.config.getOrThrow('S3_ENDPOINT');
    return `${endpoint}/${this.bucket}/${key}`;
  }
}
```

- [ ] **Step 2: 创建 storage.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 3: 在 app.module.ts 中导入 StorageModule**

在 `apps/server/src/app.module.ts` 的 imports 数组中，`DatabaseModule` 之后添加 `StorageModule`：

```typescript
import { StorageModule } from './storage/storage.module';

// imports 数组中:
StorageModule,
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/storage/ apps/server/src/app.module.ts
git commit -m "feat: add StorageModule with S3 client"
```

---

## Task 6: WechatWorkModule — 企业微信回调接收

**Files:**
- Create: `apps/server/src/wechat-work/wechat-work.module.ts`
- Create: `apps/server/src/wechat-work/wechat-work.controller.ts`
- Create: `apps/server/src/wechat-work/wechat-work.service.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: 创建 wechat-work.service.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';
import { StorageService } from '../storage/storage.service';
import { getSignature, decrypt, encrypt } from '@wecom/crypto';
import { parseStringPromise } from 'xml2js';
import axios from 'axios';
import { v4 as uuidv4 } from 'crypto';

@Injectable()
export class WechatWorkService {
  private readonly logger = new Logger(WechatWorkService.name);
  private pendingGroups = new Map<string, { taskId: string; timer: NodeJS.Timeout }>();

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: SystemConfigsService,
    private readonly storageService: StorageService,
  ) {}

  async verifyCallback(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    echostr: string,
  ): Promise<string> {
    const token = await this.configService.getValue('wechat_work.token');
    const encodingAesKey = await this.configService.getValue('wechat_work.encoding_aes_key');
    if (!token || !encodingAesKey) throw new Error('WeChat Work not configured');

    const signature = getSignature(token, timestamp, nonce, echostr);
    if (signature !== msgSignature) throw new Error('Invalid signature');

    const { message } = decrypt(encodingAesKey, echostr);
    return message;
  }

  async handleMessage(
    msgSignature: string,
    timestamp: string,
    nonce: string,
    body: string,
  ): Promise<string> {
    const token = await this.configService.getValue('wechat_work.token');
    const encodingAesKey = await this.configService.getValue('wechat_work.encoding_aes_key');
    const corpId = await this.configService.getValue('wechat_work.corp_id');
    if (!token || !encodingAesKey || !corpId) throw new Error('WeChat Work not configured');

    // 解析 XML
    const parsed = await parseStringPromise(body, { explicitArray: false });
    const encryptedMsg = parsed.xml.Encrypt;

    // 验签
    const signature = getSignature(token, timestamp, nonce, encryptedMsg);
    if (signature !== msgSignature) throw new Error('Invalid signature');

    // 解密
    const { message, id } = decrypt(encodingAesKey, encryptedMsg);
    if (id !== corpId) throw new Error('Corp ID mismatch');

    // 解析解密后的 XML
    const msgXml = await parseStringPromise(message, { explicitArray: false });
    const msg = msgXml.xml;

    // 存储消息
    await this.saveMessage(msg);

    // 返回 success
    return 'success';
  }

  private async saveMessage(msg: Record<string, string>): Promise<void> {
    const msgType = msg.MsgType;
    const fromUser = msg.FromUserName;
    const msgId = msg.MsgId || `${Date.now()}`;

    let mediaUrl: string | null = null;

    // 如果是图片消息，下载并上传到 S3
    if (msgType === 'image' && msg.PicUrl) {
      try {
        mediaUrl = await this.downloadAndUploadMedia(msg.PicUrl, msgId);
      } catch (e) {
        this.logger.error(`Failed to download media for msg ${msgId}`, e);
      }
    }

    // 存入数据库
    const [wechatMessage] = await this.db
      .insert(schema.wechatMessages)
      .values({
        msgId,
        msgType,
        content: msg.Content || null,
        mediaUrl,
        fromUser,
        rawPayload: msg,
      })
      .returning();

    // 消息分组
    await this.groupMessage(wechatMessage.id, fromUser);
  }

  private async downloadAndUploadMedia(picUrl: string, msgId: string): Promise<string> {
    const response = await axios.get(picUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const key = `wechat-messages/${msgId}.${ext}`;
    await this.storageService.upload(key, buffer, contentType);
    return key;
  }

  private async groupMessage(messageId: string, fromUser: string): Promise<void> {
    const groupKey = fromUser;
    const existing = this.pendingGroups.get(groupKey);

    if (existing) {
      // 追加到现有 task
      await this.db.insert(schema.parseTaskMessages).values({
        parseTaskId: existing.taskId,
        wechatMessageId: messageId,
      });
      // 重置定时器
      clearTimeout(existing.timer);
      existing.timer = setTimeout(() => this.triggerParse(groupKey), 30_000);
    } else {
      // 创建新 task
      const [task] = await this.db
        .insert(schema.parseTasks)
        .values({ status: 'pending' })
        .returning();

      await this.db.insert(schema.parseTaskMessages).values({
        parseTaskId: task.id,
        wechatMessageId: messageId,
      });

      const timer = setTimeout(() => this.triggerParse(groupKey), 30_000);
      this.pendingGroups.set(groupKey, { taskId: task.id, timer });
    }
  }

  private async triggerParse(groupKey: string): Promise<void> {
    const group = this.pendingGroups.get(groupKey);
    if (!group) return;
    this.pendingGroups.delete(groupKey);

    // 触发异步解析（通过事件或直接调用，这里用动态导入避免循环依赖）
    // AiParseService 会监听或被调用
    this.logger.log(`Triggering parse for task ${group.taskId}`);

    // 发射事件让 AiParseModule 处理
    // 实现方式：注入 EventEmitter2 或直接注入 AiParseService
    // 这里先留出接口，在 Task 8 中完成连接
  }

  async getAccessToken(): Promise<string> {
    const corpId = await this.configService.getValue('wechat_work.corp_id');
    const secret = await this.configService.getValue('wechat_work.secret');
    if (!corpId || !secret) throw new Error('WeChat Work not configured');

    const res = await axios.get(
      `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`,
    );

    if (res.data.errcode !== 0) {
      throw new Error(`Failed to get access token: ${res.data.errmsg}`);
    }

    return res.data.access_token;
  }
}
```

- [ ] **Step 2: 创建 wechat-work.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { WechatWorkService } from './wechat-work.service';

@Controller('webhook/wechat-work')
export class WechatWorkController {
  constructor(private readonly wechatWorkService: WechatWorkService) {}

  // 企业微信 URL 验证回调
  @Get()
  async verify(
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
    @Res() res: Response,
  ) {
    try {
      const plainEchoStr = await this.wechatWorkService.verifyCallback(
        msgSignature,
        timestamp,
        nonce,
        echostr,
      );
      res.send(plainEchoStr);
    } catch (e) {
      res.status(403).send('Verification failed');
    }
  }

  // 接收消息回调
  @Post()
  @HttpCode(200)
  async receiveMessage(
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Body() body: string,
  ) {
    return this.wechatWorkService.handleMessage(
      msgSignature,
      timestamp,
      nonce,
      body,
    );
  }
}
```

- [ ] **Step 3: 创建 wechat-work.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { WechatWorkController } from './wechat-work.controller';
import { WechatWorkService } from './wechat-work.service';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';

@Module({
  controllers: [WechatWorkController],
  providers: [WechatWorkService, SystemConfigsService],
  exports: [WechatWorkService],
})
export class WechatWorkModule {}
```

- [ ] **Step 4: 在 app.module.ts 中导入**

```typescript
import { WechatWorkModule } from './wechat-work/wechat-work.module';

// imports 数组中:
WechatWorkModule,
```

注意：WechatWorkController 的回调接口不使用 AdminGuard，接收原始 XML body 需要在 main.ts 中配置 raw body parser，或在 controller 中使用 `@Req()` 获取原始 body。需要在 `main.ts` 中添加：

```typescript
app.use('/webhook/wechat-work', express.text({ type: 'text/xml' }));
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/wechat-work/ apps/server/src/app.module.ts
git commit -m "feat: add WechatWorkModule for callback handling"
```

---

## Task 7: AiParseModule — Grok Vision 解析

**Files:**
- Create: `apps/server/src/ai-parse/ai-parse.module.ts`
- Create: `apps/server/src/ai-parse/ai-parse.service.ts`
- Create: `apps/server/src/ai-parse/parse-task.service.ts`
- Create: `apps/server/src/ai-parse/parse-task.controller.ts`
- Create: `apps/server/src/ai-parse/dto/confirm-parse.dto.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: 创建 ai-parse.service.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { xai } from '@ai-sdk/xai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';
import { StorageService } from '../storage/storage.service';
import { createXai } from '@ai-sdk/xai';

const parsedResultSchema = z.object({
  clubName: z.string().describe('俱乐部名称'),
  services: z.array(
    z.object({
      name: z.string().describe('服务类型名称，如"绝密趣味单"'),
      tiers: z.array(
        z.object({
          price: z.number().describe('价格（元）'),
          guarantee: z.string().describe('保底数值，如"788W"'),
          note: z.string().optional().describe('附加说明，如"仅限一次"'),
        }),
      ),
    }),
  ),
  rules: z.array(
    z.object({
      content: z.string().describe('规则内容'),
      category: z.string().describe('规则分类，如"体验须知"、"炸单标准"'),
    }),
  ),
});

// 注意：ParsedResult 类型已在 @delta-club/shared 中定义
// 这里的 Zod schema 用于 AI SDK 的 structured output，字段需与 shared 中的 ParsedResult 保持一致

@Injectable()
export class AiParseService {
  private readonly logger = new Logger(AiParseService.name);

  constructor(
    private readonly configService: SystemConfigsService,
    private readonly storageService: StorageService,
  ) {}

  async parseImages(imageKeys: string[], textContents: string[]): Promise<ParsedResult> {
    const apiKey = await this.configService.getValue('xai.api_key');
    const model = (await this.configService.getValue('xai.model')) || 'grok-4-1-fast-non-reasoning';
    if (!apiKey) throw new Error('xAI API key not configured');

    const provider = createXai({ apiKey });

    // 构建消息内容
    const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: Buffer }> = [];

    content.push({
      type: 'text',
      text: `你是一个游戏陪玩俱乐部价目表解析助手。请从以下图片和文本中提取俱乐部名称、服务类型及其价格档位、以及规则条款。
所有图片来自同一家俱乐部。请尽可能完整地提取所有信息。`,
    });

    // 添加图片
    for (const key of imageKeys) {
      const url = await this.storageService.getSignedUrl(key);
      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());
      content.push({ type: 'image', image: buffer });
    }

    // 添加文本内容
    if (textContents.length > 0) {
      content.push({
        type: 'text',
        text: `附带的文本消息：\n${textContents.join('\n---\n')}`,
      });
    }

    const { object } = await generateObject({
      model: provider(model),
      schema: parsedResultSchema,
      messages: [{ role: 'user', content }],
    });

    return object;
  }
}
```

- [ ] **Step 2: 创建 confirm-parse.dto.ts**

```typescript
import { IsString, IsOptional, IsObject } from 'class-validator';

export class ConfirmParseDto {
  @IsString()
  clubId: string;

  @IsOptional()
  @IsObject()
  parsedResult?: Record<string, unknown>;
}
```

- [ ] **Step 3: 创建 parse-task.service.ts**

```typescript
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { AiParseService } from './ai-parse.service';

@Injectable()
export class ParseTaskService {
  private readonly logger = new Logger(ParseTaskService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly aiParseService: AiParseService,
  ) {}

  async findAll(status?: string) {
    const where = status
      ? eq(schema.parseTasks.status, status as 'pending' | 'parsing' | 'completed' | 'failed')
      : undefined;

    return this.db
      .select()
      .from(schema.parseTasks)
      .where(where)
      .orderBy(desc(schema.parseTasks.createdAt));
  }

  async findOne(id: string) {
    const [task] = await this.db
      .select()
      .from(schema.parseTasks)
      .where(eq(schema.parseTasks.id, id))
      .limit(1);

    if (!task) throw new NotFoundException('Parse task not found');

    // 获取关联消息
    const messageLinks = await this.db
      .select()
      .from(schema.parseTaskMessages)
      .where(eq(schema.parseTaskMessages.parseTaskId, id));

    const messageIds = messageLinks.map((l) => l.wechatMessageId);
    const messages = messageIds.length > 0
      ? await this.db
          .select()
          .from(schema.wechatMessages)
          .where(inArray(schema.wechatMessages.id, messageIds))
      : [];

    return { ...task, messages };
  }

  async triggerParse(taskId: string): Promise<void> {
    // 更新状态为 parsing
    await this.db
      .update(schema.parseTasks)
      .set({ status: 'parsing', updatedAt: new Date() })
      .where(eq(schema.parseTasks.id, taskId));

    try {
      const { messages } = await this.findOne(taskId);

      const imageKeys = messages
        .filter((m) => m.msgType === 'image' && m.mediaUrl)
        .map((m) => m.mediaUrl!);

      const textContents = messages
        .filter((m) => m.msgType === 'text' && m.content)
        .map((m) => m.content!);

      if (imageKeys.length === 0 && textContents.length === 0) {
        throw new Error('No content to parse');
      }

      const result = await this.aiParseService.parseImages(imageKeys, textContents);

      await this.db
        .update(schema.parseTasks)
        .set({
          status: 'completed',
          parsedResult: result,
          updatedAt: new Date(),
        })
        .where(eq(schema.parseTasks.id, taskId));
    } catch (e) {
      this.logger.error(`Parse failed for task ${taskId}`, e);
      await this.db
        .update(schema.parseTasks)
        .set({
          status: 'failed',
          errorMessage: e instanceof Error ? e.message : String(e),
          updatedAt: new Date(),
        })
        .where(eq(schema.parseTasks.id, taskId));
    }
  }

  async confirmAndImport(taskId: string, clubId: string, editedResult?: Record<string, unknown>) {
    const task = await this.findOne(taskId);

    const result = editedResult || task.parsedResult;
    if (!result) throw new Error('No parsed result to import');

    // 更新 task 关联的 clubId
    await this.db
      .update(schema.parseTasks)
      .set({ clubId, updatedAt: new Date() })
      .where(eq(schema.parseTasks.id, taskId));

    // 后续可以在此处根据 result 自动写入 club_services 和 club_rules
    // 当前版本仅关联 clubId，具体的 service/rule 导入逻辑由前端审核页面处理

    return { success: true };
  }

  async retryParse(taskId: string): Promise<void> {
    await this.triggerParse(taskId);
  }
}
```

- [ ] **Step 4: 创建 parse-task.controller.ts**

```typescript
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { ParseTaskService } from './parse-task.service';
import { ConfirmParseDto } from './dto/confirm-parse.dto';

@Controller('admin/parse-tasks')
@UseGuards(AdminGuard)
export class ParseTaskController {
  constructor(private readonly parseTaskService: ParseTaskService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.parseTaskService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parseTaskService.findOne(id);
  }

  @Post(':id/retry')
  retry(@Param('id') id: string) {
    this.parseTaskService.retryParse(id);
    return { message: 'Parse triggered' };
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() dto: ConfirmParseDto) {
    return this.parseTaskService.confirmAndImport(id, dto.clubId, dto.parsedResult);
  }
}
```

- [ ] **Step 5: 创建 ai-parse.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { AiParseService } from './ai-parse.service';
import { ParseTaskService } from './parse-task.service';
import { ParseTaskController } from './parse-task.controller';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';

@Module({
  controllers: [ParseTaskController],
  providers: [AiParseService, ParseTaskService, SystemConfigsService],
  exports: [ParseTaskService],
})
export class AiParseModule {}
```

- [ ] **Step 6: 在 app.module.ts 中导入**

```typescript
import { AiParseModule } from './ai-parse/ai-parse.module';

// imports 数组中:
AiParseModule,
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/ai-parse/ apps/server/src/app.module.ts
git commit -m "feat: add AiParseModule with Grok Vision integration"
```

---

## Task 8: 连接 WechatWorkModule 和 AiParseModule

**Files:**
- Modify: `apps/server/src/wechat-work/wechat-work.service.ts`
- Modify: `apps/server/src/wechat-work/wechat-work.module.ts`

- [ ] **Step 1: 注入 ParseTaskService 到 WechatWorkService**

在 `wechat-work.service.ts` 中：

1. 添加 import：`import { ParseTaskService } from '../ai-parse/parse-task.service';`
2. constructor 中添加：`private readonly parseTaskService: ParseTaskService`
3. 将 `triggerParse` 方法中的 logger.log 替换为实际调用：

```typescript
  private async triggerParse(groupKey: string): Promise<void> {
    const group = this.pendingGroups.get(groupKey);
    if (!group) return;
    this.pendingGroups.delete(groupKey);

    this.logger.log(`Triggering parse for task ${group.taskId}`);
    // 异步触发，不等待结果
    this.parseTaskService.triggerParse(group.taskId).catch((e) => {
      this.logger.error(`Parse failed for task ${group.taskId}`, e);
    });
  }
```

- [ ] **Step 2: 更新 WechatWorkModule 导入 AiParseModule**

```typescript
import { Module } from '@nestjs/common';
import { WechatWorkController } from './wechat-work.controller';
import { WechatWorkService } from './wechat-work.service';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';
import { AiParseModule } from '../ai-parse/ai-parse.module';

@Module({
  imports: [AiParseModule],
  controllers: [WechatWorkController],
  providers: [WechatWorkService, SystemConfigsService],
  exports: [WechatWorkService],
})
export class WechatWorkModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/wechat-work/
git commit -m "feat: connect WechatWork message grouping to AI parse pipeline"
```

---

## Task 9: 公众号头像获取接口

**Files:**
- Modify: `apps/server/src/admin/clubs/clubs.controller.ts`
- Modify: `apps/server/src/admin/clubs/clubs.service.ts`

- [ ] **Step 1: ClubsService 新增 fetchWechatAvatar 方法**

在 `apps/server/src/admin/clubs/clubs.service.ts` 中添加：

```typescript
import { StorageService } from '../../storage/storage.service';
import axios from 'axios';

// constructor 中注入：
constructor(
  @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  private readonly storageService: StorageService,
) {}

async fetchWechatAvatar(wechatOfficialAccount: string): Promise<string> {
  // 通过搜狗微信搜索获取公众号头像（公开接口）
  const searchUrl = `https://weixin.sogou.com/weixin?type=1&query=${encodeURIComponent(wechatOfficialAccount)}`;

  const response = await axios.get(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });

  // 从 HTML 中提取头像 URL
  const html = response.data as string;
  const avatarMatch = html.match(/img[^>]+src="(https?:\/\/[^"]+)"/);
  if (!avatarMatch) {
    throw new Error('无法获取公众号头像');
  }

  const avatarUrl = avatarMatch[1];

  // 下载头像并上传到 S3
  const imgResponse = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(imgResponse.data);
  const key = `club-logos/${wechatOfficialAccount}-${Date.now()}.jpg`;
  await this.storageService.upload(key, buffer, 'image/jpeg');

  return this.storageService.getPublicUrl(key);
}
```

- [ ] **Step 2: ClubsController 新增路由**

在 `apps/server/src/admin/clubs/clubs.controller.ts` 中添加：

```typescript
@Post('fetch-wechat-avatar')
async fetchWechatAvatar(@Body() body: { wechatOfficialAccount: string }) {
  try {
    const logoUrl = await this.clubsService.fetchWechatAvatar(body.wechatOfficialAccount);
    return { logoUrl };
  } catch {
    throw new BadRequestException('获取失败，请手动上传');
  }
}
```

需要导入 `BadRequestException`。

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/admin/clubs/
git commit -m "feat: add wechat official account avatar fetch endpoint"
```

---

## Task 10: 前端 — 更新 API 客户端和共享类型

**Files:**
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: 新增 parse-task 相关 API 和头像获取 API**

在 `apps/admin/src/lib/api.ts` 尾部（`export default api` 之前）添加：

```typescript
import type {
  // ... 现有 imports ...
  ParseTaskDto,
} from '@delta-club/shared'

// Parse Tasks
export const getParseTasks = (status?: string) =>
  api.get<ParseTaskDto[]>('/parse-tasks', { params: { status } }).then((res) => res.data)

export const getParseTask = (id: string) =>
  api.get<ParseTaskDto>(`/parse-tasks/${id}`).then((res) => res.data)

export const retryParseTask = (id: string) =>
  api.post(`/parse-tasks/${id}/retry`).then((res) => res.data)

export const confirmParseTask = (id: string, data: { clubId: string; parsedResult?: unknown }) =>
  api.post(`/parse-tasks/${id}/confirm`, data).then((res) => res.data)

// Wechat Avatar
export const fetchWechatAvatar = (wechatOfficialAccount: string) =>
  api.post<{ logoUrl: string }>('/clubs/fetch-wechat-avatar', { wechatOfficialAccount }).then((res) => res.data)
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/lib/api.ts
git commit -m "feat: add parse-task and wechat-avatar API functions"
```

---

## Task 11: 前端 — 俱乐部表单新增工商信息和头像获取

**Files:**
- Modify: `apps/admin/src/features/clubs/data/schema.ts`
- Modify: `apps/admin/src/features/clubs/components/club-form.tsx`

- [ ] **Step 1: 更新表单 schema**

在 `apps/admin/src/features/clubs/data/schema.ts` 中：

`clubSchema` 对象新增：

```typescript
  companyName: z.string().nullable(),
  creditCode: z.string().nullable(),
  legalPerson: z.string().nullable(),
  registeredAddress: z.string().nullable(),
  businessScope: z.string().nullable(),
  registeredCapital: z.string().nullable(),
  companyEstablishedAt: z.string().nullable(),
  businessStatus: z.string().nullable(),
```

`clubFormSchema` 对象新增：

```typescript
  companyName: z.string().optional(),
  creditCode: z.string().optional(),
  legalPerson: z.string().optional(),
  registeredAddress: z.string().optional(),
  businessScope: z.string().optional(),
  registeredCapital: z.string().optional(),
  companyEstablishedAt: z.string().optional(),
  businessStatus: z.string().optional(),
```

- [ ] **Step 2: 更新 club-form.tsx — 添加工商信息字段和头像按钮**

在 `apps/admin/src/features/clubs/components/club-form.tsx` 中：

1. 添加 import：

```typescript
import { useState } from 'react'
import { fetchWechatAvatar } from '@/lib/api'
```

2. Logo 字段替换为支持"一键获取"的版本：

```tsx
<FormField
  control={form.control}
  name='logo'
  render={({ field }) => (
    <FormItem>
      <FormLabel>Logo URL</FormLabel>
      <div className='flex gap-2'>
        <FormControl>
          <Input placeholder='请输入 Logo 链接' {...field} />
        </FormControl>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!form.watch('wechatOfficialAccount') || isFetchingAvatar}
          onClick={async () => {
            const account = form.getValues('wechatOfficialAccount')
            if (!account) return
            setIsFetchingAvatar(true)
            try {
              const { logoUrl } = await fetchWechatAvatar(account)
              form.setValue('logo', logoUrl)
            } catch {
              // toast error
            } finally {
              setIsFetchingAvatar(false)
            }
          }}
        >
          {isFetchingAvatar ? '获取中...' : '获取公众号头像'}
        </Button>
      </div>
      <FormMessage />
    </FormItem>
  )}
/>
```

3. 在表单底部（`establishedAt` 之后、提交按钮之前）添加工商信息区域：

```tsx
<div className='space-y-4 border-t pt-4'>
  <h3 className='text-sm font-medium'>工商信息</h3>

  <div className='grid gap-4 sm:grid-cols-2'>
    <FormField control={form.control} name='companyName' render={({ field }) => (
      <FormItem>
        <FormLabel>公司全称</FormLabel>
        <FormControl><Input placeholder='请输入公司全称' {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />

    <FormField control={form.control} name='creditCode' render={({ field }) => (
      <FormItem>
        <FormLabel>统一社会信用代码</FormLabel>
        <FormControl><Input placeholder='请输入信用代码' {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  </div>

  <div className='grid gap-4 sm:grid-cols-2'>
    <FormField control={form.control} name='legalPerson' render={({ field }) => (
      <FormItem>
        <FormLabel>法人</FormLabel>
        <FormControl><Input placeholder='请输入法人姓名' {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />

    <FormField control={form.control} name='businessStatus' render={({ field }) => (
      <FormItem>
        <FormLabel>经营状态</FormLabel>
        <FormControl><Input placeholder='如：存续、注销' {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  </div>

  <FormField control={form.control} name='registeredAddress' render={({ field }) => (
    <FormItem>
      <FormLabel>注册地址</FormLabel>
      <FormControl><Input placeholder='请输入注册地址' {...field} /></FormControl>
      <FormMessage />
    </FormItem>
  )} />

  <div className='grid gap-4 sm:grid-cols-2'>
    <FormField control={form.control} name='registeredCapital' render={({ field }) => (
      <FormItem>
        <FormLabel>注册资本</FormLabel>
        <FormControl><Input placeholder='如：100万元' {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />

    <FormField control={form.control} name='companyEstablishedAt' render={({ field }) => (
      <FormItem>
        <FormLabel>公司成立日期</FormLabel>
        <FormControl><Input type='date' {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  </div>

  <FormField control={form.control} name='businessScope' render={({ field }) => (
    <FormItem>
      <FormLabel>经营范围</FormLabel>
      <FormControl><Textarea placeholder='请输入经营范围' {...field} /></FormControl>
      <FormMessage />
    </FormItem>
  )} />
</div>
```

4. 组件内部添加状态：

```typescript
const [isFetchingAvatar, setIsFetchingAvatar] = useState(false)
```

5. defaultValues 新增工商字段默认值（均为 `''`）。

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/clubs/
git commit -m "feat: add business info fields and avatar fetch to club form"
```

---

## Task 12: 前端 — 解析任务列表页

**Files:**
- Create: `apps/admin/src/features/parse-tasks/index.tsx`
- Create: `apps/admin/src/features/parse-tasks/components/parse-tasks-columns.tsx`
- Create: `apps/admin/src/routes/_authenticated/parse-tasks/index.tsx`
- Create: `apps/admin/src/routes/_authenticated/parse-tasks/route.tsx`

- [ ] **Step 1: 创建路由布局文件**

`apps/admin/src/routes/_authenticated/parse-tasks/route.tsx`:

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/parse-tasks')({
  component: () => <Outlet />,
})
```

- [ ] **Step 2: 创建路由入口**

`apps/admin/src/routes/_authenticated/parse-tasks/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import ParseTasksPage from '@/features/parse-tasks'

export const Route = createFileRoute('/_authenticated/parse-tasks/')({
  component: ParseTasksPage,
})
```

- [ ] **Step 3: 创建列定义**

`apps/admin/src/features/parse-tasks/components/parse-tasks-columns.tsx`:

```tsx
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ParseTaskDto } from '@delta-club/shared'
import { Link } from '@tanstack/react-router'

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待解析', variant: 'outline' },
  parsing: { label: '解析中', variant: 'secondary' },
  completed: { label: '已完成', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
}

export const parseTasksColumns: ColumnDef<ParseTaskDto>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => row.original.id.slice(0, 8),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const s = statusMap[row.original.status] ?? { label: row.original.status, variant: 'outline' as const }
      return <Badge variant={s.variant}>{s.label}</Badge>
    },
  },
  {
    accessorKey: 'parsedResult',
    header: '识别俱乐部',
    cell: ({ row }) => {
      const result = row.original.parsedResult
      return result?.clubName ?? '-'
    },
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('zh-CN'),
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => (
      <Button variant='ghost' size='sm' asChild>
        <Link to='/parse-tasks/$id' params={{ id: row.original.id }}>
          查看
        </Link>
      </Button>
    ),
  },
]
```

- [ ] **Step 4: 创建列表页**

`apps/admin/src/features/parse-tasks/index.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'
import { getParseTasks } from '@/lib/api'
import { parseTasksColumns } from './components/parse-tasks-columns'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function ParseTasksPage() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['parse-tasks'],
    queryFn: () => getParseTasks(),
  })

  const table = useReactTable({
    data: tasks,
    columns: parseTasksColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>消息解析</h2>
        <p className='text-muted-foreground'>
          企业微信接收的消息经 AI 解析后在此审核
        </p>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
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
                <TableCell colSpan={parseTasksColumns.length} className='h-24 text-center'>
                  暂无解析任务
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/parse-tasks/ apps/admin/src/routes/_authenticated/parse-tasks/
git commit -m "feat: add parse tasks list page"
```

---

## Task 13: 前端 — 解析任务审核详情页

**Files:**
- Create: `apps/admin/src/features/parse-tasks/components/parse-task-review.tsx`
- Create: `apps/admin/src/routes/_authenticated/parse-tasks/$id/route.tsx`

- [ ] **Step 1: 创建审核详情路由**

`apps/admin/src/routes/_authenticated/parse-tasks/$id/route.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ParseTaskReview } from '@/features/parse-tasks/components/parse-task-review'

export const Route = createFileRoute('/_authenticated/parse-tasks/$id')({
  component: ParseTaskReview,
})
```

- [ ] **Step 2: 创建审核详情组件**

`apps/admin/src/features/parse-tasks/components/parse-task-review.tsx`:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { getParseTask, retryParseTask, confirmParseTask, getClubs } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

export function ParseTaskReview() {
  const { id } = useParams({ from: '/_authenticated/parse-tasks/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedClubId, setSelectedClubId] = useState<string>('')
  const [editedJson, setEditedJson] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)

  const { data: task, isLoading } = useQuery({
    queryKey: ['parse-task', id],
    queryFn: () => getParseTask(id),
  })

  const { data: clubsData } = useQuery({
    queryKey: ['clubs', { page: 1, pageSize: 100 }],
    queryFn: () => getClubs({ page: 1, pageSize: 100 }),
  })

  const retryMutation = useMutation({
    mutationFn: () => retryParseTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parse-task', id] }),
  })

  const confirmMutation = useMutation({
    mutationFn: () => {
      const parsedResult = isEditing ? JSON.parse(editedJson) : undefined
      return confirmParseTask(id, { clubId: selectedClubId, parsedResult })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parse-tasks'] })
      navigate({ to: '/parse-tasks' })
    },
  })

  if (isLoading || !task) return <div>加载中...</div>

  const statusMap: Record<string, string> = {
    pending: '待解析',
    parsing: '解析中',
    completed: '已完成',
    failed: '失败',
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>解析任务详情</h2>
          <Badge className='mt-1'>{statusMap[task.status] ?? task.status}</Badge>
        </div>
        <div className='flex gap-2'>
          {(task.status === 'failed' || task.status === 'pending') && (
            <Button
              variant='outline'
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
            >
              {retryMutation.isPending ? '解析中...' : '重新解析'}
            </Button>
          )}
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        {/* 左侧：原始图片 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>原始消息</h3>
          <div className='space-y-2'>
            {task.messages?.map((msg) => (
              <div key={msg.id} className='rounded-md border p-3'>
                {msg.msgType === 'image' && msg.mediaUrl && (
                  <img
                    src={msg.mediaUrl}
                    alt='消息图片'
                    className='max-h-96 rounded-md object-contain'
                  />
                )}
                {msg.msgType === 'text' && msg.content && (
                  <p className='text-sm'>{msg.content}</p>
                )}
                <p className='mt-1 text-xs text-muted-foreground'>
                  {new Date(msg.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            ))}
            {(!task.messages || task.messages.length === 0) && (
              <p className='text-sm text-muted-foreground'>无关联消息</p>
            )}
          </div>
        </div>

        {/* 右侧：解析结果 */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-medium'>AI 解析结果</h3>
            {task.parsedResult && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  if (!isEditing) {
                    setEditedJson(JSON.stringify(task.parsedResult, null, 2))
                  }
                  setIsEditing(!isEditing)
                }}
              >
                {isEditing ? '取消编辑' : '编辑'}
              </Button>
            )}
          </div>

          {task.errorMessage && (
            <div className='rounded-md border border-destructive p-3'>
              <p className='text-sm text-destructive'>{task.errorMessage}</p>
            </div>
          )}

          {task.parsedResult && !isEditing && (
            <pre className='max-h-[500px] overflow-auto rounded-md bg-muted p-4 text-sm'>
              {JSON.stringify(task.parsedResult, null, 2)}
            </pre>
          )}

          {isEditing && (
            <Textarea
              value={editedJson}
              onChange={(e) => setEditedJson(e.target.value)}
              className='min-h-[400px] font-mono text-sm'
            />
          )}

          {task.status === 'completed' && task.parsedResult && (
            <div className='space-y-3 border-t pt-4'>
              <h4 className='text-sm font-medium'>关联俱乐部</h4>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger>
                  <SelectValue placeholder='选择俱乐部' />
                </SelectTrigger>
                <SelectContent>
                  {clubsData?.data.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className='w-full'
                disabled={!selectedClubId || confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                {confirmMutation.isPending ? '确认中...' : '确认并导入'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/parse-tasks/components/parse-task-review.tsx apps/admin/src/routes/_authenticated/parse-tasks/\$id/
git commit -m "feat: add parse task review detail page"
```

---

## Task 14: 前端 — 导航菜单和设置页更新

**Files:**
- 需要找到侧边栏导航配置文件并添加"消息解析"入口
- Modify: `apps/admin/src/routes/_authenticated/settings/index.tsx`

- [ ] **Step 1: 在侧边栏导航中添加"消息解析"入口**

找到项目中定义导航菜单的位置（通常在 layout 或 sidebar 组件中），添加：

```tsx
{
  title: '消息解析',
  href: '/parse-tasks',
  icon: MessageSquare, // 或其他合适的 lucide 图标
}
```

- [ ] **Step 2: 设置页添加企业微信和 AI 配置入口**

在 `apps/admin/src/routes/_authenticated/settings/index.tsx` 的 `sidebarNavItems` 中添加：

```tsx
{ title: '企业微信', href: '/settings/wechat-work' },
{ title: 'AI 配置', href: '/settings/ai' },
```

注意：具体的设置表单页面（维护 system_configs 中的企业微信和 xAI 配置值）可以复用现有的 system-configs API，在后续迭代中完善。当前先添加导航入口。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add parse-tasks nav entry and settings sections"
```

---

## Task 15: 配置和启动验证

**Files:**
- Modify: `apps/server/.env.local`（或 `.env`）

- [ ] **Step 1: 添加 S3 环境变量到 .env.local**

```env
S3_ENDPOINT=https://objectstoreapi.xxx.sealos.run
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=delta-club
```

- [ ] **Step 2: 确保 .env.local 在 .gitignore 中**

```bash
grep -q '.env.local' apps/server/.gitignore || echo '.env.local' >> apps/server/.gitignore
```

- [ ] **Step 3: 启动后端验证编译**

```bash
cd apps/server && pnpm build
```

Expected: 编译无错误

- [ ] **Step 4: 启动前端验证编译**

```bash
cd apps/admin && pnpm build
```

Expected: 编译无错误

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add S3 env config template and verify builds"
```
