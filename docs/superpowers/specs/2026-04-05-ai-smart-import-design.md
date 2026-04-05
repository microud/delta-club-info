# AI 智能录入 — 俱乐部服务批量导入

## 概述

在俱乐部详情页的 Services Tab 中增加「智能录入」入口，支持通过上传图片或粘贴文本，由 AI 解析出服务定价信息，用户确认后批量创建 club_services 记录。

## 用户流程

1. 进入俱乐部详情页 → Services Tab
2. 点击右上角「智能录入」按钮
3. 弹出 Modal，进入**输入阶段**：
   - 拖拽图片到上传区域 / 从剪切板粘贴图片 / 点击选择文件（支持多张）
   - 可选：在文本框中粘贴大段文本
   - 已添加的图片以缩略图列表展示，可逐个删除
   - 点击「开始解析」
4. 进入**解析结果阶段**：
   - 显示 loading 状态
   - 展示 AI 解析出的服务列表（表格形式）
   - 每行显示：服务类型、价格、保底信息等
   - 支持逐行编辑、删除
   - 如果与俱乐部现有服务有类型重复，显示警告标记
   - 点击「确认导入」
5. 批量创建服务，关闭 Modal，Services 列表自动刷新

## 技术方案

### 后端

#### 新增接口：`POST /admin/clubs/:clubId/services/ai-import`

**请求体：**
```json
{
  "imageKeys": ["uploads/xxx.jpg", "uploads/yyy.png"],
  "textContent": "可选的文本内容"
}
```

**处理流程：**
1. 接收图片 S3 keys 和可选文本
2. 调用现有 `AiParseService.parseImages()` 进行 AI 解析
3. 将解析结果中的 services 映射为 `ClubServiceDto` 格式返回

**响应体：**
```json
{
  "clubName": "卡丁车电竞工作室",
  "services": [
    {
      "type": "ESCORT_FUN",
      "gameName": "绝密趣味单",
      "priceYuan": "128",
      "hasGuarantee": true,
      "guaranteeHafuCoin": "788",
      "rules": "仅限一次"
    }
  ],
  "rules": [
    {
      "content": "体验单不包全卡...",
      "category": "体验须知"
    }
  ]
}
```

> 注意：返回原始解析结果，不做入库，由前端展示给用户确认后再调用现有的批量创建接口。

#### 新增接口：`POST /admin/clubs/:clubId/services/batch`

**请求体：**
```json
{
  "services": [
    {
      "type": "ESCORT_FUN",
      "gameName": "绝密趣味单",
      "priceYuan": "128",
      "hasGuarantee": true,
      "guaranteeHafuCoin": "788",
      "rules": "仅限一次",
      "sortOrder": 0
    }
  ]
}
```

复用现有 `ClubServicesService` 的创建逻辑，循环创建多条记录。

#### 图片上传接口

复用现有的 `StorageService`。新增一个通用上传接口 `POST /admin/upload`，接收 multipart/form-data，将文件上传到 S3 并返回 key。

### 前端

#### 新组件：`SmartImportModal`

位置：`apps/admin/src/features/clubs/detail/components/smart-import-modal.tsx`

**Props：**
```ts
{
  clubId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void  // 导入成功后的回调，用于刷新服务列表
  existingServices: ClubServiceDto[]  // 现有服务，用于重复检测
}
```

**两步式 UI：**

**Step 1 — 输入阶段：**
- 图片上传区域：
  - 虚线边框的 drop zone，支持 `onDrop` + `onPaste` + `<input type="file" multiple accept="image/*">`
  - 粘贴监听挂在 Modal 级别（`onPaste` 事件）
  - 已选图片以缩略图网格展示，每张有删除按钮
  - 图片选择后立即上传到 S3（异步），显示上传进度
- 文本输入区域：一个 `<Textarea>` 用于粘贴文本
- 底部「开始解析」按钮，至少有一张图片或文本时可点击

**Step 2 — 解析结果阶段：**
- 解析中显示 loading spinner
- 解析完成后展示可编辑的服务列表表格
- 表头：服务类型 | 玩法名称 | 价格(元) | 保底 | 备注 | 操作
- 每行可点击编辑、删除
- 与 existingServices 类型重复的行标黄色警告
- 底部「确认导入」和「返回修改」按钮

#### 修改：`ServicesTab`

在现有的「添加服务」按钮旁增加「智能录入」按钮，控制 `SmartImportModal` 的开关。

#### 新增 API 函数

在 `apps/admin/src/lib/api.ts` 中添加：

```ts
// Upload file
export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<{ key: string }>('/upload', formData).then(res => res.data)
}

// AI Smart Import
export const aiImportServices = (clubId: string, data: { imageKeys: string[]; textContent?: string }) =>
  api.post(`/clubs/${clubId}/services/ai-import`, data).then(res => res.data)

// Batch create services
export const batchCreateClubServices = (clubId: string, services: Partial<ClubServiceDto>[]) =>
  api.post<ClubServiceDto[]>(`/clubs/${clubId}/services/batch`, { services }).then(res => res.data)
```

### 后端模块变更

| 文件 | 变更 |
|------|------|
| `apps/server/src/admin/clubs/clubs.controller.ts` | 新增 `ai-import` 和 `batch` 路由 |
| `apps/server/src/admin/clubs/clubs.service.ts` | 新增 `aiImportServices()` 和 `batchCreateServices()` 方法 |
| `apps/server/src/admin/upload/upload.controller.ts` | 新建，通用文件上传接口 |
| `apps/server/src/admin/upload/upload.module.ts` | 新建，注入 StorageService |

### 前端文件变更

| 文件 | 变更 |
|------|------|
| `apps/admin/src/features/clubs/detail/components/smart-import-modal.tsx` | 新建，智能录入 Modal |
| `apps/admin/src/features/clubs/detail/components/services-tab.tsx` | 添加「智能录入」按钮 |
| `apps/admin/src/lib/api.ts` | 添加 3 个 API 函数 |

## AI 解析 Schema 调整

现有 `parsedResultSchema` 已经能解析出 services 和 rules。对于智能录入场景，需要将解析出的 service tiers 映射为 `ClubServiceDto` 格式。映射逻辑在后端 `aiImportServices()` 方法中完成：

- `name` → 尝试映射到 `clubServiceTypeEnum`，无法映射时默认为 `ESCORT_FUN`
- `tiers[].price` → `priceYuan`
- `tiers[].guarantee` → 解析数值填入 `guaranteeHafuCoin`，设 `hasGuarantee: true`
- `tiers[].note` → `rules`
- `name` → `gameName`

## 不在本次范围

- Rules 的智能导入（可后续复用同一入口扩展）
- 图片 OCR 预处理（直接交给多模态 AI 模型处理）
- 解析历史记录（不创建 parse_task，这是轻量级即时解析）
