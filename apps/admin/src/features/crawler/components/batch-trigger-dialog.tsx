import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { batchTriggerCrawlTasks } from '@/lib/api'
import { type CrawlTask, platformLabels, categoryLabels } from '../data/schema'

const TASK_TYPES = [
  { value: 'BLOGGER_POSTS', label: '博主抓取' },
  { value: 'KEYWORD_SEARCH', label: '关键词搜索' },
  { value: 'MP_ARTICLES', label: '公众号文章' },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: CrawlTask[]
  onTriggered: () => void
}

export function BatchTriggerDialog({ open, onOpenChange, tasks, onTriggered }: Props) {
  const [taskType, setTaskType] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [triggering, setTriggering] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setTaskType('')
      setSelectedIds(new Set())
    }
  }, [open])

  // Filter active tasks by selected type
  const filteredTasks = useMemo(() => {
    if (!taskType) return []
    return tasks.filter((t) => t.taskType === taskType && t.isActive)
  }, [tasks, taskType])

  const allSelected = filteredTasks.length > 0 && filteredTasks.every((t) => selectedIds.has(t.id))

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)))
    }
  }, [allSelected, filteredTasks])

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
    if (ids.length === 0) return
    try {
      setTriggering(true)
      await batchTriggerCrawlTasks(ids)
      toast.success(`已触发 ${ids.length} 个任务，稍后刷新查看结果`)
      onOpenChange(false)
      setTimeout(onTriggered, 3000)
    } catch {
      toast.error('批量触发失败')
    } finally {
      setTriggering(false)
    }
  }

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
            <Select value={taskType} onValueChange={(v) => { setTaskType(v); setSelectedIds(new Set()) }}>
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
                  选择任务 ({selectedIds.size}/{filteredTasks.length})
                </label>
                {filteredTasks.length > 0 && (
                  <Button variant='ghost' size='sm' onClick={handleSelectAll}>
                    {allSelected ? '取消全选' : '全选'}
                  </Button>
                )}
              </div>

              {filteredTasks.length === 0 ? (
                <p className='text-sm text-muted-foreground py-4 text-center'>
                  没有该类型的活跃任务
                </p>
              ) : (
                <div className='max-h-64 overflow-y-auto space-y-1 rounded-md border p-2'>
                  {filteredTasks.map((task) => (
                    <label
                      key={task.id}
                      className='flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent cursor-pointer'
                    >
                      <Checkbox
                        checked={selectedIds.has(task.id)}
                        onCheckedChange={() => handleToggle(task.id)}
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-medium truncate'>
                          {task.targetName ?? task.targetId}
                        </div>
                        <div className='flex gap-1 mt-0.5'>
                          <Badge variant='outline' className='text-xs'>
                            {platformLabels[task.platform] ?? task.platform}
                          </Badge>
                          <Badge variant='secondary' className='text-xs'>
                            {categoryLabels[task.category] ?? task.category}
                          </Badge>
                        </div>
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
