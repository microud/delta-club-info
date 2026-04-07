import { useState } from 'react'
import {
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table'
import { type CrawlTaskRun, runStatusLabels } from '../data/schema'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  RUNNING: 'default',
  SUCCESS: 'secondary',
  FAILED: 'destructive',
}

const runsColumns: ColumnDef<CrawlTaskRun>[] = [
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue<string>('status')
      return (
        <Badge variant={statusVariant[status] ?? 'secondary'}>
          {runStatusLabels[status] ?? status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'startedAt',
    header: '开始时间',
    cell: ({ row }) => new Date(row.getValue<string>('startedAt')).toLocaleString(),
  },
  {
    accessorKey: 'finishedAt',
    header: '完成时间',
    cell: ({ row }) => {
      const val = row.getValue<string | null>('finishedAt')
      return val ? new Date(val).toLocaleString() : '-'
    },
  },
  {
    accessorKey: 'itemsFetched',
    header: '获取数',
  },
  {
    accessorKey: 'itemsCreated',
    header: '新增数',
  },
  {
    accessorKey: 'errorMessage',
    header: '错误信息',
    cell: ({ row }) => {
      const msg = row.getValue<string | null>('errorMessage')
      return msg ? (
        <span className='text-destructive max-w-64 truncate block'>{msg}</span>
      ) : '-'
    },
  },
]

type CrawlTaskRunsProps = {
  data: CrawlTaskRun[]
}

export function CrawlTaskRuns({ data }: CrawlTaskRunsProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns: runsColumns,
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
        <Table className='min-w-2xl'>
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
                <TableCell colSpan={runsColumns.length} className='h-24 text-center'>
                  暂无执行记录
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
