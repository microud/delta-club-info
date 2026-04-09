import { useCallback, useEffect, useState } from 'react'
import {
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table'
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
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/lib/api'
import { type Announcement, type AnnouncementFormValues } from './data/schema'
import { announcementsColumns } from './components/columns'
import { AnnouncementsActionDialog } from './components/announcements-action-dialog'
import { AnnouncementsDeleteDialog } from './components/announcements-delete-dialog'

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [actionOpen, setActionOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAnnouncements()
      setAnnouncements(res.data as Announcement[])
    } catch {
      toast.error('获取公告列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const handleOpenCreate = () => {
    setEditTarget(null)
    setActionOpen(true)
  }

  const handleOpenEdit = (announcement: Announcement) => {
    setEditTarget(announcement)
    setActionOpen(true)
  }

  const handleSubmit = async (data: AnnouncementFormValues) => {
    try {
      setIsSubmitting(true)
      if (editTarget) {
        await updateAnnouncement(editTarget.id, data)
        toast.success('更新成功')
      } else {
        await createAnnouncement(data)
        toast.success('创建成功')
      }
      setActionOpen(false)
      setEditTarget(null)
      fetchAnnouncements()
    } catch {
      toast.error(editTarget ? '更新失败' : '创建失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAnnouncement(deleteTarget.id)
      toast.success('删除成功')
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchAnnouncements()
    } catch {
      toast.error('删除失败')
    }
  }

  const columns = [
    ...announcementsColumns,
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }: { row: { original: Announcement } }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => handleOpenEdit(row.original)}>
              <Pencil className='mr-2 h-4 w-4' />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem
              variant='destructive'
              onClick={() => { setDeleteTarget(row.original); setDeleteOpen(true) }}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const table = useReactTable({
    data: announcements,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>公告管理</h2>
            <p className='text-muted-foreground'>管理平台公告内容</p>
          </div>
          <Button onClick={handleOpenCreate}>添加公告</Button>
        </div>

        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
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
                        暂无公告
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination table={table} className='mt-auto' />
          </div>
        )}
      </Main>

      <AnnouncementsActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        editTarget={editTarget}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <AnnouncementsDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        announcementTitle={deleteTarget?.title ?? ''}
        onConfirm={handleDelete}
      />
    </>
  )
}
