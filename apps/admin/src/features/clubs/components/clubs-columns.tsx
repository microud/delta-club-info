import { type ColumnDef } from '@tanstack/react-table'
import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table'
import { type Club, clubStatusLabels } from '../data/schema'

const statusVariantMap: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'secondary',
  published: 'default',
  closed: 'destructive',
  archived: 'outline',
}

export function getClubsColumns(options: {
  onEdit: (club: Club) => void
}): ColumnDef<Club>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='名称' />
      ),
      cell: ({ row }) => (
        <span className='font-medium'>{row.getValue('name')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='状态' />
      ),
      cell: ({ row }) => {
        const status = row.getValue<string>('status')
        return (
          <Badge variant={statusVariantMap[status] ?? 'secondary'}>
            {clubStatusLabels[status] ?? status}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'establishedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='成立时间' />
      ),
      cell: ({ row }) => {
        const date = row.getValue<string | null>('establishedAt')
        return date ? new Date(date).toLocaleDateString() : '-'
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='创建时间' />
      ),
      cell: ({ row }) => {
        const date = row.getValue<string>('createdAt')
        return new Date(date).toLocaleDateString()
      },
    },
    {
      id: 'actions',
      header: '操作',
      meta: { className: 'w-16' },
      cell: ({ row }) => (
        <Button
          variant='ghost'
          size='icon'
          onClick={(e) => {
            e.stopPropagation()
            options.onEdit(row.original)
          }}
        >
          <Pencil className='h-4 w-4' />
        </Button>
      ),
    },
  ]
}
