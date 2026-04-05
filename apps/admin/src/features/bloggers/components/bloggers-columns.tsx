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
    accessorKey: 'platform',
    header: '平台',
    cell: ({ row }) => {
      const platform = row.getValue<string>('platform')
      return <Badge variant='outline'>{platformLabels[platform] ?? platform}</Badge>
    },
  },
  {
    accessorKey: 'externalId',
    header: '平台用户 ID',
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
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => new Date(row.getValue<string>('createdAt')).toLocaleDateString(),
  },
]
