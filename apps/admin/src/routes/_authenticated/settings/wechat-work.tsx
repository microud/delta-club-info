import { createFileRoute } from '@tanstack/react-router'
import { SettingsWechatWork } from '@/features/settings/wechat-work'

export const Route = createFileRoute('/_authenticated/settings/wechat-work')({
  component: SettingsWechatWork,
})
