import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { getCrawlTasks, triggerCrawl } from '@/lib/api'
import { type CrawlTask } from './data/schema'
import { CrawlTasksTable } from './components/crawl-tasks-table'
import { FrequencyConfig } from './components/frequency-config'

export default function CrawlerPage() {
  const [tasks, setTasks] = useState<CrawlTask[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCrawlTasks()
      setTasks(data as CrawlTask[])
    } catch {
      toast.error('获取爬虫记录失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleTrigger = async () => {
    try {
      setTriggering(true)
      await triggerCrawl()
      toast.success('爬虫已触发，稍后刷新查看结果')
      setTimeout(fetchTasks, 3000)
    } catch {
      toast.error('触发失败')
    } finally {
      setTriggering(false)
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
            <h2 className='text-2xl font-bold tracking-tight'>爬虫管理</h2>
            <p className='text-muted-foreground'>查看爬虫执行记录，管理抓取频率</p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={fetchTasks}>刷新</Button>
            <Button onClick={handleTrigger} disabled={triggering}>
              {triggering ? '触发中...' : '手动触发'}
            </Button>
          </div>
        </div>

        <FrequencyConfig />

        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <CrawlTasksTable data={tasks} />
        )}
      </Main>
    </>
  )
}
