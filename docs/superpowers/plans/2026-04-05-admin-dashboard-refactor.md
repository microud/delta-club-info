# Admin Dashboard 重构实现计划：基于 shadcn-admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `apps/admin` 替换为基于 shadcn-admin 的实现，保留所有现有业务功能，采用 Light Slate + Blue Primary 配色。

**Architecture:** Fork shadcn-admin 作为新 admin app 骨架，移除 Clerk 认证和不需要的页面（Apps/Chats/Tasks/Users），保留布局系统、错误页、Command Palette。将现有 JWT 认证、API 层、业务页面（Clubs/Promotions）迁入新骨架，表单升级为 React Hook Form + Zod，数据表格升级为 TanStack Table。

**Tech Stack:** React 19, TanStack Router, TanStack Table, TanStack Query, Zustand, React Hook Form, Zod, shadcn/ui, TailwindCSS 4, Vite

**Spec:** `docs/superpowers/specs/2026-04-05-admin-dashboard-refactor-design.md`

---

## File Map

### 骨架（来自 shadcn-admin，保留）
- `src/routes/__root.tsx` — Root layout
- `src/routes/_authenticated/route.tsx` — 认证布局（改为 JWT）
- `src/routes/(auth)/sign-in/route.tsx` — 登录页（改为 JWT）
- `src/routes/(errors)/` — 错误页（401/403/404/500/503，保留原样）
- `src/components/layout/` — 侧边栏、Header、Navigation（保留原样）
- `src/components/ui/` — 所有 shadcn 组件（保留原样）
- `src/context/` — Theme、Search 等 Context（保留原样）

### 需清理
- `src/features/apps/` — 删除
- `src/features/chats/` — 删除
- `src/features/tasks/` — 删除（保留 data-table 工具代码参考后删除）
- `src/features/users/` — 删除
- `src/routes/clerk/` — 删除
- `src/routes/_authenticated/apps/` — 删除
- `src/routes/_authenticated/chats/` — 删除
- `src/routes/_authenticated/tasks/` — 删除
- `src/routes/_authenticated/users/` — 删除
- `src/routes/_authenticated/help-center/` — 删除
- `src/features/settings/account/` — 删除
- `src/features/settings/display/` — 删除
- `src/features/settings/notifications/` — 删除
- `src/features/settings/profile/` — 删除

### 需创建/修改
- `src/features/clubs/` — 俱乐部管理 feature
- `src/features/promotions/` — 推广管理 feature
- `src/features/auth/` — 改写为 JWT 认证
- `src/stores/auth-store.ts` — JWT auth store（替换 Clerk）
- `src/lib/api.ts` — 迁移 API 层
- `src/components/layout/data/sidebar-data.ts` — 更新导航配置
- `src/routes/_authenticated/clubs/` — 俱乐部路由
- `src/routes/_authenticated/promotions/` — 推广路由
- `src/styles/globals.css` — 调整配色

---

## Task 1: 备份当前 admin 并克隆 shadcn-admin

**Files:**
- Backup: `apps/admin/` → `apps/admin-old/`
- Create: `apps/admin/` (from shadcn-admin clone)

- [ ] **Step 1: 备份当前 admin app**

```bash
cd /Users/microud/Projects/delta-club-info
mv apps/admin apps/admin-old
```

- [ ] **Step 2: 克隆 shadcn-admin 到 apps/admin**

```bash
cd /Users/microud/Projects/delta-club-info
git clone --depth 1 https://github.com/satnaing/shadcn-admin.git apps/admin
rm -rf apps/admin/.git
```

- [ ] **Step 3: 验证克隆成功**

```bash
ls apps/admin/src/routes/
ls apps/admin/src/features/
ls apps/admin/src/components/
```

Expected: 看到 routes、features、components 目录结构完整。

- [ ] **Step 4: Commit**

```bash
git add apps/admin-old apps/admin
git commit -m "chore: backup old admin and clone shadcn-admin as new base"
```

---

## Task 2: Monorepo 集成

**Files:**
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/vite.config.ts`
- Modify: `apps/admin/tsconfig.json` (if needed)

- [ ] **Step 1: 更新 package.json — 包名和 workspace 依赖**

将 `apps/admin/package.json` 中的 `name` 改为 `@delta-club/admin`，添加 `@delta-club/shared` workspace 依赖，确保 `private: true`。

修改 `apps/admin/package.json`:
- `name`: `"@delta-club/admin"`
- `private`: `true`
- 在 `dependencies` 中添加: `"@delta-club/shared": "workspace:*"`
- 移除 `@clerk/clerk-react` 及所有 Clerk 相关依赖
- 确保 `axios` 在 dependencies 中（如果没有则添加 `"axios": "^1.14.0"`）

- [ ] **Step 2: 更新 vite.config.ts — 添加代理和路径别名**

确保 `apps/admin/vite.config.ts` 包含：
- dev server proxy: `/admin` → `http://localhost:3000`
- 路径别名 `@` → `./src`（shadcn-admin 通常已有此配置）
- 端口保持 5173

在 vite.config.ts 的 server 配置中添加 proxy：

```typescript
server: {
  proxy: {
    '/admin': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

- [ ] **Step 3: 安装依赖**

```bash
cd /Users/microud/Projects/delta-club-info
pnpm install
```

Expected: 安装成功，无 workspace 依赖冲突。

- [ ] **Step 4: 验证 dev server 启动**

```bash
cd /Users/microud/Projects/delta-club-info
pnpm dev:admin
```

Expected: Vite 启动成功，浏览器可以访问 shadcn-admin 默认页面（可能报 Clerk 相关错误，这是预期的，将在后续 task 修复）。

- [ ] **Step 5: Commit**

```bash
git add apps/admin/package.json apps/admin/vite.config.ts pnpm-lock.yaml
git commit -m "chore: integrate shadcn-admin into monorepo with workspace deps"
```

---

## Task 3: 移除 Clerk 认证和不需要的页面

**Files:**
- Delete: `src/routes/clerk/` (整个目录)
- Delete: `src/routes/_authenticated/apps/` (整个目录)
- Delete: `src/routes/_authenticated/chats/` (整个目录)
- Delete: `src/routes/_authenticated/tasks/` (整个目录)
- Delete: `src/routes/_authenticated/users/` (整个目录)
- Delete: `src/routes/_authenticated/help-center/` (整个目录)
- Delete: `src/features/apps/` (整个目录)
- Delete: `src/features/chats/` (整个目录)
- Delete: `src/features/users/` (整个目录)
- Delete: `src/routes/_authenticated/settings/account/` (整个目录)
- Delete: `src/routes/_authenticated/settings/display/` (整个目录)
- Delete: `src/routes/_authenticated/settings/notifications/` (整个目录)
- Delete: `src/routes/_authenticated/settings/profile/` (整个目录)
- Delete: `src/features/settings/account/` (整个目录)
- Delete: `src/features/settings/display/` (整个目录)
- Delete: `src/features/settings/notifications/` (整个目录)
- Delete: `src/features/settings/profile/` (整个目录)
- Modify: settings 路由和 sidebar-nav，移除已删除页面的链接

注意：`src/features/tasks/` 暂时保留作为 TanStack Table 模式参考，在 Task 7 完成后删除。

- [ ] **Step 1: 删除 Clerk 路由和不需要的路由**

```bash
cd /Users/microud/Projects/delta-club-info/apps/admin
rm -rf src/routes/clerk
rm -rf src/routes/_authenticated/apps
rm -rf src/routes/_authenticated/chats
rm -rf src/routes/_authenticated/tasks
rm -rf src/routes/_authenticated/users
rm -rf src/routes/_authenticated/help-center
rm -rf src/routes/_authenticated/settings/account
rm -rf src/routes/_authenticated/settings/display
rm -rf src/routes/_authenticated/settings/notifications
rm -rf src/routes/_authenticated/settings/profile
```

- [ ] **Step 2: 删除对应的 features**

```bash
cd /Users/microud/Projects/delta-club-info/apps/admin
rm -rf src/features/apps
rm -rf src/features/chats
rm -rf src/features/users
rm -rf src/features/settings/account
rm -rf src/features/settings/display
rm -rf src/features/settings/notifications
rm -rf src/features/settings/profile
```

- [ ] **Step 3: 更新 settings 路由**

修改 `src/routes/_authenticated/settings/route.tsx`，只保留 appearance 相关的 sidebar 导航项。移除对 account、display、notifications、profile 页面的引用。

修改 settings 的 sidebar-nav 数据，只保留：
```typescript
{ title: '外观', href: '/settings/appearance', icon: /* Palette or similar */ }
```

- [ ] **Step 4: 全局搜索并清理 Clerk 引用**

在整个 `apps/admin/src/` 中搜索 `clerk`、`@clerk`、`Clerk`，移除所有引用。关键位置：
- `src/stores/` 中的 auth store（将在 Task 4 重写）
- `src/routes/_authenticated/route.tsx`（将在 Task 4 重写）
- `src/routes/__root.tsx`（移除 ClerkProvider 包裹）
- 任何 import 中包含 clerk 的文件

暂时将移除的 auth 检查替换为 `// TODO: JWT auth`，让 app 能编译通过。

- [ ] **Step 5: 验证编译通过**

```bash
cd /Users/microud/Projects/delta-club-info/apps/admin
pnpm build
```

Expected: 编译通过，无 Clerk 引用错误。可能有一些未使用的 import 警告，可忽略。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Clerk auth and unused pages (apps/chats/tasks/users)"
```

---

## Task 4: 实现 JWT 认证

**Files:**
- Create: `src/stores/auth-store.ts`
- Create: `src/lib/api.ts`
- Modify: `src/features/auth/` (改写 sign-in 表单)
- Modify: `src/routes/(auth)/sign-in/route.tsx`
- Modify: `src/routes/_authenticated/route.tsx`
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: 创建 API 客户端**

创建 `src/lib/api.ts`（从 `apps/admin-old/src/lib/api.ts` 迁移）：

```typescript
import axios from 'axios'
import type {
  LoginRequest,
  LoginResponse,
  ClubDto,
  ClubServiceDto,
  ClubRuleDto,
  PromotionOrderDto,
  PaginatedResponse,
} from '@delta-club/shared'

const api = axios.create({
  baseURL: '/admin',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/sign-in'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (data: LoginRequest) =>
  api.post<LoginResponse>('/auth/login', data).then((res) => res.data)

export const getMe = () =>
  api.get<{ id: string; username: string; role: string }>('/auth/me').then((res) => res.data)

// Clubs
export const getClubs = (params: { page?: number; pageSize?: number; search?: string }) =>
  api.get<PaginatedResponse<ClubDto>>('/clubs', { params }).then((res) => res.data)

export const getClub = (id: string) =>
  api.get<ClubDto>(`/clubs/${id}`).then((res) => res.data)

export const createClub = (data: Partial<ClubDto>) =>
  api.post<ClubDto>('/clubs', data).then((res) => res.data)

export const updateClub = (id: string, data: Partial<ClubDto>) =>
  api.put<ClubDto>(`/clubs/${id}`, data).then((res) => res.data)

export const deleteClub = (id: string) =>
  api.delete(`/clubs/${id}`)

// Club Services
export const getClubServices = (clubId: string) =>
  api.get<ClubServiceDto[]>(`/clubs/${clubId}/services`).then((res) => res.data)

export const createClubService = (clubId: string, data: Partial<ClubServiceDto>) =>
  api.post<ClubServiceDto>(`/clubs/${clubId}/services`, data).then((res) => res.data)

export const updateClubService = (clubId: string, id: string, data: Partial<ClubServiceDto>) =>
  api.put<ClubServiceDto>(`/clubs/${clubId}/services/${id}`, data).then((res) => res.data)

export const deleteClubService = (clubId: string, id: string) =>
  api.delete(`/clubs/${clubId}/services/${id}`)

// Club Rules
export const getClubRules = (clubId: string) =>
  api.get<ClubRuleDto[]>(`/clubs/${clubId}/rules`).then((res) => res.data)

export const createClubRule = (clubId: string, data: { content: string; sentiment?: string }) =>
  api.post<ClubRuleDto>(`/clubs/${clubId}/rules`, data).then((res) => res.data)

export const updateClubRule = (clubId: string, id: string, data: { content?: string; sentiment?: string }) =>
  api.put<ClubRuleDto>(`/clubs/${clubId}/rules/${id}`, data).then((res) => res.data)

export const deleteClubRule = (clubId: string, id: string) =>
  api.delete(`/clubs/${clubId}/rules/${id}`)

// Promotions
export const getPromotions = () =>
  api.get<PromotionOrderDto[]>('/promotions').then((res) => res.data)

export const createPromotion = (data: { clubId: string; fee: number; startAt: string; endAt: string }) =>
  api.post<PromotionOrderDto>('/promotions', data).then((res) => res.data)

export const deletePromotion = (id: string) =>
  api.delete(`/promotions/${id}`)

export const getPromotionRanking = () =>
  api.get<{ clubId: string; clubName: string; totalDailyRate: string }[]>('/promotions/ranking').then((res) => res.data)

export default api
```

- [ ] **Step 2: 创建 auth store**

创建 `src/stores/auth-store.ts`（用 Zustand 替代旧的 useAuth hook）：

```typescript
import { create } from 'zustand'
import { getMe } from '@/lib/api'

interface AdminUser {
  id: string
  username: string
  role: string
}

interface AuthState {
  admin: AdminUser | null
  loading: boolean
  token: string | null
  setToken: (token: string) => void
  checkAuth: () => Promise<void>
  logout: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  loading: true,
  token: localStorage.getItem('token'),

  setToken: (token: string) => {
    localStorage.setItem('token', token)
    set({ token })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ admin: null, loading: false, token: null })
      return
    }
    try {
      const admin = await getMe()
      set({ admin, loading: false })
    } catch {
      localStorage.removeItem('token')
      set({ admin: null, loading: false, token: null })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ admin: null, token: null })
  },

  reset: () => {
    set({ admin: null, loading: true, token: null })
  },
}))
```

- [ ] **Step 3: 改写 sign-in 页面**

修改 `src/features/auth/` 下的 sign-in 组件，使用 JWT 登录：

核心表单逻辑：
```typescript
import { useNavigate } from '@tanstack/react-router'
import { login } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

// 在 sign-in 表单的 onSubmit 中:
const navigate = useNavigate()
const { setToken, checkAuth } = useAuthStore()

const onSubmit = async (data: { username: string; password: string }) => {
  const res = await login(data)
  setToken(res.accessToken)
  await checkAuth()
  navigate({ to: '/' })
}
```

保留 shadcn-admin 的 sign-in 页面布局和样式，只替换表单字段（username + password 替代 email + password）和提交逻辑。移除所有 OAuth/social login 按钮。

- [ ] **Step 4: 修改认证路由守卫**

修改 `src/routes/_authenticated/route.tsx`，使用 JWT auth store：

```typescript
import { Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export default function AuthenticatedRoute() {
  const { admin, loading, checkAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!loading && !admin) {
      navigate({ to: '/sign-in' })
    }
  }, [loading, admin, navigate])

  if (loading) {
    return <div>Loading...</div> // 可使用 shadcn-admin 的 loading 组件
  }

  if (!admin) {
    return null
  }

  return <Outlet />
}
```

注意：实际代码需要适配 shadcn-admin 的 `_authenticated/route.tsx` 已有的布局结构（sidebar + header 包裹），只替换 auth 检查逻辑部分。

- [ ] **Step 5: 清理 __root.tsx**

修改 `src/routes/__root.tsx`，移除 ClerkProvider，保留 ThemeProvider 和其他 context providers。

- [ ] **Step 6: 验证登录流程**

```bash
cd /Users/microud/Projects/delta-club-info
pnpm dev
```

Expected:
1. 访问 `http://localhost:5173/` 重定向到 `/sign-in`
2. 输入用户名密码，成功登录后跳转到 dashboard
3. 刷新页面保持登录状态

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement JWT authentication replacing Clerk"
```

---

## Task 5: 调整配色方案

**Files:**
- Modify: `src/styles/globals.css`（或 `src/index.css`，取决于 shadcn-admin 的 CSS 入口）

- [ ] **Step 1: 找到 CSS 变量定义文件**

在 shadcn-admin 中查找 CSS 变量定义位置，通常在 `src/styles/globals.css` 或 `src/index.css`。

- [ ] **Step 2: 更新 Light 模式 CSS 变量**

将 primary 色系改为 Blue 600，sidebar 背景改为白色。关键变量（使用 HSL 或 OKLch 取决于 shadcn-admin 的色彩空间）：

如果是 HSL 格式：
```css
:root {
  --primary: 217.2 91.2% 59.8%;        /* #2563eb - Blue 600 */
  --primary-foreground: 0 0% 100%;      /* white */
  --sidebar-background: 0 0% 100%;      /* white */
  --sidebar-foreground: 222.2 47.4% 11.2%;  /* Slate 900 */
  --sidebar-border: 214.3 31.8% 91.4%;     /* Slate 200 */
  --sidebar-accent: 210 40% 96.1%;         /* Slate 100 */
  --sidebar-accent-foreground: 222.2 47.4% 11.2%; /* Slate 900 */
  --sidebar-primary: 217.2 91.2% 59.8%;   /* Blue 600 */
  --sidebar-primary-foreground: 0 0% 100%; /* white */
}
```

如果是 OKLch 格式（参考现有 admin 的 index.css），需要将 Blue 600 转换为对应的 OKLch 值。

- [ ] **Step 3: 更新 Dark 模式 CSS 变量**

```css
.dark {
  --primary: 217.2 91.2% 59.8%;        /* Blue 600 保持不变 */
  --primary-foreground: 0 0% 100%;
  /* 其他 dark mode 变量保持 shadcn-admin 默认 */
}
```

- [ ] **Step 4: 验证配色效果**

启动 dev server，检查：
- 侧边栏是白色背景
- Primary 按钮是蓝色
- 暗色模式切换正常
- Badge、Link 等 primary 色元素都是蓝色

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style: apply Light Slate + Blue Primary color scheme"
```

---

## Task 6: 更新侧边栏导航

**Files:**
- Modify: `src/components/layout/data/sidebar-data.ts`

- [ ] **Step 1: 更新导航配置**

修改 `src/components/layout/data/sidebar-data.ts`：

```typescript
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Palette,
} from 'lucide-react'

// 用户信息将从 auth store 动态获取，这里只定义导航结构
export const sidebarData = {
  navGroups: [
    {
      title: '管理',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: '俱乐部管理',
          url: '/clubs',
          icon: Building2,
        },
        {
          title: '推广管理',
          url: '/promotions',
          icon: Megaphone,
        },
      ],
    },
    {
      title: '设置',
      items: [
        {
          title: '外观',
          url: '/settings/appearance',
          icon: Palette,
        },
      ],
    },
  ],
}
```

注意：需要适配 shadcn-admin sidebar-data 的实际 TypeScript 类型。检查现有的类型定义，确保 `title`、`url`、`icon` 字段名匹配。shadcn-admin 可能使用 `href` 而非 `url`。

- [ ] **Step 2: 更新 sidebar 用户信息**

找到 sidebar 中显示用户信息的组件（通常在底部），将 Clerk 的 user profile 替换为从 `useAuthStore` 读取的 admin 信息：

```typescript
import { useAuthStore } from '@/stores/auth-store'

const { admin, logout } = useAuthStore()

// 显示: admin.username
// 头像: 使用首字母
// 退出按钮: 调用 logout() 并导航到 /sign-in
```

- [ ] **Step 3: 移除 team switcher**

shadcn-admin 顶部有 team switcher 功能，不需要此功能。在 sidebar 配置中移除 teams 数据，或在组件中将 team switcher 替换为 app logo/brand。

显示为：
```
🎮 Delta Club
```

- [ ] **Step 4: 验证导航**

启动 dev server，检查：
- 侧边栏显示正确的导航项
- 点击导航项可以切换路由（即使页面还是空的）
- 用户信息和退出功能正常
- 侧边栏折叠/展开正常

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: configure sidebar navigation for Delta Club admin"
```

---

## Task 7: 实现俱乐部列表页

**Files:**
- Create: `src/features/clubs/index.tsx` — 列表页主组件
- Create: `src/features/clubs/components/clubs-columns.tsx` — TanStack Table 列定义
- Create: `src/features/clubs/components/clubs-table.tsx` — 数据表格组件
- Create: `src/features/clubs/components/clubs-action-dialog.tsx` — 创建/编辑对话框
- Create: `src/features/clubs/components/clubs-delete-dialog.tsx` — 删除确认对话框
- Create: `src/features/clubs/components/club-form.tsx` — 表单（React Hook Form + Zod）
- Create: `src/features/clubs/data/schema.ts` — Zod schema
- Create: `src/routes/_authenticated/clubs/route.tsx` — 路由文件

- [ ] **Step 1: 创建 Zod schema**

创建 `src/features/clubs/data/schema.ts`：

```typescript
import { z } from 'zod'

export const clubSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
  description: z.string().nullable(),
  wechatOfficialAccount: z.string().nullable(),
  wechatMiniProgram: z.string().nullable(),
  contactInfo: z.string().nullable(),
  status: z.enum(['draft', 'published', 'closed', 'archived']),
  establishedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  predecessorId: z.string().nullable(),
  closureNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Club = z.infer<typeof clubSchema>

export const clubFormSchema = z.object({
  name: z.string().min(1, '俱乐部名称不能为空'),
  logo: z.string().optional(),
  description: z.string().optional(),
  wechatOfficialAccount: z.string().optional(),
  wechatMiniProgram: z.string().optional(),
  contactInfo: z.string().optional(),
  establishedAt: z.string().optional(),
})

export type ClubFormValues = z.infer<typeof clubFormSchema>

export const clubStatusLabels: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  closed: '已倒闭',
  archived: '已归档',
}
```

- [ ] **Step 2: 创建列定义**

创建 `src/features/clubs/components/clubs-columns.tsx`，参考 shadcn-admin 的 `features/users/` 或 `features/tasks/` 中的 columns 写法：

```typescript
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Club, clubStatusLabels } from '../data/schema'

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'destructive',
  archived: 'outline',
}

export const columns: ColumnDef<Club>[] = [
  {
    accessorKey: 'name',
    header: '名称',
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue<string>('status')
      return (
        <Badge variant={statusVariantMap[status] ?? 'secondary'}>
          {clubStatusLabels[status] ?? status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'establishedAt',
    header: '成立时间',
    cell: ({ row }) => {
      const date = row.getValue<string | null>('establishedAt')
      return date ? new Date(date).toLocaleDateString() : '-'
    },
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => {
      const date = row.getValue<string>('createdAt')
      return new Date(date).toLocaleDateString()
    },
  },
]
```

- [ ] **Step 3: 创建表单组件**

创建 `src/features/clubs/components/club-form.tsx`：

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { clubFormSchema, type ClubFormValues } from '../data/schema'
import type { ClubDto } from '@delta-club/shared'

interface ClubFormProps {
  initialData?: Partial<ClubDto>
  onSubmit: (data: ClubFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function ClubForm({ initialData, onSubmit, isSubmitting }: ClubFormProps) {
  const form = useForm<ClubFormValues>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      logo: initialData?.logo ?? '',
      description: initialData?.description ?? '',
      wechatOfficialAccount: initialData?.wechatOfficialAccount ?? '',
      wechatMiniProgram: initialData?.wechatMiniProgram ?? '',
      contactInfo: initialData?.contactInfo ?? '',
      establishedAt: initialData?.establishedAt ?? '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名称</FormLabel>
              <FormControl>
                <Input placeholder="俱乐部名称" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>描述</FormLabel>
              <FormControl>
                <Textarea placeholder="俱乐部描述" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="wechatOfficialAccount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>微信公众号 ID</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="wechatMiniProgram"
          render={({ field }) => (
            <FormItem>
              <FormLabel>微信小程序 AppID</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>联系方式</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="establishedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>成立日期</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {initialData ? '更新' : '创建'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

- [ ] **Step 4: 创建数据表格和对话框**

创建 `src/features/clubs/components/clubs-table.tsx`，参考 shadcn-admin 的 data-table 组件模式。包括：
- 搜索输入框
- TanStack Table 实例
- 分页控件
- 行点击跳转到详情页

创建 `src/features/clubs/components/clubs-action-dialog.tsx`：创建/编辑俱乐部的 Dialog。

创建 `src/features/clubs/components/clubs-delete-dialog.tsx`：删除确认 Dialog。

这些组件应该参考 shadcn-admin 中 `features/users/` 的 Dialog 模式。

- [ ] **Step 5: 创建列表页主组件**

创建 `src/features/clubs/index.tsx`：

```typescript
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getClubs } from '@/lib/api'
import type { ClubDto, PaginatedResponse } from '@delta-club/shared'
import { ClubsTable } from './components/clubs-table'
import { columns } from './components/clubs-columns'

export default function ClubsPage() {
  const [data, setData] = useState<PaginatedResponse<ClubDto>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
  })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const result = await getClubs({ page, pageSize: 20, search })
    setData(result)
  }, [page, search])

  useEffect(() => {
    load()
  }, [load])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleRowClick = (club: ClubDto) => {
    navigate({ to: '/clubs/$id', params: { id: club.id } })
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">俱乐部管理</h2>
        {/* 创建按钮和对话框 */}
      </div>
      <ClubsTable
        columns={columns}
        data={data.data}
        total={data.total}
        page={page}
        pageSize={20}
        search={search}
        onSearchChange={handleSearchChange}
        onPageChange={setPage}
        onRowClick={handleRowClick}
        onReload={load}
      />
    </div>
  )
}
```

- [ ] **Step 6: 创建路由文件**

创建 `src/routes/_authenticated/clubs/route.tsx`：

```typescript
import { createFileRoute } from '@tanstack/react-router'
import ClubsPage from '@/features/clubs'

export const Route = createFileRoute('/_authenticated/clubs')({
  component: ClubsPage,
})
```

- [ ] **Step 7: 验证俱乐部列表页**

启动 dev server，访问 `/clubs`：
- 表格显示正确
- 搜索功能正常
- 分页功能正常
- 点击行跳转到详情页（虽然详情页还没实现）
- 创建/删除对话框正常

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: implement clubs list page with TanStack Table"
```

---

## Task 8: 实现俱乐部详情页

**Files:**
- Create: `src/features/clubs/detail/index.tsx` — 详情页主组件
- Create: `src/features/clubs/detail/components/services-tab.tsx` — 服务 tab
- Create: `src/features/clubs/detail/components/rules-tab.tsx` — 规则 tab
- Create: `src/features/clubs/detail/components/service-form.tsx` — 服务表单
- Create: `src/features/clubs/detail/components/rule-form.tsx` — 规则表单
- Create: `src/features/clubs/data/service-schema.ts` — 服务 Zod schema
- Create: `src/features/clubs/data/rule-schema.ts` — 规则 Zod schema
- Create: `src/routes/_authenticated/clubs/$id/route.tsx` — 路由文件

- [ ] **Step 1: 创建服务和规则的 Zod schema**

创建 `src/features/clubs/data/service-schema.ts`：

```typescript
import { z } from 'zod'
import { ClubServiceType } from '@delta-club/shared'

export const serviceFormSchema = z.object({
  type: z.nativeEnum(ClubServiceType),
  sortOrder: z.coerce.number().default(0),
  priceYuan: z.string().optional(),
  priceHafuCoin: z.string().optional(),
  tier: z.string().optional(),
  pricePerHour: z.string().optional(),
  gameName: z.string().optional(),
  hasGuarantee: z.boolean().optional(),
  guaranteeHafuCoin: z.string().optional(),
  rules: z.string().optional(),
})

export type ServiceFormValues = z.infer<typeof serviceFormSchema>

export const serviceTypeLabels: Record<string, string> = {
  KNIFE_RUN: '跑刀',
  ACCOMPANY: '陪玩',
  ESCORT_TRIAL: '护航体验单',
  ESCORT_STANDARD: '护航标准单',
  ESCORT_FUN: '护航趣味玩法',
}
```

创建 `src/features/clubs/data/rule-schema.ts`：

```typescript
import { z } from 'zod'
import { RuleSentiment } from '@delta-club/shared'

export const ruleFormSchema = z.object({
  content: z.string().min(1, '规则内容不能为空'),
  sentiment: z.nativeEnum(RuleSentiment).default(RuleSentiment.NEUTRAL),
})

export type RuleFormValues = z.infer<typeof ruleFormSchema>

export const sentimentLabels: Record<string, string> = {
  FAVORABLE: '有利',
  UNFAVORABLE: '不利',
  NEUTRAL: '中性',
}

export const sentimentColors: Record<string, string> = {
  FAVORABLE: 'text-green-600',
  UNFAVORABLE: 'text-red-600',
  NEUTRAL: 'text-gray-500',
}
```

- [ ] **Step 2: 创建服务表单**

创建 `src/features/clubs/detail/components/service-form.tsx`，使用 React Hook Form + Zod。表单根据 `type` 字段条件渲染不同的字段组：

- KNIFE_RUN / ESCORT_TRIAL / ESCORT_STANDARD → priceYuan + priceHafuCoin
- ACCOMPANY → tier + pricePerHour
- ESCORT_FUN → gameName + priceYuan + hasGuarantee + guaranteeHafuCoin (conditional) + rules

使用 `form.watch('type')` 来控制条件渲染。

- [ ] **Step 3: 创建规则表单**

创建 `src/features/clubs/detail/components/rule-form.tsx`，使用 React Hook Form + Zod。字段：content (textarea) + sentiment (select)。

- [ ] **Step 4: 创建服务 tab 和规则 tab**

创建 `src/features/clubs/detail/components/services-tab.tsx`：
- 表格显示所有服务（type label、价格摘要、sortOrder）
- 添加/编辑/删除服务的 Dialog
- 价格摘要逻辑与旧代码一致

创建 `src/features/clubs/detail/components/rules-tab.tsx`：
- 表格显示所有规则（content 截断、sentiment 颜色标记）
- 添加/编辑/删除规则的 Dialog

- [ ] **Step 5: 创建详情页主组件**

创建 `src/features/clubs/detail/index.tsx`：

```typescript
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getClub, updateClub } from '@/lib/api'
import type { ClubDto } from '@delta-club/shared'
import { ClubForm } from '../components/club-form'
import { ServicesTab } from './components/services-tab'
import { RulesTab } from './components/rules-tab'

export default function ClubDetailPage() {
  const { id } = useParams({ from: '/_authenticated/clubs/$id' })
  const navigate = useNavigate()
  const [club, setClub] = useState<ClubDto | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    const data = await getClub(id)
    setClub(data)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (!club) return null

  const handleUpdate = async (data: Partial<ClubDto>) => {
    await updateClub(club.id, data)
    setEditOpen(false)
    load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/clubs' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{club.name}</h2>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> 编辑信息
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑俱乐部</DialogTitle>
            </DialogHeader>
            <ClubForm initialData={club} onSubmit={handleUpdate} />
          </DialogContent>
        </Dialog>
      </div>
      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">服务</TabsTrigger>
          <TabsTrigger value="rules">规则</TabsTrigger>
        </TabsList>
        <TabsContent value="services">
          <ServicesTab clubId={club.id} />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab clubId={club.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 6: 创建路由文件**

创建 `src/routes/_authenticated/clubs/$id/route.tsx`：

```typescript
import { createFileRoute } from '@tanstack/react-router'
import ClubDetailPage from '@/features/clubs/detail'

export const Route = createFileRoute('/_authenticated/clubs/$id')({
  component: ClubDetailPage,
})
```

- [ ] **Step 7: 验证俱乐部详情页**

启动 dev server，从列表页点击进入详情页：
- 俱乐部信息正确显示
- 编辑对话框正常工作
- 服务 tab：CRUD 全部正常，条件字段正确显示
- 规则 tab：CRUD 全部正常，sentiment 颜色正确
- 返回按钮正常

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: implement club detail page with services and rules tabs"
```

---

## Task 9: 实现推广管理页

**Files:**
- Create: `src/features/promotions/index.tsx` — 列表页主组件
- Create: `src/features/promotions/components/promotions-columns.tsx` — 列定义
- Create: `src/features/promotions/components/promotions-table.tsx` — 数据表格
- Create: `src/features/promotions/components/promotion-form.tsx` — 表单
- Create: `src/features/promotions/components/ranking-widget.tsx` — 排名组件
- Create: `src/features/promotions/data/schema.ts` — Zod schema
- Create: `src/routes/_authenticated/promotions/route.tsx` — 路由文件

- [ ] **Step 1: 创建 Zod schema**

创建 `src/features/promotions/data/schema.ts`：

```typescript
import { z } from 'zod'

export const promotionSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string().optional(),
  fee: z.string(),
  dailyRate: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  isActive: z.boolean().optional(),
  createdAt: z.string(),
})

export type Promotion = z.infer<typeof promotionSchema>

export const promotionFormSchema = z.object({
  clubId: z.string().min(1, '请选择俱乐部'),
  fee: z.coerce.number().min(0, '金额不能为负'),
  startAt: z.string().min(1, '请选择开始日期'),
  endAt: z.string().min(1, '请选择结束日期'),
})

export type PromotionFormValues = z.infer<typeof promotionFormSchema>
```

- [ ] **Step 2: 创建列定义**

创建 `src/features/promotions/components/promotions-columns.tsx`：

```typescript
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Promotion } from '../data/schema'

export const columns: ColumnDef<Promotion>[] = [
  {
    accessorKey: 'clubName',
    header: '俱乐部',
  },
  {
    accessorKey: 'fee',
    header: '费用 (元)',
    cell: ({ row }) => `¥${Number(row.getValue('fee')).toFixed(2)}`,
  },
  {
    accessorKey: 'dailyRate',
    header: '日费率',
    cell: ({ row }) => `¥${Number(row.getValue('dailyRate')).toFixed(2)}`,
  },
  {
    accessorKey: 'startAt',
    header: '开始日期',
    cell: ({ row }) => new Date(row.getValue<string>('startAt')).toLocaleDateString(),
  },
  {
    accessorKey: 'endAt',
    header: '结束日期',
    cell: ({ row }) => new Date(row.getValue<string>('endAt')).toLocaleDateString(),
  },
  {
    id: 'status',
    header: '状态',
    cell: ({ row }) => {
      const now = new Date()
      const start = new Date(row.original.startAt)
      const end = new Date(row.original.endAt)
      const isActive = now >= start && now <= end
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? '生效中' : '未生效'}
        </Badge>
      )
    },
  },
]
```

- [ ] **Step 3: 创建排名组件**

创建 `src/features/promotions/components/ranking-widget.tsx`：

```typescript
import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPromotionRanking } from '@/lib/api'

interface RankingItem {
  clubId: string
  clubName: string
  totalDailyRate: string
}

export function RankingWidget() {
  const [ranking, setRanking] = useState<RankingItem[]>([])

  useEffect(() => {
    getPromotionRanking().then(setRanking).catch(() => {})
  }, [])

  if (ranking.length === 0) return null

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4" /> 推广排名
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ranking.map((item, index) => (
            <div key={item.clubId} className="flex items-center justify-between text-sm">
              <span>
                <span className="mr-2 font-medium">#{index + 1}</span>
                {item.clubName}
              </span>
              <span className="text-muted-foreground">¥{Number(item.totalDailyRate).toFixed(2)}/天</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: 创建推广表单**

创建 `src/features/promotions/components/promotion-form.tsx`，使用 React Hook Form + Zod。字段：clubId (select, 从 API 加载所有俱乐部)、fee、startAt、endAt。

```typescript
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getClubs } from '@/lib/api'
import type { ClubDto } from '@delta-club/shared'
import { promotionFormSchema, type PromotionFormValues } from '../data/schema'

interface PromotionFormProps {
  onSubmit: (data: PromotionFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function PromotionForm({ onSubmit, isSubmitting }: PromotionFormProps) {
  const [clubs, setClubs] = useState<ClubDto[]>([])

  useEffect(() => {
    getClubs({ page: 1, pageSize: 200 }).then((res) => setClubs(res.data))
  }, [])

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: { clubId: '', fee: 0, startAt: '', endAt: '' },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="clubId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>俱乐部</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择俱乐部" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>费用 (元)</FormLabel>
              <FormControl>
                <Input type="number" min={0} step={0.01} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>开始日期</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>结束日期</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>创建</Button>
        </div>
      </form>
    </Form>
  )
}
```

- [ ] **Step 5: 创建列表页主组件和路由**

创建 `src/features/promotions/index.tsx`，整合排名组件、数据表格、创建/删除对话框。模式与 Task 7 的俱乐部列表页一致。

创建 `src/routes/_authenticated/promotions/route.tsx`：

```typescript
import { createFileRoute } from '@tanstack/react-router'
import PromotionsPage from '@/features/promotions'

export const Route = createFileRoute('/_authenticated/promotions')({
  component: PromotionsPage,
})
```

- [ ] **Step 6: 验证推广管理页**

启动 dev server，访问 `/promotions`：
- 排名组件正确显示
- 表格数据正确
- 创建推广对话框正常
- 删除确认正常
- 状态 badge 正确（生效中/未生效）

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement promotions page with ranking widget"
```

---

## Task 10: 实现 Dashboard 页和 Settings 外观页

**Files:**
- Create: `src/features/dashboard/index.tsx` — Dashboard 页面（可复用 shadcn-admin 的 dashboard）
- Modify: `src/routes/_authenticated/dashboard/route.tsx`（或 index route）
- 保留: `src/features/settings/appearance/` — shadcn-admin 已有
- 保留: `src/routes/_authenticated/settings/appearance/route.tsx` — shadcn-admin 已有

- [ ] **Step 1: 配置 Dashboard 路由**

shadcn-admin 已有 dashboard feature。修改 `src/routes/_authenticated/` 下的 index route（或 dashboard route），确保 `/` 路径指向 dashboard 页面。

如果 shadcn-admin 的 dashboard 路由是 `/dashboard`，需要添加一个 index route 重定向到 `/dashboard`，或者直接让 `/` 渲染 dashboard。

- [ ] **Step 2: 调整 Dashboard 内容**

shadcn-admin 的 dashboard 有 mock 数据和图表。暂时保留原样作为占位，后续可根据业务数据替换。Dashboard 页面无需现在迁移业务数据——这是一个 placeholder，与旧版一致。

- [ ] **Step 3: 验证 Settings 外观页**

shadcn-admin 的 appearance settings 应该已经可用。访问 `/settings/appearance`，验证主题切换功能正常（light/dark mode）。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: configure dashboard and settings appearance routes"
```

---

## Task 11: Command Palette 配置

**Files:**
- Modify: Command Palette 相关组件（通常在 `src/components/` 或 `src/context/search-context.tsx`）

- [ ] **Step 1: 更新 Command Palette 搜索项**

找到 shadcn-admin 的 Command Palette（⌘K）配置，通常在 search context 或 command 组件中。更新搜索/跳转项为：

```typescript
const commands = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: '俱乐部管理', url: '/clubs', icon: Building2 },
  { title: '推广管理', url: '/promotions', icon: Megaphone },
  { title: '外观设置', url: '/settings/appearance', icon: Palette },
]
```

移除对已删除页面（Apps、Chats、Tasks、Users）的引用。

- [ ] **Step 2: 验证 Command Palette**

按 ⌘K 打开，验证：
- 搜索项正确显示
- 可以跳转到对应页面
- 不再显示已删除页面

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: configure command palette for Delta Club navigation"
```

---

## Task 12: 清理和收尾

**Files:**
- Delete: `src/features/tasks/` — 参考完成后删除
- Delete: `apps/admin-old/` — 确认一切正常后删除
- Modify: `apps/admin/package.json` — 清理未使用的依赖

- [ ] **Step 1: 删除 tasks feature（参考代码）**

```bash
rm -rf /Users/microud/Projects/delta-club-info/apps/admin/src/features/tasks
```

- [ ] **Step 2: 全面功能测试**

手动测试所有功能：
1. 登录/登出
2. 侧边栏导航和折叠
3. Dashboard 页面
4. 俱乐部列表（搜索、分页、创建、删除）
5. 俱乐部详情（编辑信息、服务 CRUD、规则 CRUD）
6. 推广管理（排名、列表、创建、删除）
7. 外观设置（主题切换）
8. Command Palette (⌘K)
9. 错误页（访问不存在的路由 → 404）
10. 暗色模式下所有页面显示正常
11. 401 处理（token 过期重定向）

- [ ] **Step 3: 清理未使用的依赖**

检查 `package.json`，移除不再需要的依赖（如 Clerk 相关包、未使用的 Radix 组件等）。

```bash
cd /Users/microud/Projects/delta-club-info/apps/admin
pnpm build
```

Expected: 编译通过，无错误。

- [ ] **Step 4: 删除旧 admin 备份**

确认一切正常后：

```bash
rm -rf /Users/microud/Projects/delta-club-info/apps/admin-old
```

- [ ] **Step 5: 确保 .gitignore 包含 .superpowers/**

检查根目录 `.gitignore` 是否包含 `.superpowers/`，如果没有则添加。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: cleanup old admin backup and unused dependencies"
```

---

## 验证清单

完成所有 Task 后的最终验证：

- [ ] `pnpm install` 无错误
- [ ] `pnpm build` 编译通过
- [ ] `pnpm dev` 启动正常
- [ ] 所有 5 个业务路由功能正常（/, /clubs, /clubs/:id, /promotions, /settings/appearance）
- [ ] 5 个错误页可访问（/401, /403, /404, /500, /503）
- [ ] JWT 认证完整（登录、登出、401 重定向、token 持久化）
- [ ] 配色为 Light Slate + Blue Primary
- [ ] 暗色模式完整可用
- [ ] 侧边栏可折叠
- [ ] Command Palette (⌘K) 可用
- [ ] 响应式布局（移动端侧边栏为抽屉）
