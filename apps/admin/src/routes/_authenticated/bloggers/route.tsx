import { createFileRoute } from '@tanstack/react-router'
import BloggersPage from '@/features/bloggers'

export const Route = createFileRoute('/_authenticated/bloggers')({
  component: BloggersPage,
})
