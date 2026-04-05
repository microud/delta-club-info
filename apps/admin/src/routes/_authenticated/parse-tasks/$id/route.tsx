import { createFileRoute } from '@tanstack/react-router'
import { ParseTaskReview } from '@/features/parse-tasks/components/parse-task-review'

export const Route = createFileRoute('/_authenticated/parse-tasks/$id')({
  component: ParseTaskReview,
})
