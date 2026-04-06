# 订单海报 & AI 解析简化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Club 新增订单海报图片数组字段，为 ClubService 新增辅助图片数组字段，调整 AI 解析 prompt 降低护航趣味单解析要求，新增通用文件上传接口。

**Architecture:** 后端 Drizzle schema 各新增一个 `text[]` 字段，DTO/shared types 同步更新。新增通用 `/admin/upload` 上传接口。前端 club-form 和 service-form 各新增图片上传区域，复用上传接口。AI prompt 微调。

**Tech Stack:** NestJS + Drizzle ORM + PostgreSQL text[] + Multer + S3 + React + react-hook-form + shadcn/ui

---

## File Map

**Create:**
- `apps/server/src/admin/upload/upload.controller.ts` — 通用文件上传 controller
- `apps/server/src/admin/upload/upload.module.ts` — 上传模块

**Modify:**
- `apps/server/src/database/schema/club.schema.ts` — 新增 `orderPosters` 字段
- `apps/server/src/database/schema/club-service.schema.ts` — 新增 `images` 字段
- `packages/shared/src/types.ts` — ClubDto 新增 `orderPosters`，ClubServiceDto 新增 `images`
- `apps/server/src/admin/clubs/dto/create-club.dto.ts` — 新增 `orderPosters`
- `apps/server/src/admin/clubs/dto/update-club.dto.ts` — 新增 `orderPosters`
- `apps/server/src/admin/club-services/dto/create-club-service.dto.ts` — 新增 `images`
- `apps/server/src/admin/club-services/dto/update-club-service.dto.ts` — 新增 `images`
- `apps/server/src/admin/admin.module.ts` — 注册 UploadModule
- `apps/server/src/ai-parse/ai-parse.service.ts` — 调整 prompt
- `apps/admin/src/lib/api.ts` — 新增 `uploadFile` 函数
- `apps/admin/src/features/clubs/data/schema.ts` — clubFormSchema 新增 `orderPosters`
- `apps/admin/src/features/clubs/data/service-schema.ts` — serviceFormSchema 新增 `images`
- `apps/admin/src/features/clubs/components/club-form.tsx` — 新增订单海报上传区域
- `apps/admin/src/features/clubs/detail/components/service-form.tsx` — 新增辅助图片上传区域
- `docs/requirements.md` — 同步需求变更
- `docs/design.md` — 同步数据模型变更

---

### Task 1: 后端 Schema 和迁移

**Files:**
- Modify: `apps/server/src/database/schema/club.schema.ts`
- Modify: `apps/server/src/database/schema/club-service.schema.ts`

- [ ] **Step 1: Club schema 新增 orderPosters 字段**

在 `apps/server/src/database/schema/club.schema.ts` 中：

1. 在 import 中添加 `text` (已有)
2. 在 `clubs` 表定义的 `businessStatus` 字段后面添加：

```typescript
  orderPosters: text('order_posters').array().default([]),
```

- [ ] **Step 2: ClubService schema 新增 images 字段**

在 `apps/server/src/database/schema/club-service.schema.ts` 中，`sortOrder` 字段后面添加：

```typescript
  images: text('images').array().default([]),
```

- [ ] **Step 3: 生成数据库迁移**

Run: `cd apps/server && pnpm db:generate`
Expected: 生成新的 SQL 迁移文件，包含 `ALTER TABLE "clubs" ADD COLUMN "order_posters" text[] DEFAULT '{}'` 和 `ALTER TABLE "club_services" ADD COLUMN "images" text[] DEFAULT '{}'`

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/database/schema/ apps/server/drizzle/
git commit -m "feat: add orderPosters to clubs and images to club_services schema"
```

---

### Task 2: Shared Types 和后端 DTO 更新

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `apps/server/src/admin/clubs/dto/create-club.dto.ts`
- Modify: `apps/server/src/admin/clubs/dto/update-club.dto.ts`
- Modify: `apps/server/src/admin/club-services/dto/create-club-service.dto.ts`
- Modify: `apps/server/src/admin/club-services/dto/update-club-service.dto.ts`

- [ ] **Step 1: 更新 shared ClubDto**

在 `packages/shared/src/types.ts` 的 `ClubDto` 接口中，`businessStatus` 后面添加：

```typescript
  orderPosters: string[];
```

- [ ] **Step 2: 更新 shared ClubServiceDto**

在 `ClubServiceDto` 接口中，`sortOrder` 后面添加：

```typescript
  images: string[];
```

- [ ] **Step 3: 更新 CreateClubDto**

在 `apps/server/src/admin/clubs/dto/create-club.dto.ts` 中，在 `businessStatus` 字段后添加：

```typescript
  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  orderPosters?: string[];
```

同时在 import 中添加 `IsArray`：

```typescript
import { IsString, IsOptional, IsEnum, IsDateString, ValidateIf, IsArray } from 'class-validator';
```

- [ ] **Step 4: 更新 UpdateClubDto**

在 `apps/server/src/admin/clubs/dto/update-club.dto.ts` 中，在 `businessStatus` 字段后添加：

```typescript
  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  orderPosters?: string[];
```

同时在 import 中添加 `IsArray`：

```typescript
import { IsString, IsOptional, IsEnum, IsDateString, ValidateIf, IsArray } from 'class-validator';
```

- [ ] **Step 5: 更新 CreateClubServiceDto**

在 `apps/server/src/admin/club-services/dto/create-club-service.dto.ts` 中，在 `sortOrder` 字段后添加：

```typescript
  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  images?: string[];
```

同时在 import 中添加 `IsArray`：

```typescript
import { IsEnum, IsOptional, IsString, IsNumber, IsBoolean, IsArray } from 'class-validator';
```

- [ ] **Step 6: 更新 UpdateClubServiceDto**

在 `apps/server/src/admin/club-services/dto/update-club-service.dto.ts` 中，在 `sortOrder` 字段后添加：

```typescript
  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  images?: string[];
```

同时在 import 中添加 `IsArray`：

```typescript
import { IsOptional, IsString, IsNumber, IsBoolean, IsArray } from 'class-validator';
```

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/types.ts apps/server/src/admin/clubs/dto/ apps/server/src/admin/club-services/dto/
git commit -m "feat: add orderPosters and images fields to DTOs and shared types"
```

---

### Task 3: 通用文件上传接口

**Files:**
- Create: `apps/server/src/admin/upload/upload.controller.ts`
- Create: `apps/server/src/admin/upload/upload.module.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 查看 AdminModule 注册方式**

Read `apps/server/src/admin/admin.module.ts` 了解模块注册模式。

- [ ] **Step 2: 创建 UploadController**

创建 `apps/server/src/admin/upload/upload.controller.ts`：

```typescript
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../../auth/admin.guard';
import { StorageService } from '../../storage/storage.service';
import { randomUUID } from 'crypto';

@Controller('admin/upload')
@UseGuards(AdminGuard)
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop() || 'bin';
    const key = `uploads/${randomUUID()}.${ext}`;
    await this.storageService.upload(key, file.buffer, file.mimetype);
    const url = this.storageService.getPublicUrl(key);
    return { url, key };
  }
}
```

- [ ] **Step 3: 创建 UploadModule**

创建 `apps/server/src/admin/upload/upload.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController],
})
export class UploadModule {}
```

- [ ] **Step 4: 在 AdminModule 中注册 UploadModule**

在 `apps/server/src/admin/admin.module.ts` 的 imports 数组中添加 `UploadModule`。

- [ ] **Step 5: 验证编译**

Run: `cd apps/server && pnpm build`
Expected: 编译成功

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/admin/upload/ apps/server/src/admin/admin.module.ts
git commit -m "feat: add general file upload endpoint POST /admin/upload"
```

---

### Task 4: AI 解析 Prompt 调整

**Files:**
- Modify: `apps/server/src/ai-parse/ai-parse.service.ts`

- [ ] **Step 1: 调整 prompt 内容**

在 `apps/server/src/ai-parse/ai-parse.service.ts` 第 82-100 行的 prompt 文本中，在 `## 解析要求` 部分的第 4 点后面添加第 5 点：

```
5. **护航趣味单**：护航趣味玩法的服务因玩法多样、规则复杂，尽力解析即可。如果无法确定具体的价格档位或规则，可以将该部分留空或简化处理，不要强行猜测。重点确保跑刀、陪玩、护航体验单、护航标准单这四类服务的解析准确性。
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/ai-parse/ai-parse.service.ts
git commit -m "feat: adjust AI prompt to deprioritize escort fun service parsing"
```

---

### Task 5: 前端 API 和 Schema 更新

**Files:**
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/features/clubs/data/schema.ts`
- Modify: `apps/admin/src/features/clubs/data/service-schema.ts`

- [ ] **Step 1: 新增 uploadFile API 函数**

在 `apps/admin/src/lib/api.ts` 的 `// AI Smart Import` 注释前添加：

```typescript
// Upload
export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<{ url: string; key: string }>('/upload', formData).then((res) => res.data)
}
```

- [ ] **Step 2: 更新 clubFormSchema**

在 `apps/admin/src/features/clubs/data/schema.ts` 的 `clubSchema` 中，`businessStatus` 后添加：

```typescript
  orderPosters: z.array(z.string()),
```

在 `clubFormSchema` 中，`businessStatus` 后添加：

```typescript
  orderPosters: z.array(z.string()).optional(),
```

- [ ] **Step 3: 更新 serviceFormSchema**

在 `apps/admin/src/features/clubs/data/service-schema.ts` 的 `serviceFormSchema` 中，`rules` 后添加：

```typescript
  images: z.array(z.string()).optional(),
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/api.ts apps/admin/src/features/clubs/data/
git commit -m "feat: add upload API and image array fields to frontend schemas"
```

---

### Task 6: 俱乐部表单 - 订单海报上传

**Files:**
- Modify: `apps/admin/src/features/clubs/components/club-form.tsx`

- [ ] **Step 1: 添加图片上传区域**

在 `apps/admin/src/features/clubs/components/club-form.tsx` 中：

1. 添加 import：
```typescript
import { uploadFile } from '@/lib/api'
import { X, Upload, Loader2 } from 'lucide-react'
```

2. 在 `defaultValues` 中添加 `orderPosters: []`

3. 在工商信息 section（`<div className='space-y-4 border-t pt-4'>` 之前）添加订单海报区域：

```tsx
        <div className='space-y-4 border-t pt-4'>
          <h3 className='text-sm font-medium'>订单海报</h3>
          <FormField
            control={form.control}
            name='orderPosters'
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className='space-y-3'>
                    {field.value && field.value.length > 0 && (
                      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
                        {field.value.map((url: string, index: number) => (
                          <div key={url} className='group relative aspect-[3/4] overflow-hidden rounded-lg border'>
                            <img src={url} alt={`海报 ${index + 1}`} className='h-full w-full object-cover' />
                            <button
                              type='button'
                              className='absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100'
                              onClick={() => {
                                const next = [...field.value!]
                                next.splice(index, 1)
                                field.onChange(next)
                              }}
                            >
                              <X className='h-3 w-3' />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <ImageUploadButton
                      onUploaded={(url) => field.onChange([...(field.value ?? []), url])}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
```

4. 在文件底部（`ClubForm` 组件外部）添加 `ImageUploadButton` 组件：

```tsx
function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={uploading}
      onClick={() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.multiple = true
        input.onchange = async () => {
          const files = input.files
          if (!files) return
          setUploading(true)
          try {
            for (const file of Array.from(files)) {
              const { url } = await uploadFile(file)
              onUploaded(url)
            }
          } finally {
            setUploading(false)
          }
        }
        input.click()
      }}
    >
      {uploading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Upload className='mr-2 h-4 w-4' />}
      {uploading ? '上传中...' : '上传图片'}
    </Button>
  )
}
```

- [ ] **Step 2: 验证编译**

Run: `cd apps/admin && pnpm build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/clubs/components/club-form.tsx
git commit -m "feat: add order poster image upload to club form"
```

---

### Task 7: 服务项表单 - 辅助图片上传

**Files:**
- Modify: `apps/admin/src/features/clubs/detail/components/service-form.tsx`

- [ ] **Step 1: 添加图片上传区域**

在 `apps/admin/src/features/clubs/detail/components/service-form.tsx` 中：

1. 添加 import：
```typescript
import { useState } from 'react'
import { uploadFile } from '@/lib/api'
import { X, Upload, Loader2 } from 'lucide-react'
```

2. 在 `defaultValues` 中添加 `images: []`

3. 在提交按钮（`<div className='flex justify-end gap-2 pt-2'>`）之前添加图片区域：

```tsx
        <div className='space-y-2'>
          <FormField
            control={form.control}
            name='images'
            render={({ field }) => (
              <FormItem>
                <FormLabel>辅助图片</FormLabel>
                <FormControl>
                  <div className='space-y-3'>
                    {field.value && field.value.length > 0 && (
                      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                        {field.value.map((url: string, index: number) => (
                          <div key={url} className='group relative aspect-[3/4] overflow-hidden rounded-lg border'>
                            <img src={url} alt={`图片 ${index + 1}`} className='h-full w-full object-cover' />
                            <button
                              type='button'
                              className='absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100'
                              onClick={() => {
                                const next = [...field.value!]
                                next.splice(index, 1)
                                field.onChange(next)
                              }}
                            >
                              <X className='h-3 w-3' />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <ImageUploadButton
                      onUploaded={(url) => field.onChange([...(field.value ?? []), url])}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
```

4. 在文件底部添加与 Task 6 相同的 `ImageUploadButton` 组件（因为两个文件独立，各自内联一份）：

```tsx
function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={uploading}
      onClick={() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.multiple = true
        input.onchange = async () => {
          const files = input.files
          if (!files) return
          setUploading(true)
          try {
            for (const file of Array.from(files)) {
              const { url } = await uploadFile(file)
              onUploaded(url)
            }
          } finally {
            setUploading(false)
          }
        }
        input.click()
      }}
    >
      {uploading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Upload className='mr-2 h-4 w-4' />}
      {uploading ? '上传中...' : '上传图片'}
    </Button>
  )
}
```

- [ ] **Step 2: 验证编译**

Run: `cd apps/admin && pnpm build`
Expected: 编译成功

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/clubs/detail/components/service-form.tsx
git commit -m "feat: add auxiliary image upload to service form"
```

---

### Task 8: 文档同步更新

**Files:**
- Modify: `docs/requirements.md`
- Modify: `docs/design.md`

- [ ] **Step 1: 更新需求文档**

在 `docs/requirements.md` 中：

1. 在 `### 2.2 管理后台（Admin）` → `#### 俱乐部管理` 下的 `AI 智能录入` 条目后添加：
```
- 订单海报管理（上传多张俱乐部海报图片，存储在 OSS）
```

2. 在 `AI 智能录入` 条目中补充说明：
```
- AI 智能录入：上传图片或粘贴文本 → AI 解析服务定价 → 用户确认后批量创建（护航趣味单解析为尽力而为，允许失败后手动录入）
```

3. 在服务项管理条目中补充：
```
- 服务项管理（跑刀/陪玩/护航体验/护航标准/护航趣味，各自价格结构，支持辅助图片）
```

- [ ] **Step 2: 更新设计文档**

在 `docs/design.md` 中：

1. Club 数据模型表格新增：
```
| orderPosters | text[] | 订单海报图片 URL 数组，默认空数组 |
```

2. ClubService 数据模型表格新增：
```
| images | text[] | 辅助图片 URL 数组，默认空数组 |
```

3. API 路由约定中新增：
```
POST   /admin/upload                            (通用文件上传)
```

- [ ] **Step 3: Commit**

```bash
git add docs/requirements.md docs/design.md
git commit -m "docs: sync requirements and design docs with order poster and image fields"
```
