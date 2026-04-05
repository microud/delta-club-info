import { createFileRoute } from '@tanstack/react-router'
import ClubDetailPage from '@/features/clubs/detail'

export const Route = createFileRoute('/_authenticated/clubs/$id')({
  component: ClubDetailPage,
})
