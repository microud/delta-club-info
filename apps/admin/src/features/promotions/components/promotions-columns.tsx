import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { type Promotion } from '../data/schema'

function isCurrentlyActive(startAt: string, endAt: string): boolean {
  const now = new Date()
  const start = new Date(startAt)
  const end = new Date(endAt)
  return now >= start && now <= end
}

export const promotionsColumns: ColumnDef<Promotion>[] = [
  {
    accessorKey: 'clubName',
    header: '俱乐部',
    cell: ({ row }) => (
      <span className='font-medium'>
        {row.getValue('clubName') || row.original.clubId}
      </span>
    ),
  },
  {
    accessorKey: 'fee',
    header: '费用',
    cell: ({ row }) => {
      const fee = row.getValue<string>('fee')
      return `¥${Number(fee).toFixed(2)}`
    },
  },
  {
    accessorKey: 'dailyRate',
    header: '日均费率',
    cell: ({ row }) => {
      const dailyRate = row.getValue<string>('dailyRate')
      return `¥${Number(dailyRate).toFixed(2)}`
    },
  },
  {
    accessorKey: 'startAt',
    header: '开始日期',
    cell: ({ row }) => {
      const date = row.getValue<string>('startAt')
      return new Date(date).toLocaleDateString()
    },
  },
  {
    accessorKey: 'endAt',
    header: '结束日期',
    cell: ({ row }) => {
      const date = row.getValue<string>('endAt')
      return new Date(date).toLocaleDateString()
    },
  },
  {
    id: 'status',
    header: '状态',
    cell: ({ row }) => {
      const active = isCurrentlyActive(row.original.startAt, row.original.endAt)
      return (
        <Badge variant={active ? 'default' : 'secondary'}>
          {active ? '生效中' : '未生效'}
        </Badge>
      )
    },
  },
]
