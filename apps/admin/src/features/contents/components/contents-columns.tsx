import { type ColumnDef } from '@tanstack/react-table'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type Content, platformLabels, contentTypeLabels, categoryLabels } from '../data/schema'

export const contentsBaseColumns: ColumnDef<Content>[] = [
  {
    accessorKey: 'title',
    header: '标题',
    cell: ({ row }) => {
      const url = row.original.externalUrl
      const title = row.getValue<string>('title')
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {url ? (
              <a
                href={url}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1 font-medium hover:underline max-w-xs'
              >
                <span className='truncate'>{title}</span>
                <ExternalLink className='h-3 w-3 shrink-0' />
              </a>
            ) : (
              <span className='block font-medium max-w-xs truncate'>{title}</span>
            )}
          </TooltipTrigger>
          <TooltipContent side='bottom' className='max-w-sm'>
            <p>{title}</p>
          </TooltipContent>
        </Tooltip>
      )
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
    accessorKey: 'contentType',
    header: '类型',
    cell: ({ row }) => {
      const t = row.getValue<string>('contentType')
      return <Badge variant='outline'>{contentTypeLabels[t] ?? t}</Badge>
    },
  },
  {
    accessorKey: 'category',
    header: '分类',
    cell: ({ row }) => {
      const c = row.getValue<string>('category')
      return (
        <Badge variant={c === 'REVIEW' ? 'default' : c === 'SENTIMENT' ? 'secondary' : 'outline'}>
          {categoryLabels[c] ?? c}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'authorName',
    header: '作者',
    cell: ({ row }) => row.original.authorName ?? '-',
  },
  {
    accessorKey: 'clubName',
    header: '关联俱乐部',
    cell: ({ row }) => row.original.clubName ?? '-',
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
    cell: ({ row }) => {
      const val = row.getValue<string | null>('publishedAt')
      return val ? new Date(val).toLocaleDateString() : '-'
    },
  },
]
