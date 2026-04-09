import { z } from 'zod'

export const crawlTaskSchema = z.object({
  id: z.string(),
  taskType: z.string(),
  category: z.string(),
  platform: z.string(),
  targetId: z.string(),
  targetName: z.string().nullable().optional(),
  cronExpression: z.string(),
  isActive: z.boolean(),
  lastRunAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type CrawlTask = z.infer<typeof crawlTaskSchema>

export const crawlTaskRunSchema = z.object({
  id: z.string(),
  crawlTaskId: z.string(),
  status: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  itemsFetched: z.number(),
  itemsCreated: z.number(),
  errorMessage: z.string().nullable(),
})
export type CrawlTaskRun = z.infer<typeof crawlTaskRunSchema>

export const taskTypeLabels: Record<string, string> = {
  BLOGGER: '博主抓取',
  BLOGGER_POSTS: '博主抓取',
  KEYWORD: '关键词搜索',
  KEYWORD_SEARCH: '关键词搜索',
  MP_ARTICLES: '公众号文章',
}

export const platformLabels: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
  XIAOHONGSHU: '小红书',
  WECHAT_CHANNELS: '视频号',
  WECHAT_MP: '公众号',
}

export const categoryLabels: Record<string, string> = {
  REVIEW: '评测',
  SENTIMENT: '舆情',
}

export const runStatusLabels: Record<string, string> = {
  RUNNING: '运行中',
  SUCCESS: '成功',
  FAILED: '失败',
}
