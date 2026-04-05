import { type ColumnDef } from '@tanstack/react-table'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { type Video, platformLabels, categoryLabels } from '../data/schema'

export const videosColumns: ColumnDef<Video>[] = [
  {
    accessorKey: 'title',
    header: '标题',
    cell: ({ row }) => (
      <a
        href={row.original.videoUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='flex items-center gap-1 font-medium hover:underline max-w-xs truncate'
      >
        {row.getValue<string>('title')}
        <ExternalLink className='h-3 w-3 shrink-0' />
      </a>
    ),
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
    accessorKey: 'category',
    header: '分类',
    cell: ({ row }) => {
      const c = row.getValue<string>('category')
      return (
        <Badge variant={c === 'REVIEW' ? 'default' : 'secondary'}>
          {categoryLabels[c] ?? c}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'authorName',
    header: '作者',
  },
  {
    accessorKey: 'clubName',
    header: '关联俱乐部',
    cell: ({ row }) => row.original.clubName ?? '—',
  },
  {
    accessorKey: 'aiParsed',
    header: 'AI 解析',
    cell: ({ row }) => (
      <Badge variant={row.getValue<boolean>('aiParsed') ? 'default' : 'secondary'}>
        {row.getValue<boolean>('aiParsed') ? '已解析' : '未解析'}
      </Badge>
    ),
  },
  {
    accessorKey: 'publishedAt',
    header: '发布时间',
    cell: ({ row }) => new Date(row.getValue<string>('publishedAt')).toLocaleDateString(),
  },
]
