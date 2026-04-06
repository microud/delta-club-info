import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { type Announcement, statusLabels } from '../data/schema'

export const announcementsColumns: ColumnDef<Announcement>[] = [
  {
    accessorKey: 'title',
    header: '标题',
    cell: ({ row }) => (
      <span className='font-medium'>{row.getValue('title')}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue<string>('status')
      return (
        <Badge variant={status === 'published' ? 'default' : 'secondary'}>
          {statusLabels[status] ?? status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'publishedAt',
    header: '发布时间',
    cell: ({ row }) => {
      const val = row.getValue<string | null>('publishedAt')
      return val ? new Date(val).toLocaleDateString() : '-'
    },
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => new Date(row.getValue<string>('createdAt')).toLocaleDateString(),
  },
]
