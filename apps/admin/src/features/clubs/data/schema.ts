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
