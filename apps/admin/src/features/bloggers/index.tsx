import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getBloggers, createBlogger, updateBlogger, deleteBlogger } from '@/lib/api'
import { type Blogger, type BloggerFormValues } from './data/schema'
import { BloggersTable } from './components/bloggers-table'
import { BloggerForm } from './components/blogger-form'
import { BloggersDeleteDialog } from './components/bloggers-delete-dialog'

export default function BloggersPage() {
  const [bloggers, setBloggers] = useState<Blogger[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Blogger | null>(null)

  const fetchBloggers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getBloggers()
      setBloggers(data as Blogger[])
    } catch {
      toast.error('获取博主列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBloggers()
  }, [fetchBloggers])

  const handleCreate = async (data: BloggerFormValues) => {
    try {
      setIsSubmitting(true)
      await createBlogger(data)
      toast.success('创建成功')
      setCreateOpen(false)
      fetchBloggers()
    } catch {
      toast.error('创建失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (blogger: Blogger) => {
    try {
      await updateBlogger(blogger.id, { isActive: !blogger.isActive })
      toast.success(blogger.isActive ? '已停用' : '已启用')
      fetchBloggers()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteBlogger(deleteTarget.id)
      toast.success('删除成功')
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchBloggers()
    } catch {
      toast.error('删除失败')
    }
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>博主管理</h2>
            <p className='text-muted-foreground'>管理监控博主列表</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>添加博主</Button>
        </div>

        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <BloggersTable
            data={bloggers}
            onToggle={handleToggle}
            onDelete={(b) => { setDeleteTarget(b); setDeleteOpen(true) }}
          />
        )}
      </Main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>添加博主</DialogTitle>
            <DialogDescription>添加需要监控的评测博主。</DialogDescription>
          </DialogHeader>
          <BloggerForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>

      <BloggersDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        bloggerName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
      />
    </>
  )
}
