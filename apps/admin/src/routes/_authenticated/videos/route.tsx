import { createFileRoute } from '@tanstack/react-router'
import ContentsPage from '@/features/contents'

export const Route = createFileRoute('/_authenticated/videos')({
  component: ContentsPage,
})
