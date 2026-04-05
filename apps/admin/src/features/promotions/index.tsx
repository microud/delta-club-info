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
import { getPromotions, createPromotion, deletePromotion } from '@/lib/api'
import { type Promotion, type PromotionFormValues } from './data/schema'
import { PromotionsTable } from './components/promotions-table'
import { PromotionForm } from './components/promotion-form'
import { RankingWidget } from './components/ranking-widget'
import { PromotionsDeleteDialog } from './components/promotions-delete-dialog'

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null)

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getPromotions()
      setPromotions(data as Promotion[])
    } catch {
      toast.error('获取推广列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  const handleCreate = async (data: PromotionFormValues) => {
    try {
      setIsSubmitting(true)
      await createPromotion({
        clubId: data.clubId,
        fee: data.fee,
        startAt: data.startAt,
        endAt: data.endAt,
      })
      toast.success('创建成功')
      setCreateOpen(false)
      fetchPromotions()
    } catch {
      toast.error('创建失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePromotion(deleteTarget.id)
      toast.success('删除成功')
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchPromotions()
    } catch {
      toast.error('删除失败')
    }
  }

  const openDeleteDialog = (promotion: Promotion) => {
    setDeleteTarget(promotion)
    setDeleteOpen(true)
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
            <h2 className='text-2xl font-bold tracking-tight'>推广管理</h2>
            <p className='text-muted-foreground'>管理俱乐部推广订单</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>创建推广</Button>
        </div>

        <RankingWidget />

        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <PromotionsTable data={promotions} onDelete={openDeleteDialog} />
        )}
      </Main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>创建推广</DialogTitle>
            <DialogDescription>
              填写推广信息，完成后点击保存。
            </DialogDescription>
          </DialogHeader>
          <PromotionForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>

      <PromotionsDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        clubName={deleteTarget?.clubName ?? ''}
        onConfirm={handleDelete}
      />
    </>
  )
}
