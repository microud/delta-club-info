import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { type CrawlTask, taskTypeLabels, taskStatusLabels } from '../data/schema'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  RUNNING: 'default',
  SUCCESS: 'secondary',
  FAILED: 'destructive',
}

export const crawlTasksColumns: ColumnDef<CrawlTask>[] = [
  {
    accessorKey: 'type',
    header: '类型',
    cell: ({ row }) => {
      const type = row.getValue<string>('type')
      return <Badge variant='outline'>{taskTypeLabels[type] ?? type}</Badge>
    },
  },
  {
    accessorKey: 'targetId',
    header: '目标',
    cell: ({ row }) => (
      <span className='max-w-48 truncate'>{row.getValue<string>('targetId')}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue<string>('status')
      return (
        <Badge variant={statusVariant[status] ?? 'secondary'}>
          {taskStatusLabels[status] ?? status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'videoCount',
    header: '新视频数',
  },
  {
    accessorKey: 'startedAt',
    header: '开始时间',
    cell: ({ row }) => new Date(row.getValue<string>('startedAt')).toLocaleString(),
  },
  {
    accessorKey: 'finishedAt',
    header: '完成时间',
    cell: ({ row }) => {
      const val = row.getValue<string | null>('finishedAt')
      return val ? new Date(val).toLocaleString() : '—'
    },
  },
  {
    accessorKey: 'errorMessage',
    header: '错误信息',
    cell: ({ row }) => {
      const msg = row.getValue<string | null>('errorMessage')
      return msg ? (
        <span className='text-destructive max-w-48 truncate'>{msg}</span>
      ) : '—'
    },
  },
]
