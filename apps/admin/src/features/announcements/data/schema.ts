import { z } from 'zod'

export const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  status: z.enum(['draft', 'published']),
  publishedAt: z.string().nullable().optional(),
  createdAt: z.string(),
})

export type Announcement = z.infer<typeof announcementSchema>

export const announcementFormSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  status: z.enum(['draft', 'published']),
})

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>

export const statusLabels: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
}
