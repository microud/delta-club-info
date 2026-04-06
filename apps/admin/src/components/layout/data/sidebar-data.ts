import {
  LayoutDashboard,
  Building2,
  Megaphone,
  UserSearch,
  Bot,
  Video,
  ScanText,
  Smartphone,
  Bell,
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
        {
          title: '公告管理',
          url: '/announcements',
          icon: Bell,
        },
      ],
    },
    {
      title: '设置',
      items: [
        {
          title: '企业微信',
          url: '/settings/wechat-work',
          icon: Smartphone,
        },
        {
          title: 'AI 配置',
          url: '/settings/ai',
          icon: Bot,
        },
      ],
    },
  ],
}
