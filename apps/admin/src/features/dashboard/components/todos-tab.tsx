import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, MessageSquareWarning, Bot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getOverviewTodos,
  getRecentContents,
  type RecentContentItem,
} from '@/lib/api'
import { PLATFORM_LABEL } from '../lib/platform'

function TodoItem({
  icon,
  label,
  count,
  to,
}: {
  icon: React.ReactNode
  label: string
  count: number
  to: string
}) {
  const danger = count > 0
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent ${
        danger ? 'border-destructive/50' : ''
      }`}
    >
      <div className='flex items-center gap-2'>
        <span className={danger ? 'text-destructive' : 'text-muted-foreground'}>
          {icon}
        </span>
        <span className='text-sm'>{label}</span>
      </div>
      <span className={`text-lg font-bold ${danger ? 'text-destructive' : ''}`}>
        {count}
      </span>
    </Link>
  )
}

export function TodosTab() {
  const todos = useQuery({
    queryKey: ['overview', 'todos'],
    queryFn: getOverviewTodos,
  })
  const recent = useQuery({
    queryKey: ['overview', 'recent-contents'],
    queryFn: () => getRecentContents(10),
  })

  return (
    <div className='grid gap-4 lg:grid-cols-7'>
      <Card className='lg:col-span-3'>
        <CardHeader>
          <CardTitle>待处理事项</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {todos.isLoading && (
            <div className='text-sm text-muted-foreground'>加载中…</div>
          )}
          {todos.data && (
            <>
              <TodoItem
                icon={<MessageSquareWarning className='h-4 w-4' />}
                label='待审核评论'
                count={todos.data.pendingReviewComments}
                to='/'
              />
              <TodoItem
                icon={<AlertTriangle className='h-4 w-4' />}
                label='最近 24h 失败的爬虫执行'
                count={todos.data.failedCrawlLast24h}
                to='/crawler'
              />
              <TodoItem
                icon={<Bot className='h-4 w-4' />}
                label='待/失败 AI 解析内容'
                count={todos.data.aiParseFailedContents}
                to='/videos'
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card className='lg:col-span-4'>
        <CardHeader>
          <CardTitle>最近爬虫新增内容</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.isLoading && (
            <div className='text-sm text-muted-foreground'>加载中…</div>
          )}
          {recent.data && recent.data.length === 0 && (
            <div className='text-sm text-muted-foreground'>暂无数据</div>
          )}
          {recent.data && recent.data.length > 0 && (
            <ul className='space-y-2'>
              {recent.data.map((c: RecentContentItem) => (
                <li
                  key={c.id}
                  className='flex items-center gap-2 text-sm'
                >
                  <span className='shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs'>
                    {PLATFORM_LABEL[c.platform] ?? c.platform}
                  </span>
                  <span className='flex-1 truncate' title={c.title}>
                    {c.title}
                  </span>
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    {c.authorName ?? '—'}
                  </span>
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    {new Date(c.createdAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
