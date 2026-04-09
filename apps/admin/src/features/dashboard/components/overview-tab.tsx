import { useQuery } from '@tanstack/react-query'
import { Building2, FileText, UserSearch, Megaphone } from 'lucide-react'
import { getOverviewSummary } from '@/lib/api'
import { StatCard } from './stat-card'

export function OverviewTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview', 'summary'],
    queryFn: getOverviewSummary,
  })

  if (isLoading) {
    return <div className='text-sm text-muted-foreground'>加载中…</div>
  }
  if (isError || !data) {
    return <div className='text-sm text-destructive'>加载失败</div>
  }

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <StatCard
        title='俱乐部总数'
        value={data.clubs.total}
        subtext={`运营中 ${data.clubs.published} / 倒闭 ${data.clubs.closed}`}
        icon={<Building2 />}
      />
      <StatCard
        title='内容总数'
        value={data.contents.total}
        subtext={`最近 7 天新增 +${data.contents.last7dNew}`}
        icon={<FileText />}
      />
      <StatCard
        title='博主总数'
        value={data.bloggers.total}
        subtext={`${data.bloggers.accountTotal} 个平台账号`}
        icon={<UserSearch />}
      />
      <StatCard
        title='生效推广'
        value={data.promotions.activeCount}
        subtext={`日均 ¥${data.promotions.activeDailyRateSum.toFixed(2)}`}
        icon={<Megaphone />}
      />
    </div>
  )
}
