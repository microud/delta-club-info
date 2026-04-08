# Admin 概览页重设计

## 概述

将 Admin 当前占位的 `Dashboard` 页面改名为"概览"，用真实业务数据替换 shadcn 模板的假数据。页面通过 Tab 分类承载不同视角的运营指标，第一版落地 5 个 Tab，后续迭代再精调。

## 目标

- 让管理员一打开后台就能看到：平台规模（有多少俱乐部/内容/博主）、有哪些活要干、商业化动态、爬虫是否健康、数据缺口在哪。
- 所有数字都可点击跳转到对应管理页（或带筛选参数）。
- 第一版不做实时推送，数据按请求拉取，合理缓存。

## 非目标

- 不做用户行为分析（用户端尚未上线）。
- 不做实时 WebSocket 推送。
- 不做导出/下载功能。
- 不做 Stage 6 相关内容（评论指标先做占位即可）。

## 命名与入口

- 侧边栏菜单 `Dashboard` 改为 `概览`。
- 页面标题 `Dashboard` 改为 `概览`。
- 路由保持 `/`（已登录首页）。
- 移除页面右上角的 `Download` 按钮（无意义）。
- 移除 shadcn 模板里 `Analytics` / `Reports` / `Notifications` 这些无用 Tab。

## Tab 结构

### Tab 1: 概览（默认）

纯数据 + 图表，不含可交互待办项。

**Stat Cards（顶部一排）**
1. 俱乐部总数 — 副文案：`运营中 X / 倒闭 Y`
2. 内容总数 — 副文案：`最近 7 天新增 +N`
3. 博主总数 — 副文案：`X 个平台账号`
4. 生效推广订单数 — 副文案：`日均 ¥X`

**图表区**
1. 最近 30 天内容采集趋势（按平台堆叠柱状图）
2. 内容类型分布饼图（评测 / 舆情 / 公告）
3. 各平台内容总量对比柱状图
4. 本月推广收入趋势（按日折线）

第一版图表可以先做 1~2 张，剩余留空间后续增补。具体选哪几张在实现阶段决定。

### Tab 2: 待处理

可交互列表，每项点击跳转到对应管理页（带筛选）。

- 待审核评论数（Stage 6 前接口返回 0，占位即可）
- 最近 24h 失败的爬虫执行数 → 跳转爬虫执行记录（筛选 status=failed）
- AI 解析失败的内容数 → 跳转内容管理（筛选 AI 解析状态=failed）
- 最近爬虫新增内容列表（最新 10 条，显示标题 + 平台图标 + 博主 + 入库时间）

### Tab 3: 商业化

- 本月推广收入（大数字）：生效订单按 `dailyRate × 本月实际覆盖天数` 累加
- 即将到期订单：未来 7 天内到期的订单列表
- 当前推广位数量：当前生效订单数 + 推广中俱乐部列表
- 历史累计推广收入
- 可选：按月推广收入趋势图

### Tab 4: 爬虫健康

- 最近 24h 爬虫执行成功率（%）
- **各平台最近成功采集时间**：B站 / 抖音 / 小红书 / 视频号 / 公众号，显示相对时间（"5 分钟前"/"2 小时前"），超过阈值（如 6 小时）高亮
- 平均每日采集量（最近 7 天均值）
- 最近失败执行记录列表（最新 10 条）
- 各平台最近 7 天采集量对比

### Tab 5: 数据完整度

每项显示数字 + 点击跳转到筛选后的俱乐部列表。

- 缺失工商信息的俱乐部数
- 没有任何服务项的俱乐部数
- 没有规则的俱乐部数
- 没有任何关联内容的俱乐部数（孤岛俱乐部）

## 后端接口设计

所有接口在 `apps/server` 新增 `OverviewModule`，路由前缀 `/admin/overview/*`，鉴权复用现有 admin JWT。

| 接口 | 返回 |
|------|------|
| `GET /admin/overview/summary` | Tab1 的 Stat Cards 数据 |
| `GET /admin/overview/charts/content-trend?days=30` | 采集趋势数据（按平台分组） |
| `GET /admin/overview/charts/content-type-distribution` | 内容类型分布 |
| `GET /admin/overview/charts/platform-distribution` | 各平台内容量 |
| `GET /admin/overview/charts/revenue-trend?month=YYYY-MM` | 推广收入趋势 |
| `GET /admin/overview/todos` | 待处理事项计数（失败爬虫、AI 失败、待审评论） |
| `GET /admin/overview/recent-contents?limit=10` | 最近入库内容 |
| `GET /admin/overview/business` | 商业化 Tab（本月收入、即将到期、生效订单、累计收入） |
| `GET /admin/overview/crawler-health` | 爬虫 Tab（成功率、各平台最近采集、均值、失败列表） |
| `GET /admin/overview/data-quality` | 数据完整度 Tab（各类缺口数量） |

每个接口独立，前端按 Tab 懒加载，避免首次打开概览拉一堆不必要数据。

### 计算要点

- **运营中/倒闭俱乐部**：依据现有俱乐部生命周期字段。
- **最近 7 天新增内容**：按 `content.createdAt` 或爬虫入库时间。
- **生效推广订单日均和**：所有 `status=active` 且在当前日期区间内的订单，`sum(dailyRate)`。
- **本月推广收入**：对每个生效订单，计算其在本月内的覆盖天数 × `dailyRate` 求和。
- **各平台最近成功采集时间**：从 `crawl_execution_records` 表按 platform 分组取 `max(finishedAt where success)`。
- **爬虫成功率**：最近 24h `sum(success) / sum(total)`。
- **孤岛俱乐部**：`left join content on content.clubId = club.id` where content is null。

性能上单次请求都是聚合查询，不做额外缓存，第一版直接打 DB；后续可视情况加 Redis 缓存（TTL 60s）。

## 前端实现要点

- 位置：`apps/admin/src/features/dashboard/`（保持目录名，只改 UI 文案和内容）。
- 删除模板遗留组件：`analytics.tsx`、`analytics-chart.tsx`、`overview.tsx`（假柱状图）、`recent-sales.tsx`。
- 每个 Tab 独立组件文件：
  - `components/overview-tab.tsx`
  - `components/todos-tab.tsx`
  - `components/business-tab.tsx`
  - `components/crawler-health-tab.tsx`
  - `components/data-quality-tab.tsx`
- Stat Card 抽一个通用组件 `components/stat-card.tsx`（title + value + subtext + 可选 icon + 可选高亮状态）。
- 数据获取用现有的 TanStack Query 约定。
- 图表使用项目已有的 Recharts（shadcn-admin 自带）。
- 空态/加载态统一处理。

## 文案

- 侧栏：`Dashboard` → `概览`
- 页面标题：`Dashboard` → `概览`
- Tab 名称：`概览` / `待处理` / `商业化` / `爬虫健康` / `数据完整度`

## 实现顺序

1. 后端：`OverviewModule` + `summary` + `recent-contents` + `todos` 接口 → 支撑 Tab1 和 Tab2 核心数据
2. 前端：改名 + 移除旧模板内容 + 实现 Tab1（概览）和 Tab2（待处理）
3. 后端：`business` 接口 + 前端 Tab3
4. 后端：`crawler-health` 接口 + 前端 Tab4
5. 后端：`data-quality` 接口 + 前端 Tab5
6. 图表增补（按需）

每步可独立 commit。

## 风险 / 未决

- Tab3 的"即将到期订单"依赖推广订单有结束时间字段——如果尚未有，需要先补上。实现阶段先确认。
- Tab5 的"没有规则的俱乐部"依赖规则数据结构，实现阶段确认字段。
- 图表第一版做几张取决于数据源就绪度，用户表示后续会调整，可先不追求完整。
