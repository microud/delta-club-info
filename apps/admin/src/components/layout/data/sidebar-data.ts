import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Palette,
  UserSearch,
  Bot,
  Video,
  ScanText,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: '管理',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: '俱乐部管理',
          url: '/clubs',
          icon: Building2,
        },
        {
          title: '推广管理',
          url: '/promotions',
          icon: Megaphone,
        },
        {
          title: '博主管理',
          url: '/bloggers',
          icon: UserSearch,
        },
        {
          title: '爬虫管理',
          url: '/crawler',
          icon: Bot,
        },
        {
          title: '视频列表',
          url: '/videos',
          icon: Video,
        },
        {
          title: '消息解析',
          url: '/parse-tasks',
          icon: ScanText,
        },
      ],
    },
    {
      title: '设置',
      items: [
        {
          title: '外观',
          url: '/settings/appearance',
          icon: Palette,
        },
      ],
    },
  ],
}
