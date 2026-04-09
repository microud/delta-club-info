import { Fragment, useCallback, useMemo, useState } from 'react'
import {
  type PaginationState,
  type SortingState,
  type ExpandedState,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, ChevronRight, ExternalLink, Link2, MoreHorizontal, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { type Content, platformLabels, contentTypeLabels, categoryLabels } from '../data/schema'
import { contentsBaseColumns } from './contents-columns'
import { LinkClubDialog } from './link-club-dialog'

type ContentsTableProps = {
  data: Content[]
  onRefresh?: () => void
}

const sentimentLabels: Record<string, string> = {
  POSITIVE: '正面',
  NEGATIVE: '负面',
  NEUTRAL: '中性',
}

export function ContentsTable({ data, onRefresh }: ContentsTableProps) {
  const [linkClubContent, setLinkClubContent] = useState<Content | null>(null)
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const handleOpenLinkClub = useCallback((content: Content) => {
    setLinkClubContent(content)
  }, [])

  const columns = useMemo<ColumnDef<Content>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        cell: ({ row }) => (
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={() => row.toggleExpanded()}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronRight className='h-4 w-4' />
            )}
          </Button>
        ),
      },
      ...contentsBaseColumns,
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon'>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => handleOpenLinkClub(row.original)}>
                <Link2 className='mr-2 h-4 w-4' />
                关联俱乐部
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Sparkles className='mr-2 h-4 w-4' />
                AI 解析
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleOpenLinkClub]
  )

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination, expanded },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='overflow-hidden rounded-md border'>
        <Table className='min-w-3xl'>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className='bg-muted/50 p-4'>
                        <ContentDetail content={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  暂无内容
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />

      <LinkClubDialog
        content={linkClubContent}
        onClose={() => setLinkClubContent(null)}
        onSuccess={() => {
          setLinkClubContent(null)
          onRefresh?.()
        }}
      />
    </div>
  )
}

function proxyImageUrl(url: string) {
  return `/proxy/image?url=${encodeURIComponent(url)}`
}

function ContentDetail({ content }: { content: Content }) {
  return (
    <div className='flex gap-4'>
      {content.coverUrl && (
        <img
          src={proxyImageUrl(content.coverUrl)}
          alt={content.title}
          className='h-28 w-auto rounded-md object-cover shrink-0'
        />
      )}
      <div className='flex flex-1 flex-col gap-2 min-w-0'>
        <div className='flex items-center gap-2'>
          <h4 className='font-medium text-sm'>{content.title}</h4>
          {content.externalUrl && (
            <a
              href={content.externalUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='text-muted-foreground hover:text-foreground'
            >
              <ExternalLink className='h-3.5 w-3.5' />
            </a>
          )}
        </div>

        {content.description && (
          <p className='text-sm text-muted-foreground whitespace-pre-line line-clamp-4'>
            {content.description}
          </p>
        )}

        <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
          <Badge variant='outline' className='text-xs'>{platformLabels[content.platform] ?? content.platform}</Badge>
          <Badge variant='outline' className='text-xs'>{contentTypeLabels[content.contentType] ?? content.contentType}</Badge>
          <Badge variant={content.category === 'REVIEW' ? 'default' : content.category === 'SENTIMENT' ? 'secondary' : 'outline'} className='text-xs'>
            {categoryLabels[content.category] ?? content.category}
          </Badge>
          {content.authorName && <span>作者: {content.authorName}</span>}
          {content.clubName && <span>俱乐部: {content.clubName}</span>}
          {content.publishedAt && <span>发布: {new Date(content.publishedAt).toLocaleString()}</span>}
        </div>

        {(content.aiSummary || content.aiSentiment || content.aiClubMatch) && (
          <div className='mt-1 rounded-md border border-dashed p-2 text-xs space-y-1'>
            <p className='font-medium text-muted-foreground'>AI 解析结果</p>
            {content.aiClubMatch && <p>匹配俱乐部: {content.aiClubMatch}</p>}
            {content.aiSentiment && <p>情感倾向: {sentimentLabels[content.aiSentiment] ?? content.aiSentiment}</p>}
            {content.aiSummary && <p className='text-muted-foreground'>{content.aiSummary}</p>}
          </div>
        )}

        {content.groupPlatforms && content.groupPlatforms.length > 1 && (
          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
            <span>跨平台:</span>
            {content.groupPlatforms.map((p) => (
              <Badge key={p} variant='outline' className='text-xs'>
                {platformLabels[p] ?? p}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
