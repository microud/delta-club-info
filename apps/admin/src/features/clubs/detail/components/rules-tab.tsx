import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ClubRuleDto } from '@delta-club/shared'
import { Button } from '@/components/ui/button'
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
  getClubRules,
  createClubRule,
  updateClubRule,
  deleteClubRule,
} from '@/lib/api'
import {
  sentimentLabels,
  sentimentColors,
  type RuleFormValues,
} from '../../data/rule-schema'
import { RuleForm } from './rule-form'

type RulesTabProps = {
  clubId: string
}

export function RulesTab({ clubId }: RulesTabProps) {
  const [rules, setRules] = useState<ClubRuleDto[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClubRuleDto | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClubRuleDto | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getClubRules(clubId)
      setRules(data)
    } catch {
      toast.error('获取规则列表失败')
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleCreate = async (data: RuleFormValues) => {
    try {
      setIsSubmitting(true)
      await createClubRule(clubId, data)
      toast.success('创建规则成功')
      setCreateOpen(false)
      fetchRules()
    } catch {
      toast.error('创建规则失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (data: RuleFormValues) => {
    if (!editTarget) return
    try {
      setIsSubmitting(true)
      await updateClubRule(clubId, editTarget.id, data)
      toast.success('更新规则成功')
      setEditOpen(false)
      setEditTarget(null)
      fetchRules()
    } catch {
      toast.error('更新规则失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteClubRule(clubId, deleteTarget.id)
      toast.success('删除规则成功')
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchRules()
    } catch {
      toast.error('删除规则失败')
    }
  }

  const openEdit = (rule: ClubRuleDto) => {
    setEditTarget(rule)
    setEditOpen(true)
  }

  const openDelete = (rule: ClubRuleDto) => {
    setDeleteTarget(rule)
    setDeleteOpen(true)
  }

  if (loading) {
    return <p className='text-muted-foreground py-8 text-center'>加载中...</p>
  }

  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <Button onClick={() => setCreateOpen(true)}>添加规则</Button>
      </div>

      {rules.length === 0 ? (
        <p className='text-muted-foreground py-8 text-center'>暂无规则</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>内容</TableHead>
              <TableHead>倾向性</TableHead>
              <TableHead className='text-right'>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className='max-w-md'>
                  <p className='line-clamp-2'>{rule.content}</p>
                </TableCell>
                <TableCell>
                  <span className={sentimentColors[rule.sentiment] ?? 'text-muted-foreground'}>
                    {sentimentLabels[rule.sentiment] ?? rule.sentiment}
                  </span>
                </TableCell>
                <TableCell className='text-right'>
                  <Button variant='ghost' size='sm' onClick={() => openEdit(rule)}>
                    编辑
                  </Button>
                  <Button variant='ghost' size='sm' onClick={() => openDelete(rule)}>
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
            <DialogTitle>添加规则</DialogTitle>
            <DialogDescription>填写规则内容，完成后点击保存。</DialogDescription>
          </DialogHeader>
          <RuleForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
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
            <DialogTitle>编辑规则</DialogTitle>
            <DialogDescription>修改规则内容，完成后点击保存。</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <RuleForm
              initialData={{
                content: editTarget.content,
                sentiment: editTarget.sentiment,
              }}
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
              你确定要删除此规则吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
