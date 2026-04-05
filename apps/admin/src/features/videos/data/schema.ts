import { z } from 'zod'

export const videoSchema = z.object({
  id: z.string(),
  clubId: z.string().nullable(),
  clubName: z.string().nullable().optional(),
  platform: z.enum(['BILIBILI', 'DOUYIN']),
  externalId: z.string(),
  title: z.string(),
  coverUrl: z.string(),
  videoUrl: z.string(),
  authorName: z.string(),
  category: z.enum(['REVIEW', 'SENTIMENT']),
  aiParsed: z.boolean(),
  aiSentiment: z.string().nullable(),
  publishedAt: z.string(),
  createdAt: z.string(),
})

export type Video = z.infer<typeof videoSchema>

export const platformLabels: Record<string, string> = {
  BILIBILI: 'B站',
  DOUYIN: '抖音',
}

export const categoryLabels: Record<string, string> = {
  REVIEW: '评测',
  SENTIMENT: '舆情',
}
