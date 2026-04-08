import { useCallback, useEffect, useState } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { getClubs, createClub, updateClub, deleteClub } from '@/lib/api'
import { type Club, type ClubFormValues } from './data/schema'
import { ClubsTable } from './components/clubs-table'
import { ClubsActionDialog } from './components/clubs-action-dialog'
import { ClubsDeleteDialog } from './components/clubs-delete-dialog'

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Pagination state (shared with table)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Club | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Club | null>(null)

  const fetchClubs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getClubs({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      })
      setClubs(res.data as Club[])
      setTotal(res.total)
    } catch {
      toast.error('获取俱乐部列表失败')
    } finally {
      setLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize])

  useEffect(() => {
    fetchClubs()
  }, [fetchClubs])

  const handleCreate = async (data: ClubFormValues) => {
    try {
      setIsSubmitting(true)
      await createClub(data)
      toast.success('创建成功')
      setCreateOpen(false)
      fetchClubs()
    } catch {
      toast.error('创建失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (club: Club) => {
    setEditTarget(club)
    setEditOpen(true)
  }

  const handleUpdate = async (data: ClubFormValues) => {
    if (!editTarget) return
    try {
      setIsSubmitting(true)
      await updateClub(editTarget.id, data)
      toast.success('更新成功')
      setEditOpen(false)
      setEditTarget(null)
      fetchClubs()
    } catch {
      toast.error('更新失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteClub(deleteTarget.id)
      toast.success('删除成功')
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchClubs()
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
            <h2 className='text-2xl font-bold tracking-tight'>俱乐部管理</h2>
            <p className='text-muted-foreground'>管理所有三角洲陪玩俱乐部信息</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>添加俱乐部</Button>
        </div>
        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <ClubsTable
            data={clubs}
            total={total}
            pagination={pagination}
            onPaginationChange={setPagination}
            onEdit={handleEdit}
          />
        )}
      </Main>

      <ClubsActionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <ClubsActionDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditTarget(null)
        }}
        initialData={
          editTarget
            ? {
                name: editTarget.name,
                status: editTarget.status,
                logo: editTarget.logo ?? '',
                description: editTarget.description ?? '',
                wechatOfficialAccount: editTarget.wechatOfficialAccount ?? '',
                wechatMiniProgram: editTarget.wechatMiniProgram ?? '',
                contactInfo: editTarget.contactInfo ?? '',
                establishedAt: editTarget.establishedAt ?? '',
                companyName: editTarget.companyName ?? '',
                creditCode: editTarget.creditCode ?? '',
                legalPerson: editTarget.legalPerson ?? '',
                registeredAddress: editTarget.registeredAddress ?? '',
                businessScope: editTarget.businessScope ?? '',
                registeredCapital: editTarget.registeredCapital ?? '',
                companyEstablishedAt: editTarget.companyEstablishedAt ?? '',
                businessStatus: editTarget.businessStatus ?? '',
                orderPosters: editTarget.orderPosters ?? [],
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
      />

      <ClubsDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        clubName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
      />
    </>
  )
}
