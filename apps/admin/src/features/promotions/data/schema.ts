import { z } from 'zod'

export const promotionSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string().optional(),
  fee: z.string(),
  dailyRate: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  isActive: z.boolean().optional(),
  createdAt: z.string(),
})

export type Promotion = z.infer<typeof promotionSchema>

export const promotionFormSchema = z.object({
  clubId: z.string().min(1, '请选择俱乐部'),
  fee: z.number().min(0, '金额不能为负'),
  startAt: z.string().min(1, '请选择开始日期'),
  endAt: z.string().min(1, '请选择结束日期'),
})

export type PromotionFormValues = z.infer<typeof promotionFormSchema>
