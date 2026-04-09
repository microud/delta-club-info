import { Outlet, useMatches } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const pageTitles: Record<string, string> = {
  ai: 'AI 配置',
  system: '系统配置',
}

export function Settings() {
  const matches = useMatches()
  const lastMatch = matches[matches.length - 1]
  const subPage = lastMatch?.id?.split('/').pop() ?? ''
  const subTitle = pageTitles[subPage]

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
          Settings{subTitle ? ` / ${subTitle}` : ''}
        </h1>
        <div className='mt-4 flex flex-1 overflow-hidden'>
          <Outlet />
        </div>
      </Main>
    </>
  )
}
