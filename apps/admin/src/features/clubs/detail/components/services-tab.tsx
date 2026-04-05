import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import type { ClubServiceDto } from '@delta-club/shared'
import { Button } from '@/components/ui/button'
import { SmartImportModal } from './smart-import-modal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getClubServices,
  createClubService,
  updateClubService,
  deleteClubService,
} from '@/lib/api'
import { serviceTypeLabels, type ServiceFormValues } from '../../data/service-schema'
import { ServiceForm } from './service-form'

function getPriceSummary(service: ClubServiceDto): string {
  switch (service.type) {
    case 'KNIFE_RUN':
    case 'ESCORT_TRIAL':
    case 'ESCORT_STANDARD':
      return `¥${service.priceYuan ?? '-'} / ${service.priceHafuCoin ?? '-'}哈夫币`
    case 'ACCOMPANY':
      return `${service.tier ?? '-'} ¥${service.pricePerHour ?? '-'}/小时`
    case 'ESCORT_FUN': {
      let summary = service.gameName ?? '-'
      if (service.hasGuarantee) {
        summary += ` (保底 ${service.guaranteeHafuCoin ?? '-'}哈夫币)`
      }
      return summary
    }
    default:
      return '-'
  }
}

function toFormValues(service: ClubServiceDto): ServiceFormValues {
  return {
    type: service.type,
    sortOrder: service.sortOrder,
    priceYuan: service.priceYuan ?? '',
    priceHafuCoin: service.priceHafuCoin ?? '',
    tier: service.tier ?? '',
    pricePerHour: service.pricePerHour ?? '',
    gameName: service.gameName ?? '',
    hasGuarantee: service.hasGuarantee ?? false,
    guaranteeHafuCoin: service.guaranteeHafuCoin ?? '',
    rules: service.rules ?? '',
  }
}

type ServicesTabProps = {
  clubId: string
}

export function ServicesTab({ clubId }: ServicesTabProps) {
  const [services, setServices] = useState<ClubServiceDto[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClubServiceDto | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClubServiceDto | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [smartImportOpen, setSmartImportOpen] = useState(false)

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getClubServices(clubId)
      setServices(data)
    } catch {
      toast.error('获取服务列表失败')
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const handleCreate = async (data: ServiceFormValues) => {
    try {
      setIsSubmitting(true)
      await createClubService(clubId, data)
      toast.success('创建服务成功')
      setCreateOpen(false)
      fetchServices()
    } catch {
      toast.error('创建服务失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (data: ServiceFormValues) => {
    if (!editTarget) return
    try {
      setIsSubmitting(true)
      await updateClubService(clubId, editTarget.id, data)
      toast.success('更新服务成功')
      setEditOpen(false)
      setEditTarget(null)
      fetchServices()
    } catch {
      toast.error('更新服务失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteClubService(clubId, deleteTarget.id)
      toast.success('删除服务成功')
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchServices()
    } catch {
      toast.error('删除服务失败')
    }
  }

  const openEdit = (service: ClubServiceDto) => {
    setEditTarget(service)
    setEditOpen(true)
  }

  const openDelete = (service: ClubServiceDto) => {
    setDeleteTarget(service)
    setDeleteOpen(true)
  }

  if (loading) {
    return <p className='text-muted-foreground py-8 text-center'>加载中...</p>
  }

  return (
    <div className='space-y-4'>
      <div className='flex justify-end gap-2'>
        <Button variant='outline' onClick={() => setSmartImportOpen(true)}>
          <Sparkles className='h-4 w-4 mr-2' />
          智能录入
        </Button>
        <Button onClick={() => setCreateOpen(true)}>添加服务</Button>
      </div>

      {services.length === 0 ? (
        <p className='text-muted-foreground py-8 text-center'>暂无服务</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>类型</TableHead>
              <TableHead>价格信息</TableHead>
              <TableHead>排序</TableHead>
              <TableHead className='text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>{serviceTypeLabels[service.type] ?? service.type}</TableCell>
                <TableCell>{getPriceSummary(service)}</TableCell>
                <TableCell>{service.sortOrder}</TableCell>
                <TableCell className='text-right'>
                  <Button variant='ghost' size='sm' onClick={() => openEdit(service)}>
                    编辑
                  </Button>
                  <Button variant='ghost' size='sm' onClick={() => openDelete(service)}>
                    删除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>添加服务</DialogTitle>
            <DialogDescription>填写服务信息，完成后点击保存。</DialogDescription>
          </DialogHeader>
          <ServiceForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditTarget(null)
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>编辑服务</DialogTitle>
            <DialogDescription>修改服务信息，完成后点击保存。</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <ServiceForm
              initialData={toFormValues(editTarget)}
              onSubmit={handleEdit}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className='max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              你确定要删除服务{' '}
              <strong>
                {deleteTarget ? (serviceTypeLabels[deleteTarget.type] ?? deleteTarget.type) : ''}
              </strong>{' '}
              吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SmartImportModal
        clubId={clubId}
        open={smartImportOpen}
        onOpenChange={setSmartImportOpen}
        onImported={fetchServices}
        existingServices={services}
      />
    </div>
  )
}
