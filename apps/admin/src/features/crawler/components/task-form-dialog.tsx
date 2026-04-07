import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { createCrawlTask, updateCrawlTask, getBloggers, getClubs } from '@/lib/api'
import type { PaginatedResponse } from '@delta-club/shared'
import { platformLabels } from '../data/schema'
import type { CrawlTask } from '../data/schema'

type Blogger = {
  id: string
  name: string
  isActive: boolean
  accounts: Array<{
    id: string
    platform: string
    platformUserId: string
    platformUsername?: string
    crawlCategories: string[]
  }>
}

type Club = {
  id: string
  name: string
  wechatMpGhid?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  task?: CrawlTask | null
}

const TASK_TYPES = [
  { value: 'BLOGGER_POSTS', label: '博主抓取' },
  { value: 'KEYWORD_SEARCH', label: '关键词搜索' },
  { value: 'MP_ARTICLES', label: '公众号文章' },
]

const CATEGORIES = [
  { value: 'REVIEW', label: '评测' },
  { value: 'SENTIMENT', label: '舆情' },
]

const PLATFORMS = [
  { value: 'BILIBILI', label: 'B站' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'WECHAT_CHANNELS', label: '视频号' },
]

export function TaskFormDialog({ open, onOpenChange, onSaved, task }: Props) {
  const isEdit = !!task

  const [taskType, setTaskType] = useState('')
  const [category, setCategory] = useState('')
  const [platform, setPlatform] = useState('')
  const [targetId, setTargetId] = useState('')
  const [cronExpression, setCronExpression] = useState('0 */1 * * *')
  const [saving, setSaving] = useState(false)

  const [bloggers, setBloggers] = useState<Blogger[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)

  // Initialize form when dialog opens
  useEffect(() => {
    if (!open) return
    if (task) {
      setTaskType(task.taskType)
      setCategory(task.category)
      setPlatform(task.platform)
      setTargetId(task.targetId)
      setCronExpression(task.cronExpression)
    } else {
      setTaskType('')
      setCategory('')
      setPlatform('')
      setTargetId('')
      setCronExpression('0 */1 * * *')
    }
  }, [open, task])

  // Fetch targets when task type changes
  useEffect(() => {
    if (!taskType || !open) return

    const fetchTargets = async () => {
      setLoading(true)
      try {
        if (taskType === 'BLOGGER_POSTS') {
          const data = await getBloggers()
          setBloggers((data as Blogger[]).filter((b) => b.isActive))
        } else {
          const data = await getClubs({ pageSize: 500 })
          const allClubs = (data as PaginatedResponse<Club>).data
          setClubs(taskType === 'MP_ARTICLES' ? allClubs.filter((c) => c.wechatMpGhid) : allClubs)
        }
      } catch {
        toast.error('获取目标列表失败')
      } finally {
        setLoading(false)
      }
    }
    fetchTargets()
  }, [taskType, open])

  // For BLOGGER_POSTS: derive platform from selected account
  const selectedAccount = taskType === 'BLOGGER_POSTS'
    ? bloggers.flatMap((b) => b.accounts).find((a) => a.id === targetId)
    : null

  useEffect(() => {
    if (selectedAccount) {
      setPlatform(selectedAccount.platform)
    }
  }, [selectedAccount])

  // Build account options grouped by blogger
  const accountOptions = bloggers.flatMap((b) =>
    b.accounts.map((a) => ({
      id: a.id,
      label: `${b.name} - ${platformLabels[a.platform] ?? a.platform}${a.platformUsername ? ` (${a.platformUsername})` : ''}`,
      platform: a.platform,
    }))
  )

  const handleSave = async () => {
    const finalPlatform = taskType === 'MP_ARTICLES' ? 'WECHAT_MP' : platform
    const finalCategory = taskType === 'MP_ARTICLES' ? 'ANNOUNCEMENT' : category
    if (!taskType || !finalCategory || !finalPlatform || !targetId) {
      toast.error('请填写所有必填项')
      return
    }
    try {
      setSaving(true)
      const payload = {
        taskType,
        category: finalCategory,
        platform: finalPlatform,
        targetId,
        cronExpression: cronExpression || '0 */1 * * *',
      }
      if (isEdit) {
        await updateCrawlTask(task.id, payload)
        toast.success('任务已更新')
      } else {
        await createCrawlTask(payload)
        toast.success('任务创建成功')
      }
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error(isEdit ? '更新失败' : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑爬虫任务' : '新建爬虫任务'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改爬虫任务的配置。' : '创建一个新的定时爬虫任务。'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Task Type */}
          <div>
            <label className='text-sm font-medium'>任务类型</label>
            <Select
              value={taskType}
              onValueChange={(v) => {
                setTaskType(v)
                // Reset dependent fields when type changes (unless editing and type unchanged)
                if (!task || v !== task.taskType) {
                  setTargetId('')
                  setPlatform('')
                  setCategory('')
                }
              }}
            >
              <SelectTrigger className='mt-1'>
                <SelectValue placeholder='选择任务类型' />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target */}
          {taskType && (
            <div>
              <label className='text-sm font-medium'>
                {taskType === 'BLOGGER_POSTS' ? '博主账号' : '俱乐部'}
              </label>
              {loading ? (
                <p className='text-sm text-muted-foreground mt-1'>加载中...</p>
              ) : taskType === 'BLOGGER_POSTS' ? (
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className='mt-1'>
                    <SelectValue placeholder='选择博主账号' />
                  </SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className='mt-1'>
                    <SelectValue placeholder='选择俱乐部' />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Platform (for KEYWORD_SEARCH) */}
          {taskType === 'KEYWORD_SEARCH' && (
            <div>
              <label className='text-sm font-medium'>平台</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className='mt-1'>
                  <SelectValue placeholder='选择平台' />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Platform display for BLOGGER_POSTS (auto-derived) */}
          {taskType === 'BLOGGER_POSTS' && selectedAccount && (
            <div>
              <label className='text-sm font-medium'>平台</label>
              <p className='text-sm text-muted-foreground mt-1'>
                {platformLabels[selectedAccount.platform] ?? selectedAccount.platform}（自动匹配）
              </p>
            </div>
          )}

          {/* Category */}
          {taskType && taskType !== 'MP_ARTICLES' && (
            <div>
              <label className='text-sm font-medium'>分类</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className='mt-1'>
                  <SelectValue placeholder='选择分类' />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cron */}
          {taskType && (
            <div>
              <label className='text-sm font-medium'>Cron 表达式</label>
              <Input
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder='0 */1 * * *'
                className='mt-1'
              />
              <p className='text-xs text-muted-foreground mt-1'>
                默认每小时执行一次
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
