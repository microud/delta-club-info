import { z } from 'zod'

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

export const bloggerAccountSchema = z.object({
  id: z.string(),
  bloggerId: z.string(),
  platform: z.string(),
  platformUserId: z.string(),
  platformUsername: z.string().nullable(),
  crawlCategories: z.array(z.string()),
  lastCrawledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type BloggerAccount = z.infer<typeof bloggerAccountSchema>

export const bloggerSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  isActive: z.boolean(),
  accounts: z.array(bloggerAccountSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Blogger = z.infer<typeof bloggerSchema>

export const bloggerFormSchema = z.object({
  name: z.string().min(1, '博主名称不能为空'),
  avatar: z.string().optional(),
})
export type BloggerFormValues = z.infer<typeof bloggerFormSchema>

export const bloggerAccountFormSchema = z.object({
  platform: z.enum(['BILIBILI', 'DOUYIN', 'XIAOHONGSHU', 'WECHAT_CHANNELS']),
  platformUserId: z.string().min(1, '平台用户 ID 不能为空'),
  platformUsername: z.string().optional(),
  crawlCategories: z.array(z.enum(['REVIEW', 'SENTIMENT'])).min(1, '至少选择一个采集分类'),
})
export type BloggerAccountFormValues = z.infer<typeof bloggerAccountFormSchema>
