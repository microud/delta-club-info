import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { type CrawlTask, taskTypeLabels, platformLabels, categoryLabels } from '../data/schema'

export const crawlTasksColumns: ColumnDef<CrawlTask>[] = [
  {
    accessorKey: 'taskType',
    header: '类型',
    cell: ({ row }) => {
      const type = row.getValue<string>('taskType')
      return <Badge variant='outline'>{taskTypeLabels[type] ?? type}</Badge>
    },
  },
  {
    accessorKey: 'category',
    header: '分类',
    cell: ({ row }) => {
      const c = row.getValue<string>('category')
      return <Badge variant='secondary'>{categoryLabels[c] ?? c}</Badge>
    },
  },
  {
    accessorKey: 'platform',
    header: '平台',
    cell: ({ row }) => {
      const p = row.getValue<string>('platform')
      return <Badge variant='outline'>{platformLabels[p] ?? p}</Badge>
    },
  },
  {
    accessorKey: 'targetName',
    header: '目标',
    cell: ({ row }) => {
      const name = row.getValue<string | null>('targetName')
      const id = row.original.targetId
      return (
        <div className='max-w-48 truncate'>
          {name ? (
            <span className='text-sm'>{name}</span>
          ) : (
            <span className='font-mono text-sm text-muted-foreground'>{id}</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'cronExpression',
    header: 'Cron 表达式',
    cell: ({ row }) => (
      <code className='text-sm'>{row.getValue<string>('cronExpression')}</code>
    ),
  },
  {
    accessorKey: 'isActive',
    header: '状态',
    cell: ({ row }) => {
      const active = row.getValue<boolean>('isActive')
      return (
        <Badge variant={active ? 'default' : 'secondary'}>
          {active ? '启用' : '停用'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'lastRunAt',
    header: '上次执行',
    cell: ({ row }) => {
      const val = row.getValue<string | null>('lastRunAt')
      return val ? new Date(val).toLocaleString() : '-'
    },
  },
]
