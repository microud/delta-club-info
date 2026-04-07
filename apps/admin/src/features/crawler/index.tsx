import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Plus } from 'lucide-react'
import { getCrawlTasks, getCrawlTaskRuns, updateCrawlTask, triggerCrawlTask, deleteCrawlTask } from '@/lib/api'
import { type CrawlTask, type CrawlTaskRun } from './data/schema'
import { CrawlTasksTable } from './components/crawl-tasks-table'
import { CrawlTaskRuns } from './components/crawl-task-runs'
import { BatchTriggerDialog } from './components/batch-trigger-dialog'
import { CreateTaskDialog } from './components/create-task-dialog'

export default function CrawlerPage() {
  const [tasks, setTasks] = useState<CrawlTask[]>([])
  const [runs, setRuns] = useState<CrawlTaskRun[]>([])
  const [loading, setLoading] = useState(true)
  const [runsLoading, setRunsLoading] = useState(false)

  // Edit cron dialog
  const [cronOpen, setCronOpen] = useState(false)
  const [cronTarget, setCronTarget] = useState<CrawlTask | null>(null)
  const [cronValue, setCronValue] = useState('')
  const [cronSaving, setCronSaving] = useState(false)

  // Batch trigger dialog
  const [batchOpen, setBatchOpen] = useState(false)

  // Create task dialog
  const [createOpen, setCreateOpen] = useState(false)

  // Runs view
  const [runsTaskId, setRunsTaskId] = useState<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('tasks')

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCrawlTasks()
      setTasks(data as CrawlTask[])
    } catch {
      toast.error('获取爬虫任务失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRuns = useCallback(async (taskId?: string) => {
    try {
      setRunsLoading(true)
      const data = await getCrawlTaskRuns(taskId)
      setRuns(data as CrawlTaskRun[])
    } catch {
      toast.error('获取执行记录失败')
    } finally {
      setRunsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleToggle = async (task: CrawlTask) => {
    try {
      await updateCrawlTask(task.id, { isActive: !task.isActive })
      toast.success(task.isActive ? '已停用' : '已启用')
      fetchTasks()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleEditCron = (task: CrawlTask) => {
    setCronTarget(task)
    setCronValue(task.cronExpression)
    setCronOpen(true)
  }

  const handleSaveCron = async () => {
    if (!cronTarget) return
    try {
      setCronSaving(true)
      await updateCrawlTask(cronTarget.id, { cronExpression: cronValue })
      toast.success('Cron 表达式已更新')
      setCronOpen(false)
      setCronTarget(null)
      fetchTasks()
    } catch {
      toast.error('更新失败')
    } finally {
      setCronSaving(false)
    }
  }

  const handleTrigger = async (task: CrawlTask) => {
    try {
      await triggerCrawlTask(task.id)
      toast.success('任务已触发，稍后刷新查看结果')
      setTimeout(fetchTasks, 3000)
    } catch {
      toast.error('触发失败')
    }
  }

  const handleDelete = async (task: CrawlTask) => {
    try {
      await deleteCrawlTask(task.id)
      toast.success('任务已删除')
      fetchTasks()
    } catch {
      toast.error('删除失败')
    }
  }

  const handleViewRuns = (task: CrawlTask) => {
    setRunsTaskId(task.id)
    setActiveTab('runs')
    fetchRuns(task.id)
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
            <h2 className='text-2xl font-bold tracking-tight'>爬虫管理</h2>
            <p className='text-muted-foreground'>管理爬虫任务和查看执行记录</p>
          </div>
          <div className='flex gap-2'>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              新建任务
            </Button>
            <Button variant='secondary' onClick={() => setBatchOpen(true)}>
              <Play className='mr-2 h-4 w-4' />
              手动执行
            </Button>
            <Button variant='outline' onClick={() => { fetchTasks(); if (activeTab === 'runs') fetchRuns(runsTaskId) }}>
              刷新
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value='tasks'>任务列表</TabsTrigger>
            <TabsTrigger value='runs' onClick={() => { if (runs.length === 0) fetchRuns(runsTaskId) }}>
              执行记录
            </TabsTrigger>
          </TabsList>

          <TabsContent value='tasks' className='mt-4'>
            {loading ? (
              <div className='flex flex-1 items-center justify-center py-12'>
                <p className='text-muted-foreground'>加载中...</p>
              </div>
            ) : (
              <CrawlTasksTable
                data={tasks}
                onToggle={handleToggle}
                onEditCron={handleEditCron}
                onTrigger={handleTrigger}
                onViewRuns={handleViewRuns}
                onDelete={handleDelete}
              />
            )}
          </TabsContent>

          <TabsContent value='runs' className='mt-4'>
            {runsLoading ? (
              <div className='flex flex-1 items-center justify-center py-12'>
                <p className='text-muted-foreground'>加载中...</p>
              </div>
            ) : (
              <CrawlTaskRuns data={runs} />
            )}
          </TabsContent>
        </Tabs>
      </Main>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchTasks}
      />

      {/* Batch Trigger Dialog */}
      <BatchTriggerDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onTriggered={fetchTasks}
      />

      {/* Edit Cron Dialog */}
      <Dialog open={cronOpen} onOpenChange={(open) => { setCronOpen(open); if (!open) setCronTarget(null) }}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>修改 Cron 表达式</DialogTitle>
            <DialogDescription>
              修改任务的定时执行计划。
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium'>Cron 表达式</label>
              <Input
                value={cronValue}
                onChange={(e) => setCronValue(e.target.value)}
                placeholder='例如: 0 */30 * * * *'
                className='mt-1'
              />
              <p className='text-xs text-muted-foreground mt-1'>
                支持 6 位 cron 表达式 (秒 分 时 日 月 周)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCronOpen(false)}>取消</Button>
            <Button onClick={handleSaveCron} disabled={cronSaving}>
              {cronSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
