import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getOverviewCrawlerHealth } from '@/lib/api'
import { StatCard } from './stat-card'
import { PLATFORM_LABEL } from '../lib/platform'

const STALE_HOURS = 6

function relativeTime(iso: string | null) {
  if (!iso) return '从未'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

function isStale(iso: string | null) {
  if (!iso) return true
  return Date.now() - new Date(iso).getTime() > STALE_HOURS * 3600_000
}

export function CrawlerHealthTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview', 'crawler-health'],
    queryFn: getOverviewCrawlerHealth,
  })

  if (isLoading) return <div className='text-sm text-muted-foreground'>加载中…</div>
  if (isError || !data) return <div className='text-sm text-destructive'>加载失败</div>

  const rateHighlight: 'danger' | 'warning' | undefined =
    data.successRate24h === null
      ? undefined
      : data.successRate24h < 80
        ? 'danger'
        : data.successRate24h < 95
          ? 'warning'
          : undefined

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <StatCard
          title='最近 24h 成功率'
          value={
            data.successRate24h === null ? '—' : `${data.successRate24h}%`
          }
          subtext={`${data.totalRuns24h} 次执行`}
          highlight={rateHighlight}
        />
        <StatCard
          title='平均每日新增内容'
          value={data.avgDailyCreated}
          subtext='最近 7 天均值'
        />
        <StatCard
          title='监控平台数'
          value={data.platformLastSuccess.length}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>各平台最近成功采集</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className='space-y-2 text-sm'>
            {data.platformLastSuccess.map((p) => (
              <li
                key={p.platform}
                className='flex items-center justify-between'
              >
                <span>{PLATFORM_LABEL[p.platform] ?? p.platform}</span>
                <span
                  className={
                    isStale(p.lastSuccessAt)
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }
                >
                  {relativeTime(p.lastSuccessAt)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近失败执行</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentFailed.length === 0 && (
            <div className='text-sm text-muted-foreground'>无失败记录</div>
          )}
          {data.recentFailed.length > 0 && (
            <ul className='space-y-2 text-sm'>
              {data.recentFailed.map((r) => (
                <li key={r.id} className='space-y-0.5'>
                  <div className='flex items-center justify-between'>
                    <span>
                      {PLATFORM_LABEL[r.platform ?? ''] ?? r.platform ?? '—'} ·{' '}
                      {r.taskType ?? '—'}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {new Date(r.startedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  {r.errorMessage && (
                    <div className='truncate text-xs text-destructive'>
                      {r.errorMessage}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
