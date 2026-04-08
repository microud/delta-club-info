import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getOverviewDataQuality } from '@/lib/api'
import { StatCard } from './stat-card'

export function DataQualityTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['overview', 'data-quality'],
    queryFn: getOverviewDataQuality,
  })

  if (isLoading) return <div className='text-sm text-muted-foreground'>加载中…</div>
  if (isError || !data) return <div className='text-sm text-red-500'>加载失败</div>

  const items: Array<{ title: string; value: number; to: string }> = [
    { title: '缺失工商信息的俱乐部', value: data.missingBusinessInfo, to: '/clubs' },
    { title: '没有服务项的俱乐部', value: data.missingServices, to: '/clubs' },
    { title: '没有规则的俱乐部', value: data.missingRules, to: '/clubs' },
    { title: '孤岛俱乐部（无内容）', value: data.orphanClubs, to: '/clubs' },
  ]

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {items.map((it) => (
        <Link key={it.title} to={it.to} className='block'>
          <StatCard
            title={it.title}
            value={it.value}
            highlight={it.value > 0 ? 'warning' : undefined}
          />
        </Link>
      ))}
    </div>
  )
}
