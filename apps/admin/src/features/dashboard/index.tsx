import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { OverviewTab } from './components/overview-tab'
import { TodosTab } from './components/todos-tab'
import { BusinessTab } from './components/business-tab'
import { CrawlerHealthTab } from './components/crawler-health-tab'
import { DataQualityTab } from './components/data-quality-tab'

export function Dashboard() {
  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>概览</h1>
        </div>
        <Tabs defaultValue='overview' className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>概览</TabsTrigger>
              <TabsTrigger value='todos'>待处理</TabsTrigger>
              <TabsTrigger value='business'>商业化</TabsTrigger>
              <TabsTrigger value='crawler'>爬虫健康</TabsTrigger>
              <TabsTrigger value='data-quality'>数据完整度</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <OverviewTab />
          </TabsContent>
          <TabsContent value='todos' className='space-y-4'>
            <TodosTab />
          </TabsContent>
          <TabsContent value='business' className='space-y-4'>
            <BusinessTab />
          </TabsContent>
          <TabsContent value='crawler' className='space-y-4'>
            <CrawlerHealthTab />
          </TabsContent>
          <TabsContent value='data-quality' className='space-y-4'>
            <DataQualityTab />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
