import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

function AuthenticatedRoute() {
  const { admin, loading, checkAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!loading && !admin) {
      navigate({ to: '/sign-in', replace: true })
    }
  }, [loading, admin, navigate])

  if (loading) {
    return (
      <div className='flex h-svh items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-foreground' />
      </div>
    )
  }

  if (!admin) {
    return null
  }

  return <AuthenticatedLayout />
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedRoute,
})
