import { createFileRoute } from '@tanstack/react-router'
import ClubsPage from '@/features/clubs'

export const Route = createFileRoute('/_authenticated/clubs')({
  component: ClubsPage,
})
