import { z } from 'zod'

export const bloggerSchema = z.object({
  id: z.string(),
  platform: z.enum(['BILIBILI', 'DOUYIN']),
  externalId: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

export type Blogger = z.infer<typeof bloggerSchema>

export const bloggerFormSchema = z.object({
  platform: z.enum(['BILIBILI', 'DOUYIN']),
  externalId: z.string().min(1, '平台用户 ID 不能为空'),
  name: z.string().min(1, '博主名称不能为空'),
})

export type BloggerFormValues = z.infer<typeof bloggerFormSchema>

export const platformLabels: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
}
