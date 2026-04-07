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
import { createCrawlTask, getBloggers, getClubs } from '@/lib/api'
import { platformLabels } from '../data/schema'

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
  onCreated: () => void
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

export function CreateTaskDialog({ open, onOpenChange, onCreated }: Props) {
  const [taskType, setTaskType] = useState('')
  const [category, setCategory] = useState('')
  const [platform, setPlatform] = useState('')
  const [targetId, setTargetId] = useState('')
  const [cronExpression, setCronExpression] = useState('0 */1 * * *')
  const [saving, setSaving] = useState(false)

  const [bloggers, setBloggers] = useState<Blogger[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setTaskType('')
      setCategory('')
      setPlatform('')
      setTargetId('')
      setCronExpression('0 */1 * * *')
    }
  }, [open])

  // Fetch targets when task type changes
  useEffect(() => {
    if (!taskType) return
    setTargetId('')
    setPlatform('')
    setCategory('')

    const fetchTargets = async () => {
      setLoading(true)
      try {
        if (taskType === 'BLOGGER_POSTS') {
          const data = await getBloggers()
          setBloggers((data as Blogger[]).filter((b) => b.isActive))
        } else {
          const data = await getClubs({ pageSize: 500 })
          const allClubs = ((data as unknown as { items: Club[] }).items ?? data) as Club[]
          setClubs(taskType === 'MP_ARTICLES' ? allClubs.filter((c) => c.wechatMpGhid) : allClubs)
        }
      } catch {
        toast.error('获取目标列表失败')
      } finally {
        setLoading(false)
      }
    }
    fetchTargets()
  }, [taskType])

  // For BLOGGER_POSTS, derive available platforms and categories from selected blogger's accounts
  const selectedBlogger = taskType === 'BLOGGER_POSTS'
    ? bloggers.find((b) => b.accounts.some((a) => a.id === targetId))
    : null
  const selectedAccount = selectedBlogger?.accounts.find((a) => a.id === targetId)

  // Build account options: grouped by blogger
  const accountOptions = bloggers.flatMap((b) =>
    b.accounts.map((a) => ({
      id: a.id,
      label: `${b.name} - ${platformLabels[a.platform] ?? a.platform}${a.platformUsername ? ` (${a.platformUsername})` : ''}`,
      platform: a.platform,
      crawlCategories: a.crawlCategories,
    }))
  )

  // When account is selected, auto-set platform
  useEffect(() => {
    if (selectedAccount) {
      setPlatform(selectedAccount.platform)
    }
  }, [selectedAccount])

  const handleSave = async () => {
    const finalPlatform = taskType === 'MP_ARTICLES' ? 'WECHAT_MP' : platform
    const finalCategory = taskType === 'MP_ARTICLES' ? 'ANNOUNCEMENT' : category
    if (!taskType || !finalCategory || !finalPlatform || !targetId) {
      toast.error('请填写所有必填项')
      return
    }
    try {
      setSaving(true)
      await createCrawlTask({
        taskType,
        category: finalCategory,
        platform: finalPlatform,
        targetId,
        cronExpression: cronExpression || undefined,
      })
      toast.success('爬虫任务创建成功')
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error('创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>新建爬虫任务</DialogTitle>
          <DialogDescription>
            创建一个新的定时爬虫任务。
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Task Type */}
          <div>
            <label className='text-sm font-medium'>任务类型</label>
            <Select value={taskType} onValueChange={setTaskType}>
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

          {/* Platform (for non-blogger types) */}
          {taskType && taskType !== 'BLOGGER_POSTS' && taskType !== 'MP_ARTICLES' && (
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
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '创建中...' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
