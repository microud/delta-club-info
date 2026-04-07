import { z } from 'zod'

export const platformLabels: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
  XIAOHONGSHU: '小红书',
  WECHAT_CHANNELS: '视频号',
  WECHAT_MP: '公众号',
}

export const contentTypeLabels: Record<string, string> = {
  VIDEO: '视频',
  NOTE: '笔记',
  ARTICLE: '文章',
}

export const categoryLabels: Record<string, string> = {
  REVIEW: '评测',
  SENTIMENT: '舆情',
  ANNOUNCEMENT: '公告',
}

export const contentSchema = z.object({
  id: z.string(),
  platform: z.string(),
  contentType: z.string(),
  category: z.string(),
  externalId: z.string(),
  externalUrl: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  authorName: z.string().nullable(),
  publishedAt: z.string().nullable(),
  bloggerId: z.string().nullable(),
  clubId: z.string().nullable(),
  clubName: z.string().nullable(),
  bloggerName: z.string().nullable(),
  groupId: z.string().nullable(),
  isPrimary: z.boolean(),
  groupPlatforms: z.array(z.string()).nullable(),
  aiParsed: z.boolean(),
  aiSummary: z.string().nullable(),
  aiSentiment: z.string().nullable(),
  aiClubMatch: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Content = z.infer<typeof contentSchema>
