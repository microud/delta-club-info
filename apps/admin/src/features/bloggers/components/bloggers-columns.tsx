import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { type Blogger, platformLabels } from '../data/schema'

export const bloggersColumns: ColumnDef<Blogger>[] = [
  {
    accessorKey: 'name',
    header: '博主名称',
    cell: ({ row }) => (
      <span className='font-medium'>{row.getValue('name')}</span>
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
    id: 'accountCount',
    header: '账号数',
    cell: ({ row }) => row.original.accounts.length,
  },
  {
    id: 'platforms',
    header: '平台',
    cell: ({ row }) => {
      const platforms = [...new Set(row.original.accounts.map((a) => a.platform))]
      if (platforms.length === 0) return <span className='text-muted-foreground'>-</span>
      return (
        <div className='flex gap-1 flex-wrap'>
          {platforms.map((p) => (
            <Badge key={p} variant='outline'>{platformLabels[p] ?? p}</Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => new Date(row.getValue<string>('createdAt')).toLocaleDateString(),
  },
]
