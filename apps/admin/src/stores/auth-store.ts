import { create } from 'zustand'
import { getMe } from '@/lib/api'

interface AdminUser {
  id: string
  username: string
  role: string
}

interface AuthState {
  admin: AdminUser | null
  loading: boolean
  token: string | null
  setToken: (token: string) => void
  checkAuth: () => Promise<void>
  logout: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  loading: true,
  token: localStorage.getItem('token'),

  setToken: (token: string) => {
    localStorage.setItem('token', token)
    set({ token })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ admin: null, loading: false, token: null })
      return
    }
    try {
      const admin = await getMe()
      set({ admin, loading: false })
    } catch {
      localStorage.removeItem('token')
      set({ admin: null, loading: false, token: null })
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ admin: null, token: null })
  },

  reset: () => {
    set({ admin: null, loading: true, token: null })
  },
}))
