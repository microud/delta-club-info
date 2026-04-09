import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus } from 'lucide-react'
import { getCrawlTasks, getCrawlTaskRuns, updateCrawlTask, triggerCrawlTask, deleteCrawlTask } from '@/lib/api'
import { type CrawlTask, type CrawlTaskRun } from './data/schema'
import { CrawlTasksTable } from './components/crawl-tasks-table'
import { CrawlTaskRuns } from './components/crawl-task-runs'
import { TaskFormDialog } from './components/task-form-dialog'

export default function CrawlerPage() {
  const [tasks, setTasks] = useState<CrawlTask[]>([])
  const [runs, setRuns] = useState<CrawlTaskRun[]>([])
  const [loading, setLoading] = useState(true)
  const [runsLoading, setRunsLoading] = useState(false)

  // Task form dialog (create / edit)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<CrawlTask | null>(null)

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
      setRuns(data)
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

  const handleEdit = (task: CrawlTask) => {
    setEditingTask(task)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditingTask(null)
    setFormOpen(true)
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
            <Button onClick={handleCreate}>
              <Plus className='mr-2 h-4 w-4' />
              新建任务
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
                onEdit={handleEdit}
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

      {/* Task Form Dialog (create / edit) */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingTask(null) }}
        onSaved={fetchTasks}
        task={editingTask}
      />
    </>
  )
}
