import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeftIcon } from 'lucide-react'
import type { ClubDto } from '@delta-club/shared'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getClub, updateClub } from '@/lib/api'
import { Route } from '@/routes/_authenticated/clubs/$id/route'
import { type ClubFormValues } from '../data/schema'
import { ClubForm } from '../components/club-form'
import { ServicesTab } from './components/services-tab'
import { RulesTab } from './components/rules-tab'

export default function ClubDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [club, setClub] = useState<ClubDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchClub = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getClub(id)
      setClub(data)
    } catch {
      toast.error('获取俱乐部信息失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchClub()
  }, [fetchClub])

  const handleUpdate = async (data: ClubFormValues) => {
    try {
      setIsSubmitting(true)
      await updateClub(id, data)
      toast.success('更新成功')
      setEditOpen(false)
      fetchClub()
    } catch {
      toast.error('更新失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const editInitialData: ClubFormValues | undefined = club
    ? {
        name: club.name,
        logo: club.logo ?? '',
        description: club.description ?? '',
        wechatOfficialAccount: club.wechatOfficialAccount ?? '',
        wechatMiniProgram: club.wechatMiniProgram ?? '',
        contactInfo: club.contactInfo ?? '',
        establishedAt: club.establishedAt ?? '',
      }
    : undefined

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : !club ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>俱乐部不存在</p>
          </div>
        ) : (
          <>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex items-center gap-3'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => navigate({ to: '/clubs' })}
                >
                  <ArrowLeftIcon className='size-5' />
                </Button>
                <h2 className='text-2xl font-bold tracking-tight'>{club.name}</h2>
              </div>
              <Button variant='outline' onClick={() => setEditOpen(true)}>
                编辑信息
              </Button>
            </div>

            <Tabs defaultValue='services'>
              <TabsList>
                <TabsTrigger value='services'>服务</TabsTrigger>
                <TabsTrigger value='rules'>规则</TabsTrigger>
              </TabsList>
              <TabsContent value='services'>
                <ServicesTab clubId={id} />
              </TabsContent>
              <TabsContent value='rules'>
                <RulesTab clubId={id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </Main>

      {/* Edit club dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>编辑俱乐部</DialogTitle>
            <DialogDescription>修改俱乐部信息，完成后点击保存。</DialogDescription>
          </DialogHeader>
          {editInitialData && (
            <ClubForm
              initialData={editInitialData}
              onSubmit={handleUpdate}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
