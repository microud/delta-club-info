import { z } from 'zod'

export const ruleFormSchema = z.object({
  content: z.string().min(1, '规则内容不能为空'),
  sentiment: z.string().min(1, '请选择倾向性'),
})

export type RuleFormValues = z.infer<typeof ruleFormSchema>

export const sentimentLabels: Record<string, string> = {
  FAVORABLE: '有利',
  UNFAVORABLE: '不利',
  NEUTRAL: '中性',
}

export const sentimentColors: Record<string, string> = {
  FAVORABLE: 'text-green-600',
  UNFAVORABLE: 'text-red-600',
  NEUTRAL: 'text-gray-500',
}

export const sentiments = ['FAVORABLE', 'UNFAVORABLE', 'NEUTRAL'] as const
