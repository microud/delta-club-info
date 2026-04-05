import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getVideos } from '@/lib/api'
import { type Video } from './data/schema'
import { VideosTable } from './components/videos-table'

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<string>('')
  const [category, setCategory] = useState<string>('')

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (platform) params.platform = platform
      if (category) params.category = category
      const data = await getVideos(params)
      setVideos(data as Video[])
    } catch {
      toast.error('获取视频列表失败')
    } finally {
      setLoading(false)
    }
  }, [platform, category])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

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
            <h2 className='text-2xl font-bold tracking-tight'>视频列表</h2>
            <p className='text-muted-foreground'>查看爬虫抓取的视频数据</p>
          </div>
          <div className='flex gap-2'>
            <Select value={platform} onValueChange={(v) => setPlatform(v === 'all' ? '' : v)}>
              <SelectTrigger className='w-28'>
                <SelectValue placeholder='平台' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部平台</SelectItem>
                <SelectItem value='BILIBILI'>B站</SelectItem>
                <SelectItem value='DOUYIN'>抖音</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
              <SelectTrigger className='w-28'>
                <SelectValue placeholder='分类' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部分类</SelectItem>
                <SelectItem value='REVIEW'>评测</SelectItem>
                <SelectItem value='SENTIMENT'>舆情</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <VideosTable data={videos} />
        )}
      </Main>
    </>
  )
}
