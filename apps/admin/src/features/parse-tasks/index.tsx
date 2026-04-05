import { useQuery } from '@tanstack/react-query'
import { getParseTasks } from '@/lib/api'
import { parseTasksColumns } from './components/parse-tasks-columns'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'

export default function ParseTasksPage() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['parse-tasks'],
    queryFn: () => getParseTasks(),
  })

  const table = useReactTable({
    data: tasks,
    columns: parseTasksColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Main className='space-y-4'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>消息解析</h2>
        <p className='text-muted-foreground'>
          企业微信接收的消息经 AI 解析后在此审核
        </p>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
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
                <TableCell colSpan={parseTasksColumns.length} className='h-24 text-center'>
                  暂无解析任务
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Main>
  )
}
