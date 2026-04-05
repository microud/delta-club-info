import { createFileRoute } from '@tanstack/react-router'
import ParseTasksPage from '@/features/parse-tasks'

export const Route = createFileRoute('/_authenticated/parse-tasks/')({
  component: ParseTasksPage,
})
