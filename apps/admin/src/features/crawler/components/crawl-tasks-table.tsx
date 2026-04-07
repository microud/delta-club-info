import { useState } from 'react'
import {
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Play, Power, Trash2 } from 'lucide-react'
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
import { type CrawlTask } from '../data/schema'
import { crawlTasksColumns } from './crawl-tasks-columns'

type CrawlTasksTableProps = {
  data: CrawlTask[]
  onToggle: (task: CrawlTask) => void
  onEditCron: (task: CrawlTask) => void
  onTrigger: (task: CrawlTask) => void
  onViewRuns: (task: CrawlTask) => void
  onDelete: (task: CrawlTask) => void
}

export function CrawlTasksTable({ data, onToggle, onEditCron, onTrigger, onViewRuns, onDelete }: CrawlTasksTableProps) {
  const columns = [
    ...crawlTasksColumns,
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }: { row: { original: CrawlTask } }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => onViewRuns(row.original)}>
              查看执行记录
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTrigger(row.original)}>
              <Play className='mr-2 h-4 w-4' />
              手动触发
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditCron(row.original)}>
              <Pencil className='mr-2 h-4 w-4' />
              修改 Cron
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggle(row.original)}>
              <Power className='mr-2 h-4 w-4' />
              {row.original.isActive ? '停用' : '启用'}
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-destructive focus:text-destructive'
              onClick={() => onDelete(row.original)}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  暂无爬虫任务
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
