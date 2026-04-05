# AI 智能录入实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在俱乐部详情页 Services Tab 中增加「智能录入」功能，支持通过图片/文本由 AI 批量解析并导入服务定价信息。

**Architecture:** 后端新增通用文件上传接口 + AI 解析接口 + 批量创建服务接口；前端新建 SmartImportModal 组件，分输入和确认两步完成流程。复用现有 AiParseService、StorageService 和 ClubServicesService。

**Tech Stack:** NestJS, Drizzle ORM, AI SDK (@ai-sdk/*), AWS S3, React, Radix UI Dialog, Tailwind CSS

---

## File Map

### 后端新建文件
- `apps/server/src/admin/upload/upload.controller.ts` — 通用文件上传接口
- `apps/server/src/admin/club-services/dto/ai-import.dto.ts` — AI 导入请求 DTO
- `apps/server/src/admin/club-services/dto/batch-create-club-service.dto.ts` — 批量创建 DTO

### 后端修改文件
- `apps/server/src/admin/club-services/club-services.controller.ts` — 新增 ai-import 和 batch 路由
- `apps/server/src/admin/club-services/club-services.service.ts` — 新增 aiImport() 和 batchCreate() 方法
- `apps/server/src/admin/admin.module.ts` — 注册 UploadController，注入 AiParseService 依赖
- `apps/server/src/ai-parse/ai-parse.module.ts` — 导出 AiParseService

### 前端新建文件
- `apps/admin/src/features/clubs/detail/components/smart-import-modal.tsx` — 智能录入 Modal 组件

### 前端修改文件
- `apps/admin/src/features/clubs/detail/components/services-tab.tsx` — 添加「智能录入」按钮
- `apps/admin/src/lib/api.ts` — 添加 uploadFile、aiImportServices、batchCreateClubServices 函数

---

### Task 1: 后端 — 通用文件上传接口

**Files:**
- Create: `apps/server/src/admin/upload/upload.controller.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 创建 UploadController**

```ts
// apps/server/src/admin/upload/upload.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { StorageService } from '../../storage/storage.service';

@Controller('admin/upload')
@UseGuards(AdminGuard)
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const ext = file.originalname.split('.').pop() || 'jpg';
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await this.storageService.upload(key, file.buffer, file.mimetype);
    return { key };
  }
}
```

- [ ] **Step 2: 在 AdminModule 中注册 UploadController**

在 `apps/server/src/admin/admin.module.ts` 中：

```ts
// 添加 import
import { UploadController } from './upload/upload.controller';

// 在 controllers 数组中添加
controllers: [
  // ...existing controllers...
  UploadController,
],
```

- [ ] **Step 3: 验证上传接口可用**

启动服务器，用 curl 测试：
```bash
curl -X POST http://localhost:3000/admin/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-image.jpg"
```

Expected: `{"key":"uploads/xxx.jpg"}`

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/admin/upload/upload.controller.ts apps/server/src/admin/admin.module.ts
git commit -m "feat: add generic file upload endpoint"
```

---

### Task 2: 后端 — AiParseModule 导出 AiParseService

**Files:**
- Modify: `apps/server/src/ai-parse/ai-parse.module.ts`
- Modify: `apps/server/src/admin/admin.module.ts`

- [ ] **Step 1: 在 AiParseModule 中导出 AiParseService**

```ts
// apps/server/src/ai-parse/ai-parse.module.ts
@Module({
  controllers: [ParseTaskController],
  providers: [AiParseService, ParseTaskService, SystemConfigsService, AiConfigsService],
  exports: [ParseTaskService, AiParseService],  // 添加 AiParseService
})
export class AiParseModule {}
```

- [ ] **Step 2: 在 AdminModule 中导入 AiParseModule**

```ts
// apps/server/src/admin/admin.module.ts
import { AiParseModule } from '../ai-parse/ai-parse.module';

@Module({
  imports: [
    // ...existing imports...
    AiParseModule,
  ],
  // ...rest...
})
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/ai-parse/ai-parse.module.ts apps/server/src/admin/admin.module.ts
git commit -m "feat: export AiParseService from AiParseModule for admin usage"
```

---

### Task 3: 后端 — AI 导入解析接口 + 批量创建接口

**Files:**
- Create: `apps/server/src/admin/club-services/dto/ai-import.dto.ts`
- Create: `apps/server/src/admin/club-services/dto/batch-create-club-service.dto.ts`
- Modify: `apps/server/src/admin/club-services/club-services.service.ts`
- Modify: `apps/server/src/admin/club-services/club-services.controller.ts`

- [ ] **Step 1: 创建 AI Import DTO**

```ts
// apps/server/src/admin/club-services/dto/ai-import.dto.ts
import { IsArray, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class AiImportDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageKeys?: string[];

  @IsOptional()
  @IsString()
  textContent?: string;
}
```

- [ ] **Step 2: 创建 BatchCreate DTO**

```ts
// apps/server/src/admin/club-services/dto/batch-create-club-service.dto.ts
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { CreateClubServiceDto } from './create-club-service.dto';

export class BatchCreateClubServiceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateClubServiceDto)
  services: CreateClubServiceDto[];
}
```

- [ ] **Step 3: 在 ClubServicesService 中添加 aiImport 和 batchCreate 方法**

在 `apps/server/src/admin/club-services/club-services.service.ts` 的 class 中添加：

```ts
// 添加 import
import { AiParseService } from '../../ai-parse/ai-parse.service';

// 修改 constructor，注入 AiParseService
constructor(
  @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  private readonly aiParseService: AiParseService,
) {}

// 添加方法
async aiImport(imageKeys: string[], textContent?: string) {
  const textContents = textContent ? [textContent] : [];
  return this.aiParseService.parseImages(imageKeys, textContents);
}

async batchCreate(clubId: string, dtos: CreateClubServiceDto[]) {
  const results = [];
  for (const dto of dtos) {
    const service = await this.create(clubId, dto);
    results.push(service);
  }
  return results;
}
```

- [ ] **Step 4: 在 ClubServicesController 中添加路由**

在 `apps/server/src/admin/club-services/club-services.controller.ts` 中添加两个路由。注意 `ai-import` 和 `batch` 路由必须放在 `:id` 参数路由之前：

```ts
// 添加 import
import { AiImportDto } from './dto/ai-import.dto';
import { BatchCreateClubServiceDto } from './dto/batch-create-club-service.dto';

// 在 create() 方法之前添加
@Post('ai-import')
aiImport(
  @Param('clubId') clubId: string,
  @Body() dto: AiImportDto,
) {
  return this.clubServicesService.aiImport(dto.imageKeys ?? [], dto.textContent);
}

@Post('batch')
batchCreate(
  @Param('clubId') clubId: string,
  @Body() dto: BatchCreateClubServiceDto,
) {
  return this.clubServicesService.batchCreate(clubId, dto.services);
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/admin/club-services/
git commit -m "feat: add AI import and batch create endpoints for club services"
```

---

### Task 4: 前端 — 添加 API 函数

**Files:**
- Modify: `apps/admin/src/lib/api.ts`

- [ ] **Step 1: 在 api.ts 中添加三个函数**

在 `// Club Services` 部分末尾（`deleteClubService` 之后）添加：

```ts
// Upload
export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<{ key: string }>('/upload', formData).then((res) => res.data)
}

// AI Smart Import
export const aiImportServices = (clubId: string, data: { imageKeys: string[]; textContent?: string }) =>
  api.post<{ clubName: string; services: Array<{ name: string; tiers: Array<{ price: number; guarantee: string; note?: string }> }>; rules: Array<{ content: string; category: string }> }>(`/clubs/${clubId}/services/ai-import`, data).then((res) => res.data)

// Batch create services
export const batchCreateClubServices = (clubId: string, services: Array<Record<string, unknown>>) =>
  api.post(`/clubs/${clubId}/services/batch`, { services }).then((res) => res.data)
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/lib/api.ts
git commit -m "feat: add upload, AI import, and batch create API functions"
```

---

### Task 5: 前端 — SmartImportModal 组件

**Files:**
- Create: `apps/admin/src/features/clubs/detail/components/smart-import-modal.tsx`

- [ ] **Step 1: 创建 SmartImportModal 组件**

```tsx
// apps/admin/src/features/clubs/detail/components/smart-import-modal.tsx
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ClubServiceDto } from '@delta-club/shared'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { X, Upload, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { uploadFile, aiImportServices, batchCreateClubServices } from '@/lib/api'
import { serviceTypeLabels } from '../../data/service-schema'

type ParsedService = {
  type: string
  gameName: string
  priceYuan: string
  hasGuarantee: boolean
  guaranteeHafuCoin: string
  rules: string
}

type SmartImportModalProps = {
  clubId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
  existingServices: ClubServiceDto[]
}

export function SmartImportModal({
  clubId,
  open,
  onOpenChange,
  onImported,
  existingServices,
}: SmartImportModalProps) {
  // Step: 'input' | 'result'
  const [step, setStep] = useState<'input' | 'result'>('input')
  const [images, setImages] = useState<{ file: File; preview: string; key?: string; uploading: boolean }[]>([])
  const [textContent, setTextContent] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsedServices, setParsedServices] = useState<ParsedService[]>([])
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('input')
    setImages([])
    setTextContent('')
    setParsing(false)
    setParsedServices([])
    setImporting(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const addFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const newImages = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }))

    setImages((prev) => [...prev, ...newImages])

    // Upload each file to S3
    for (let i = 0; i < imageFiles.length; i++) {
      try {
        const { key } = await uploadFile(imageFiles[i])
        setImages((prev) =>
          prev.map((img) =>
            img.file === imageFiles[i] ? { ...img, key, uploading: false } : img,
          ),
        )
      } catch {
        toast.error(`上传图片失败: ${imageFiles[i].name}`)
        setImages((prev) => prev.filter((img) => img.file !== imageFiles[i]))
      }
    }
  }, [])

  const removeImage = (index: number) => {
    setImages((prev) => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      addFiles(files)
    },
    [addFiles],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData.files)
      if (files.length > 0) {
        e.preventDefault()
        addFiles(files)
      }
    },
    [addFiles],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    addFiles(files)
    e.target.value = ''
  }

  const handleParse = async () => {
    const uploadedKeys = images.filter((img) => img.key).map((img) => img.key!)
    if (uploadedKeys.length === 0 && !textContent.trim()) {
      toast.error('请至少添加一张图片或输入文本')
      return
    }

    const stillUploading = images.some((img) => img.uploading)
    if (stillUploading) {
      toast.error('部分图片仍在上传中，请稍候')
      return
    }

    try {
      setParsing(true)
      const result = await aiImportServices(clubId, {
        imageKeys: uploadedKeys,
        textContent: textContent.trim() || undefined,
      })

      // Map AI result to ParsedService format
      const services: ParsedService[] = []
      for (const svc of result.services) {
        for (const tier of svc.tiers) {
          services.push({
            type: 'ESCORT_FUN',
            gameName: svc.name,
            priceYuan: tier.price.toString(),
            hasGuarantee: !!tier.guarantee,
            guaranteeHafuCoin: tier.guarantee?.replace(/[^0-9.]/g, '') ?? '',
            rules: tier.note ?? '',
          })
        }
      }

      setParsedServices(services)
      setStep('result')
    } catch {
      toast.error('AI 解析失败，请重试')
    } finally {
      setParsing(false)
    }
  }

  const updateParsedService = (index: number, field: keyof ParsedService, value: string | boolean) => {
    setParsedServices((prev) =>
      prev.map((svc, i) => (i === index ? { ...svc, [field]: value } : svc)),
    )
  }

  const removeParsedService = (index: number) => {
    setParsedServices((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImport = async () => {
    if (parsedServices.length === 0) {
      toast.error('没有可导入的服务')
      return
    }

    try {
      setImporting(true)
      await batchCreateClubServices(
        clubId,
        parsedServices.map((svc, i) => ({
          type: svc.type,
          gameName: svc.gameName,
          priceYuan: svc.priceYuan ? parseFloat(svc.priceYuan) : undefined,
          hasGuarantee: svc.hasGuarantee,
          guaranteeHafuCoin: svc.guaranteeHafuCoin ? parseFloat(svc.guaranteeHafuCoin) : undefined,
          rules: svc.rules || undefined,
          sortOrder: i,
        })),
      )
      toast.success(`成功导入 ${parsedServices.length} 条服务`)
      handleOpenChange(false)
      onImported()
    } catch {
      toast.error('批量导入失败')
    } finally {
      setImporting(false)
    }
  }

  const isDuplicate = (svc: ParsedService) =>
    existingServices.some(
      (existing) => existing.type === svc.type && existing.gameName === svc.gameName,
    )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className='sm:max-w-2xl max-h-[80vh] overflow-y-auto'
        onPaste={handlePaste}
      >
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Sparkles className='h-5 w-5' />
            智能录入
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? '添加俱乐部价目表图片或文本，AI 将自动解析服务信息。'
              : '确认解析结果，可编辑后批量导入。'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className='space-y-4'>
            {/* Drop zone */}
            <div
              className='border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors'
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className='h-8 w-8 mx-auto mb-2 text-muted-foreground' />
              <p className='text-sm text-muted-foreground'>
                拖拽图片到此处、从剪切板粘贴、或点击选择文件
              </p>
              <p className='text-xs text-muted-foreground mt-1'>支持多张图片</p>
              <input
                ref={fileInputRef}
                type='file'
                multiple
                accept='image/*'
                className='hidden'
                onChange={handleFileSelect}
              />
            </div>

            {/* Image previews */}
            {images.length > 0 && (
              <div className='grid grid-cols-4 gap-2'>
                {images.map((img, i) => (
                  <div key={i} className='relative group'>
                    <img
                      src={img.preview}
                      alt={`预览 ${i + 1}`}
                      className='w-full h-24 object-cover rounded border'
                    />
                    {img.uploading && (
                      <div className='absolute inset-0 bg-black/50 rounded flex items-center justify-center'>
                        <Loader2 className='h-4 w-4 animate-spin text-white' />
                      </div>
                    )}
                    <button
                      type='button'
                      className='absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity'
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(i)
                      }}
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Text input */}
            <Textarea
              placeholder='可选：粘贴文本内容...'
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={3}
            />

            {/* Parse button */}
            <div className='flex justify-end'>
              <Button
                onClick={handleParse}
                disabled={parsing || (images.length === 0 && !textContent.trim())}
              >
                {parsing ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    解析中...
                  </>
                ) : (
                  '开始解析'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className='space-y-4'>
            {parsedServices.length === 0 ? (
              <p className='text-muted-foreground py-8 text-center'>未解析出任何服务信息</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>玩法名称</TableHead>
                    <TableHead>价格(元)</TableHead>
                    <TableHead>保底</TableHead>
                    <TableHead>备注</TableHead>
                    <TableHead className='w-12'></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedServices.map((svc, i) => (
                    <TableRow
                      key={i}
                      className={isDuplicate(svc) ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                    >
                      <TableCell>
                        <Input
                          value={svc.gameName}
                          onChange={(e) => updateParsedService(i, 'gameName', e.target.value)}
                          className='h-8'
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={svc.priceYuan}
                          onChange={(e) => updateParsedService(i, 'priceYuan', e.target.value)}
                          className='h-8 w-20'
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={svc.guaranteeHafuCoin}
                          onChange={(e) =>
                            updateParsedService(i, 'guaranteeHafuCoin', e.target.value)
                          }
                          className='h-8 w-24'
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={svc.rules}
                          onChange={(e) => updateParsedService(i, 'rules', e.target.value)}
                          className='h-8'
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => removeParsedService(i)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {parsedServices.some(isDuplicate) && (
              <p className='text-xs text-yellow-600'>
                黄色标记的服务与现有服务类型和名称重复
              </p>
            )}

            <div className='flex justify-between'>
              <Button variant='outline' onClick={() => setStep('input')}>
                返回修改
              </Button>
              <Button onClick={handleImport} disabled={importing || parsedServices.length === 0}>
                {importing ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    导入中...
                  </>
                ) : (
                  `确认导入 (${parsedServices.length})`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/features/clubs/detail/components/smart-import-modal.tsx
git commit -m "feat: add SmartImportModal component for AI-powered service import"
```

---

### Task 6: 前端 — 在 ServicesTab 中集成智能录入按钮

**Files:**
- Modify: `apps/admin/src/features/clubs/detail/components/services-tab.tsx`

- [ ] **Step 1: 添加智能录入按钮和 Modal**

在 `services-tab.tsx` 中进行以下修改：

1. 添加 import：
```ts
import { Sparkles } from 'lucide-react'
import { SmartImportModal } from './smart-import-modal'
```

2. 在 `ServicesTab` 组件内添加状态：
```ts
const [smartImportOpen, setSmartImportOpen] = useState(false)
```

3. 在按钮区域（`<div className='flex justify-end'>`）中，在「添加服务」按钮前添加：
```tsx
<Button variant='outline' onClick={() => setSmartImportOpen(true)}>
  <Sparkles className='h-4 w-4 mr-2' />
  智能录入
</Button>
```

4. 在组件返回值末尾（最后一个 `AlertDialog` 之后）添加：
```tsx
<SmartImportModal
  clubId={clubId}
  open={smartImportOpen}
  onOpenChange={setSmartImportOpen}
  onImported={fetchServices}
  existingServices={services}
/>
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/features/clubs/detail/components/services-tab.tsx
git commit -m "feat: integrate smart import button in services tab"
```

---

### Task 7: 联调验证

- [ ] **Step 1: 启动前后端服务**

```bash
cd apps/server && pnpm dev &
cd apps/admin && pnpm dev &
```

- [ ] **Step 2: 验证完整流程**

1. 打开任意俱乐部详情页 → Services Tab
2. 点击「智能录入」按钮，确认 Modal 弹出
3. 拖拽/粘贴一张俱乐部价目表图片
4. 确认图片上传成功（缩略图无 loading 状态）
5. 点击「开始解析」，等待 AI 返回结果
6. 确认解析结果表格展示正确
7. 编辑/删除某条记录
8. 点击「确认导入」
9. 确认 Modal 关闭，服务列表已刷新并包含新导入的服务

- [ ] **Step 3: Commit**

如果联调过程中有修复，提交修复：
```bash
git add -A
git commit -m "fix: adjustments from smart import integration testing"
```
