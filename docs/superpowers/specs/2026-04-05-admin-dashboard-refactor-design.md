# Admin Dashboard 重构设计：基于 shadcn-admin

## 概述

将当前 `apps/admin` 替换为基于 [shadcn-admin](https://github.com/satnaing/shadcn-admin) 的实现，采用 Fork + 迁移策略。保留所有现有业务功能，同时获得 shadcn-admin 的完整基础设施。

## 策略

Fork shadcn-admin 作为新的 `apps/admin`，清理不需要的页面，将现有业务逻辑迁入，调整配色为 Light Slate + Blue Primary。

## 技术变更

| 项目 | 当前 | 目标 |
|------|------|------|
| 路由 | React Router 7 | TanStack Router |
| 状态管理 | useState + localStorage | Zustand (auth) + useState (业务) |
| 表单验证 | 原生 FormData | React Hook Form + Zod |
| 数据表格 | 手写 Table | TanStack Table（排序/筛选/列控制/批量操作） |
| 布局 | 固定侧边栏 (240px) | 可折叠侧边栏 + 顶部 Header |

### 新增依赖（来自 shadcn-admin）

- `@tanstack/react-router` — 文件式路由
- `@tanstack/react-query` — 数据获取（可选，后续引入）
- `@tanstack/react-table` — 高级数据表格
- `react-hook-form` — 表单管理
- `zod` — Schema 验证
- `zustand` — 轻量状态管理（Auth store）
- 额外 Radix UI 原语（shadcn-admin 依赖的）

### 移除依赖

- `react-router` — 被 TanStack Router 替代
- `@clerk/clerk-react` — 不引入 Clerk，保持现有 JWT 认证

## 配色方案

Light Slate 中性布局 + Blue Primary：

- **Primary**: #2563eb (Blue 600)
- **Primary Light**: #dbeafe
- **Primary Dark**: #1d4ed8
- **Background**: #f8fafc (Slate 50)
- **Foreground**: #0f172a (Slate 900)
- **Sidebar**: 白色背景 (#fff)，浅灰边框

暗色模式保留 shadcn-admin 默认的暗色变量，Primary 对应调整为 Blue 系。

## 路由结构

```
src/routes/
├── __root.tsx                     # Root layout
├── (auth)/
│   └── sign-in/
│       └── route.tsx              # 登录页（适配现有 JWT 登录）
├── (errors)/
│   ├── 401.tsx
│   ├── 403.tsx
│   ├── 404.tsx
│   ├── 500.tsx
│   └── 503.tsx
├── _authenticated/
│   ├── route.tsx                  # 认证布局（侧边栏 + Header）
│   ├── dashboard/
│   │   └── route.tsx              # Dashboard 首页
│   ├── clubs/
│   │   ├── route.tsx              # 俱乐部列表
│   │   └── $id/
│   │       └── route.tsx          # 俱乐部详情（tabs: 信息/服务/规则）
│   ├── promotions/
│   │   └── route.tsx              # 推广管理
│   └── settings/
│       ├── route.tsx              # Settings 布局
│       └── appearance/
│           └── route.tsx          # 外观设置
```

## 侧边栏导航

```typescript
// 导航配置
navGroups: [
  {
    title: '管理',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard' },
      { title: '俱乐部管理', icon: Building2, url: '/clubs' },
      { title: '推广管理', icon: Megaphone, url: '/promotions' },
    ],
  },
  {
    title: '设置',
    items: [
      { title: '外观', icon: Palette, url: '/settings/appearance' },
    ],
  },
]
```

## 需要从 shadcn-admin 清理的内容

删除以下 features 和对应路由：

- `features/apps/` — 应用管理页
- `features/chats/` — 聊天功能
- `features/tasks/` — 任务管理页（保留其数据表格模式作为参考）
- `features/users/` — 用户管理页
- `routes/clerk/` — Clerk 认证路由
- `features/settings/` 中除 appearance 外的子页面（account、display、notifications、profile）

保留的基础设施：
- 布局系统（sidebar、header、content area）
- 错误页模板
- Command Palette (⌘K)
- 主题切换
- 所有 `components/ui/` 组件

## 业务迁移

### 认证

- 保持现有 JWT 模式（localStorage token + axios interceptor）
- 用 Zustand store 替代 `useAuth` hook 管理 auth 状态
- 登录页适配 shadcn-admin 的 sign-in 页面样式
- `_authenticated/route.tsx` 中检查 auth store，未登录重定向到 sign-in

### API 层

- 保持现有 `api.ts` 的 axios 实例和所有接口函数
- 所有 API 端点不变（base URL `/admin`）
- Token interceptor 和 401 处理逻辑不变

### 俱乐部管理（/clubs）

迁移到 TanStack Table 模式：
- 列表页：使用高级数据表格（排序、搜索、分页、列可见性）
- 详情页：保持 tabs 结构（信息 / 服务 / 规则）
- 表单：用 React Hook Form + Zod 重写 ClubForm、ServiceForm、RuleForm
- Dialog 模式保持不变

### 推广管理（/promotions）

- 列表页：升级为高级数据表格
- 排名展示：保留 ranking widget
- 表单：用 React Hook Form + Zod 重写 PromotionForm

### 共享类型

- 继续使用 `@delta-club/shared` 包的所有 DTO 和 Enum 类型
- Zod schema 基于现有 DTO 类型定义

## Monorepo 集成

- 新 admin 仍位于 `apps/admin/`
- `package.json` 中保持 `@delta-club/shared: "workspace:*"` 依赖
- Vite 配置保持 `@` 路径别名和 `/admin` 代理
- Turborepo 配置无需变更

## 实现顺序

1. **骨架搭建**：Fork shadcn-admin → 清理不需要的页面 → 集成到 monorepo → 调整配色
2. **认证迁移**：JWT auth store → 登录页 → 路由保护
3. **API 层接入**：迁移 axios 实例和 API 函数
4. **业务页面迁移**：Dashboard → Clubs（列表+详情） → Promotions
5. **表单升级**：React Hook Form + Zod 重写所有表单
6. **收尾**：暗色模式全面适配、Command Palette 配置、响应式测试
