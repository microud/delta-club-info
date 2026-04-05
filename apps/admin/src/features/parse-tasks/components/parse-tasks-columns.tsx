import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ParseTaskDto } from '@delta-club/shared'
import { Link } from '@tanstack/react-router'

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待解析', variant: 'outline' },
  parsing: { label: '解析中', variant: 'secondary' },
  completed: { label: '已完成', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
}

export const parseTasksColumns: ColumnDef<ParseTaskDto>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => row.original.id.slice(0, 8),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const s = statusMap[row.original.status] ?? { label: row.original.status, variant: 'outline' as const }
      return <Badge variant={s.variant}>{s.label}</Badge>
    },
  },
  {
    accessorKey: 'parsedResult',
    header: '识别俱乐部',
    cell: ({ row }) => {
      const result = row.original.parsedResult
      return result?.clubName ?? '-'
    },
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('zh-CN'),
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => (
      <Button variant='ghost' size='sm' asChild>
        <Link to='/parse-tasks/$id' params={{ id: row.original.id }}>
          查看
        </Link>
      </Button>
    ),
  },
]
