import { z } from 'zod'

export const crawlTaskSchema = z.object({
  id: z.string(),
  type: z.enum(['BLOGGER', 'KEYWORD']),
  targetId: z.string(),
  status: z.enum(['RUNNING', 'SUCCESS', 'FAILED']),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  videoCount: z.number(),
  errorMessage: z.string().nullable(),
})

export type CrawlTask = z.infer<typeof crawlTaskSchema>

export const taskTypeLabels: Record<string, string> = {
  BLOGGER: '博主抓取',
  KEYWORD: '关键词搜索',
}

export const taskStatusLabels: Record<string, string> = {
  RUNNING: '运行中',
  SUCCESS: '成功',
  FAILED: '失败',
}
