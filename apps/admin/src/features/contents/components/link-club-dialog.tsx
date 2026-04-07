import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { getClubs, linkContentClub } from '@/lib/api'
import { type Content } from '../data/schema'

type Club = { id: string; name: string }

type LinkClubDialogProps = {
  content: Content | null
  onClose: () => void
  onSuccess: () => void
}

export function LinkClubDialog({ content, onClose, onSuccess }: LinkClubDialogProps) {
  const [clubs, setClubs] = useState<Club[]>([])
  const [search, setSearch] = useState('')
  const [selectedClubId, setSelectedClubId] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchClubs = useCallback(async (q: string) => {
    try {
      const res = await getClubs({ pageSize: 50, search: q || undefined })
      setClubs(res.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (content) {
      fetchClubs('')
      setSelectedClubId(content.clubId ?? '')
      setSearch('')
    }
  }, [content, fetchClubs])

  const handleSearch = (value: string) => {
    setSearch(value)
    fetchClubs(value)
  }

  const handleSubmit = async () => {
    if (!content || !selectedClubId) return
    try {
      setSubmitting(true)
      await linkContentClub(content.id, selectedClubId)
      toast.success('关联俱乐部成功')
      onSuccess()
    } catch {
      toast.error('关联俱乐部失败')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedClub = clubs.find((c) => c.id === selectedClubId)

  return (
    <Dialog open={!!content} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>关联俱乐部</DialogTitle>
          <DialogDescription>
            为「{content?.title}」选择关联的俱乐部
          </DialogDescription>
        </DialogHeader>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className='w-full justify-between'
            >
              {selectedClub ? selectedClub.name : '选择俱乐部...'}
              <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
            <Command shouldFilter={false}>
              <CommandInput
                placeholder='搜索俱乐部...'
                value={search}
                onValueChange={handleSearch}
              />
              <CommandList>
                <CommandEmpty>未找到俱乐部</CommandEmpty>
                <CommandGroup>
                  {clubs.map((club) => (
                    <CommandItem
                      key={club.id}
                      value={club.id}
                      onSelect={(val) => {
                        setSelectedClubId(val === selectedClubId ? '' : val)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedClubId === club.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {club.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedClubId || submitting}>
            {submitting ? '提交中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
