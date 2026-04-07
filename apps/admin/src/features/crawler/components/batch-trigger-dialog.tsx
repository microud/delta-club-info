import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { batchTriggerCrawlTasks, getBloggers, getClubs } from '@/lib/api'
import { platformLabels } from '../data/schema'

const TASK_TYPES = [
  { value: 'BLOGGER_POSTS', label: '博主抓取' },
  { value: 'KEYWORD_SEARCH', label: '关键词搜索' },
  { value: 'MP_ARTICLES', label: '公众号文章' },
]

type Blogger = {
  id: string
  name: string
  isActive: boolean
  accounts: Array<{ id: string; platform: string; platformUsername?: string }>
}

type Club = {
  id: string
  name: string
  wechatMpGhid?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTriggered: () => void
}

export function BatchTriggerDialog({ open, onOpenChange, onTriggered }: Props) {
  const [taskType, setTaskType] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [triggering, setTriggering] = useState(false)
  const [loading, setLoading] = useState(false)

  const [bloggers, setBloggers] = useState<Blogger[]>([])
  const [clubs, setClubs] = useState<Club[]>([])

  // Reset state and fetch data when dialog opens
  useEffect(() => {
    if (open) {
      setTaskType('')
      setSelectedIds(new Set())
    }
  }, [open])

  // Fetch targets when task type changes
  useEffect(() => {
    if (!taskType) return

    const fetchTargets = async () => {
      setLoading(true)
      setSelectedIds(new Set())
      try {
        if (taskType === 'BLOGGER_POSTS') {
          const data = await getBloggers()
          setBloggers((data as Blogger[]).filter((b) => b.isActive))
        } else {
          const data = await getClubs({ pageSize: 500 })
          const allClubs = ((data as unknown as { items: Club[] }).items ?? data) as Club[]
          if (taskType === 'MP_ARTICLES') {
            setClubs(allClubs.filter((c) => c.wechatMpGhid))
          } else {
            setClubs(allClubs)
          }
        }
      } catch {
        toast.error('获取目标列表失败')
      } finally {
        setLoading(false)
      }
    }
    fetchTargets()
  }, [taskType])

  const targets = taskType === 'BLOGGER_POSTS'
    ? bloggers.map((b) => ({
        id: b.id,
        name: b.name,
        detail: b.accounts.map((a) => platformLabels[a.platform] ?? a.platform).join('、'),
      }))
    : clubs.map((c) => ({
        id: c.id,
        name: c.name,
        detail: taskType === 'MP_ARTICLES' ? (c.wechatMpGhid ?? '') : '',
      }))

  const allSelected = targets.length > 0 && targets.every((t) => selectedIds.has(t.id))

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (targets.every((t) => prev.has(t.id))) {
        return new Set()
      }
      return new Set(targets.map((t) => t.id))
    })
  }, [targets])

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleTrigger = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0 || !taskType) return
    try {
      setTriggering(true)
      const result = await batchTriggerCrawlTasks(taskType, ids) as { triggeredCount: number }
      toast.success(`已触发 ${result.triggeredCount} 个爬虫任务，稍后刷新查看结果`)
      onOpenChange(false)
      setTimeout(onTriggered, 3000)
    } catch {
      toast.error('批量触发失败')
    } finally {
      setTriggering(false)
    }
  }

  const targetLabel = taskType === 'BLOGGER_POSTS' ? '博主' : '俱乐部'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>手动执行爬虫</DialogTitle>
          <DialogDescription>
            选择爬虫类型和目标，批量触发执行。
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div>
            <label className='text-sm font-medium'>爬虫类型</label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className='mt-1'>
                <SelectValue placeholder='选择爬虫类型' />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {taskType && (
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-sm font-medium'>
                  选择{targetLabel} ({selectedIds.size}/{targets.length})
                </label>
                {targets.length > 0 && (
                  <Button variant='ghost' size='sm' onClick={handleSelectAll}>
                    {allSelected ? '取消全选' : '全选'}
                  </Button>
                )}
              </div>

              {loading ? (
                <p className='text-sm text-muted-foreground py-4 text-center'>加载中...</p>
              ) : targets.length === 0 ? (
                <p className='text-sm text-muted-foreground py-4 text-center'>
                  没有可用的{targetLabel}
                </p>
              ) : (
                <div className='max-h-64 overflow-y-auto space-y-1 rounded-md border p-2'>
                  {targets.map((target) => (
                    <label
                      key={target.id}
                      className='flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent cursor-pointer'
                    >
                      <Checkbox
                        checked={selectedIds.has(target.id)}
                        onCheckedChange={() => handleToggle(target.id)}
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-medium truncate'>
                          {target.name}
                        </div>
                        {target.detail && (
                          <div className='text-xs text-muted-foreground mt-0.5'>
                            {target.detail}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={handleTrigger}
            disabled={selectedIds.size === 0 || triggering}
          >
            <Play className='mr-2 h-4 w-4' />
            {triggering ? '执行中...' : `执行 (${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
