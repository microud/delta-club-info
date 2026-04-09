import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getOverviewBusiness } from '@/lib/api'
import { StatCard } from './stat-card'

function formatYuan(n: number) {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
}

export function BusinessTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview', 'business'],
    queryFn: getOverviewBusiness,
  })

  if (isLoading) return <div className='text-sm text-muted-foreground'>加载中…</div>
  if (isError || !data) return <div className='text-sm text-destructive'>加载失败</div>

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <StatCard title='本月推广收入' value={formatYuan(data.monthRevenue)} />
        <StatCard
          title='当前推广位'
          value={data.activeOrders.length}
          subtext='个生效订单'
        />
        <StatCard title='累计推广收入' value={formatYuan(data.totalRevenue)} />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>即将到期（未来 7 天）</CardTitle>
          </CardHeader>
          <CardContent>
            {data.expiringSoon.length === 0 && (
              <div className='text-sm text-muted-foreground'>暂无到期订单</div>
            )}
            {data.expiringSoon.length > 0 && (
              <ul className='space-y-2 text-sm'>
                {data.expiringSoon.map((o) => (
                  <li key={o.id} className='flex justify-between'>
                    <span>{o.clubName ?? '（未知俱乐部）'}</span>
                    <span className='text-muted-foreground'>{o.endAt}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>当前生效推广</CardTitle>
          </CardHeader>
          <CardContent>
            {data.activeOrders.length === 0 && (
              <div className='text-sm text-muted-foreground'>暂无生效订单</div>
            )}
            {data.activeOrders.length > 0 && (
              <ul className='space-y-2 text-sm'>
                {data.activeOrders.map((o) => (
                  <li key={o.id} className='flex justify-between'>
                    <span>{o.clubName ?? '（未知俱乐部）'}</span>
                    <span className='text-muted-foreground'>
                      {formatYuan(o.dailyRate)}/日
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
