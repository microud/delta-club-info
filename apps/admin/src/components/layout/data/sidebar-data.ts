import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Palette,
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
