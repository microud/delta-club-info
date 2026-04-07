import { createFileRoute } from '@tanstack/react-router'
import { SettingsTikHub } from '@/features/settings/tikhub'

export const Route = createFileRoute('/_authenticated/settings/tikhub')({
  component: SettingsTikHub,
})
