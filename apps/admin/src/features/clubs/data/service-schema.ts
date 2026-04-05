import { z } from 'zod'

export const serviceFormSchema = z.object({
  type: z.string().min(1, '请选择服务类型'),
  sortOrder: z.number(),
  priceYuan: z.string().optional(),
  priceHafuCoin: z.string().optional(),
  tier: z.string().optional(),
  pricePerHour: z.string().optional(),
  gameName: z.string().optional(),
  hasGuarantee: z.boolean().optional(),
  guaranteeHafuCoin: z.string().optional(),
  rules: z.string().optional(),
})

export type ServiceFormValues = z.infer<typeof serviceFormSchema>

export const serviceTypeLabels: Record<string, string> = {
  KNIFE_RUN: '跑刀',
  ACCOMPANY: '陪玩',
  ESCORT_TRIAL: '护航体验单',
  ESCORT_STANDARD: '护航标准单',
  ESCORT_FUN: '护航趣味玩法',
}

export const serviceTypes = ['KNIFE_RUN', 'ACCOMPANY', 'ESCORT_TRIAL', 'ESCORT_STANDARD', 'ESCORT_FUN'] as const
