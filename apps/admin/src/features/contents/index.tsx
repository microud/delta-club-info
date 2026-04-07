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
import { getContents } from '@/lib/api'
import { type Content } from './data/schema'
import { ContentsTable } from './components/contents-table'

export default function ContentsPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<string>('')
  const [contentType, setContentType] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [aiParsed, setAiParsed] = useState<string>('')

  const fetchContents = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (platform) params.platform = platform
      if (contentType) params.contentType = contentType
      if (category) params.category = category
      if (aiParsed) params.aiParsed = aiParsed
      const data = await getContents(params)
      setContents(data as Content[])
    } catch {
      toast.error('获取内容列表失败')
    } finally {
      setLoading(false)
    }
  }, [platform, contentType, category, aiParsed])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

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
            <h2 className='text-2xl font-bold tracking-tight'>内容管理</h2>
            <p className='text-muted-foreground'>查看和管理爬虫抓取的内容数据</p>
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
                <SelectItem value='XIAOHONGSHU'>小红书</SelectItem>
                <SelectItem value='WECHAT_CHANNELS'>视频号</SelectItem>
                <SelectItem value='WECHAT_MP'>公众号</SelectItem>
              </SelectContent>
            </Select>
            <Select value={contentType} onValueChange={(v) => setContentType(v === 'all' ? '' : v)}>
              <SelectTrigger className='w-28'>
                <SelectValue placeholder='类型' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部类型</SelectItem>
                <SelectItem value='VIDEO'>视频</SelectItem>
                <SelectItem value='NOTE'>笔记</SelectItem>
                <SelectItem value='ARTICLE'>文章</SelectItem>
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
                <SelectItem value='ANNOUNCEMENT'>公告</SelectItem>
              </SelectContent>
            </Select>
            <Select value={aiParsed} onValueChange={(v) => setAiParsed(v === 'all' ? '' : v)}>
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='AI 解析' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部</SelectItem>
                <SelectItem value='true'>已解析</SelectItem>
                <SelectItem value='false'>未解析</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className='flex flex-1 items-center justify-center'>
            <p className='text-muted-foreground'>加载中...</p>
          </div>
        ) : (
          <ContentsTable data={contents} />
        )}
      </Main>
    </>
  )
}
