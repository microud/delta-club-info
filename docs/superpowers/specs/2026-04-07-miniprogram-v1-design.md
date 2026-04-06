# 小程序第一版设计规格

## 概述

以小程序页面需求驱动 admin/API 开发，解决 admin "盲做"的问题。先规划小程序所有页面的数据需求，再反推 server 和 admin 需要补齐的部分。

## 技术选型

- 小程序框架：UniApp (Vue3 + Vite + TypeScript)
- 项目位置：`apps/uniapp/`
- Server 端：新建 `ClientModule`，路由前缀 `/api/client/*`，与 `AdminModule` 共享数据层

## 第一版功能范围

### 包含

1. 首页（推广轮播 + 混合 feed 流）
2. 俱乐部列表页（筛选 + 搜索）
3. 俱乐部详情页（Tab 式内容展示）
4. 个人中心（收藏 + 用户信息）
5. 视频详情页（中转页）
6. 公告详情页

### 不含（推迟）

- 俱乐部对比页
- 俱乐部墓碑页
- 评价系统（Stage 6）

## 用户认证

- 进入小程序即静默登录（`wx.login` → openid → 建用户记录）
- 纯浏览不需要弹授权
- 触发收藏时弹出微信授权获取昵称和头像

## 底部 Tab 导航

| Tab | 页面 |
|-----|------|
| 首页 | 轮播 + feed 流 |
| 俱乐部 | 列表页 |
| 我的 | 个人中心 |

## 页面设计

### 1. 首页

#### 顶部轮播 Banner

- 数据来源：所有生效中的推广订单对应的俱乐部，取 `orderPosters` 作为 Banner 图
- 推广统一定价，不区分排序权重（`dailyRate` 字段保留但首页轮播不使用）
- 轮播顺序：随机
- 点击行为：跳转到该俱乐部详情页
- 无推广数据时：隐藏轮播区域或显示平台默认 Banner

#### 混合 Feed 流

- 内容类型混排：评测视频 (REVIEW)、舆情视频 (SENTIMENT)、公告活动 (ANNOUNCEMENT)
- 排序：统一按发布时间倒序
- 分页：下拉加载更多，每页 20 条
- 卡片样式按类型区分：
  - **视频卡片**：封面图 + 标题 + 博主名 + 平台标识 + 关联俱乐部名（如有）+ 类型标签（评测/舆情）
  - **公告卡片**：标题 + 摘要 + 发布时间
- 点击视频卡片 → 进入视频详情页
- 点击公告卡片 → 进入公告详情页

#### API

- `GET /api/client/home/banners` — 推广俱乐部轮播数据
- `GET /api/client/home/feed?page=1&pageSize=20` — 混合 feed 流

### 2. 俱乐部列表页

#### 列表展示

- 卡片样式：Logo + 俱乐部名称 + 运营时长 + 服务类型标签
- 不展示价格信息
- 排序：按创建时间倒序
- 分页：下拉加载更多，每页 20 条
- 无字母索引

#### 筛选

- 服务类型：跑刀 / 陪玩 / 护航体验 / 护航标准 / 护航趣味（多选）

#### 搜索

- 顶部搜索框，俱乐部名称模糊搜索
- 搜索和筛选可叠加

#### API

- `GET /api/client/clubs?page=1&pageSize=20&serviceTypes=ESCORT_STANDARD,RUN_KNIFE&keyword=xxx`

### 3. 俱乐部详情页

#### 顶部固定区域

- Logo、名称、简介、运营时长
- 公众号/小程序跳转（导流到俱乐部自己的渠道）
- 前身俱乐部链接（点击跳转到前身俱乐部详情页）
- 收藏按钮（未授权时点击触发微信授权，授权后自动收藏）

#### Tab 区域（左右滑动/点按切换）

| Tab 顺序 | 内容 |
|----------|------|
| 1. 服务价格表 | 按服务类型分 Tab + 右上角"查看规则"弹 Modal（含 AI 高亮标注）+ 底部订单海报图片 |
| 2. 评论 | Stage 6 占位，显示"即将开放" |
| 3. 评测视频 | 关联的 REVIEW 类视频列表 |
| 4. 舆情视频 | 关联的 SENTIMENT 类视频列表 |
| 5. 工商信息 | 公司全称、法人、经营状态等 |

#### 详情页布局说明

- 服务价格表作为默认 Tab，进入详情页直接看到核心信息
- 规则不单独占 Tab，通过服务价格表右上角"查看规则"按钮弹出 Modal 展示
- 订单海报展示在服务价格表 Tab 内，价格列表下方

#### API

- `GET /api/client/clubs/:id` — 俱乐部详情（基本信息 + 工商信息 + 前身俱乐部）
- `GET /api/client/clubs/:id/services` — 服务项列表
- `GET /api/client/clubs/:id/rules` — 规则列表
- `GET /api/client/clubs/:id/videos?type=REVIEW|SENTIMENT` — 关联视频

### 4. 视频详情页

- 标题、简介
- AI 摘要（Stage 4 LLM 产出，未完成前展示简介）
- 关联俱乐部跳转链接
- 外链按钮（跳转 B 站/抖音原视频）

#### API

- `GET /api/client/videos/:id` — 视频详情

### 5. 公告详情页

- 标题、正文、发布时间

#### API

- `GET /api/client/announcements/:id` — 公告详情

### 6. 个人中心

#### 用户信息

- 顶部显示微信头像 + 昵称
- 未授权时显示默认头像 + "点击登录"，点击触发微信授权

#### 功能列表

- 收藏的俱乐部 → 进入收藏列表页（展示方式与俱乐部列表页一致）
- 我的评价 → Stage 6 占位

#### API

- `POST /api/client/auth/login` — 静默登录（wx.login code → openid → 返回 token）
- `POST /api/client/auth/profile` — 提交授权后的头像和昵称
- `GET /api/client/user/profile` — 获取用户信息
- `GET /api/client/user/favorites` — 收藏列表
- `POST /api/client/user/favorites/:clubId` — 添加收藏
- `DELETE /api/client/user/favorites/:clubId` — 取消收藏

## 页面跳转关系

```
首页
├── 点击 Banner → 俱乐部详情页
├── 点击视频卡片 → 视频详情页
│   └── 点击关联俱乐部 → 俱乐部详情页
└── 点击公告卡片 → 公告详情页

俱乐部列表
└── 点击卡片 → 俱乐部详情页
    └── 点击前身俱乐部 → 另一个俱乐部详情页

个人中心
├── 点击登录 → 微信授权
└── 收藏列表 → 点击 → 俱乐部详情页
```

## 需要新建的数据表

| 表名 | 说明 |
|------|------|
| `users` | 小程序用户（openid、unionid、昵称、头像、创建时间） |
| `user_favorites` | 收藏关系（userId、clubId、创建时间） |
| `announcements` | 公告/活动（标题、正文、发布时间、状态） |

## 需要新建的 Server 模块

`ClientModule` — `/api/client/*`，包含：

| 子模块 | 说明 |
|--------|------|
| `client/auth` | 静默登录、微信授权更新 |
| `client/home` | 轮播 Banner、混合 feed 流 |
| `client/clubs` | 列表、详情、服务、规则、视频 |
| `client/videos` | 视频详情 |
| `client/announcements` | 公告详情 |
| `client/user` | 个人信息、收藏管理 |

## Admin 需要补齐

- 公告/活动管理 CRUD

## 开发顺序（逐页推进）

1. 项目初始化（UniApp 脚手架 + ClientModule 空壳 + 静默登录）
2. 首页（轮播 + feed 流）
3. 俱乐部列表页
4. 俱乐部详情页
5. 视频详情页
6. 个人中心（授权 + 收藏）

每个步骤：设计页面 → 明确 API → 发现 admin/数据缺口 → 补齐 → 实现页面。

## Stage 调整说明

- 暂停 Stage 4（LLM 集成剩余部分）
- 本设计对应新的 Stage 5（小程序第一版），为当前最高优先级
- AI 摘要等 Stage 4 依赖项先预留字段，展示替代内容
