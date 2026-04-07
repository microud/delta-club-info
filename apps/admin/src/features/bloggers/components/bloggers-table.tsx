import { useState } from 'react'
import {
  type PaginationState,
  type SortingState,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Power, Trash2 } from 'lucide-react'
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
import { type Blogger, type BloggerAccount, platformLabels, categoryLabels } from '../data/schema'
import { bloggersColumns } from './bloggers-columns'

type BloggersTableProps = {
  data: Blogger[]
  onToggle: (blogger: Blogger) => void
  onDelete: (blogger: Blogger) => void
  onAddAccount: (blogger: Blogger) => void
  onDeleteAccount: (account: BloggerAccount) => void
}

export function BloggersTable({ data, onToggle, onDelete, onAddAccount, onDeleteAccount }: BloggersTableProps) {
  const columns = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }: { row: { original: Blogger; getIsExpanded: () => boolean; toggleExpanded: () => void } }) => (
        <Button variant='ghost' size='icon' className='h-6 w-6' onClick={() => row.toggleExpanded()}>
          {row.getIsExpanded() ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
        </Button>
      ),
    },
    ...bloggersColumns,
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }: { row: { original: Blogger } }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => onAddAccount(row.original)}>
              <Plus className='mr-2 h-4 w-4' />
              添加账号
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggle(row.original)}>
              <Power className='mr-2 h-4 w-4' />
              {row.original.isActive ? '停用' : '启用'}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant='destructive'
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
    pageSize: 10,
  })
  const [expanded, setExpanded] = useState<ExpandedState>({})

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
        <Table className='min-w-xl'>
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
                <>
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow key={`${row.id}-expanded`}>
                      <TableCell colSpan={columns.length} className='bg-muted/50 p-4'>
                        <AccountsDetail
                          accounts={row.original.accounts}
                          onDeleteAccount={onDeleteAccount}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  暂无数据
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

function AccountsDetail({ accounts, onDeleteAccount }: { accounts: BloggerAccount[]; onDeleteAccount: (account: BloggerAccount) => void }) {
  if (accounts.length === 0) {
    return <p className='text-sm text-muted-foreground'>暂无关联账号</p>
  }

  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium'>关联账号 ({accounts.length})</p>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>平台</TableHead>
              <TableHead>平台用户 ID</TableHead>
              <TableHead>平台用户名</TableHead>
              <TableHead>采集分类</TableHead>
              <TableHead>上次采集</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <Badge variant='outline'>{platformLabels[account.platform] ?? account.platform}</Badge>
                </TableCell>
                <TableCell className='font-mono text-sm'>{account.platformUserId}</TableCell>
                <TableCell>{account.platformUsername ?? '-'}</TableCell>
                <TableCell>
                  <div className='flex gap-1'>
                    {account.crawlCategories.map((c) => (
                      <Badge key={c} variant='secondary'>{categoryLabels[c] ?? c}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {account.lastCrawledAt ? new Date(account.lastCrawledAt).toLocaleString() : '-'}
                </TableCell>
                <TableCell>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 text-destructive'
                    onClick={() => onDeleteAccount(account)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
