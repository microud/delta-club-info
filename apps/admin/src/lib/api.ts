import axios from 'axios'
import type {
  LoginRequest,
  LoginResponse,
  ClubDto,
  ClubServiceDto,
  ClubRuleDto,
  PromotionOrderDto,
  PaginatedResponse,
} from '@delta-club/shared'

const api = axios.create({
  baseURL: '/admin',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Auth store's route guard will handle redirect
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (data: LoginRequest) =>
  api.post<LoginResponse>('/auth/login', data).then((res) => res.data)

export const getMe = () =>
  api.get<{ id: string; username: string; role: string }>('/auth/me').then((res) => res.data)

// Clubs
export const getClubs = (params: { page?: number; pageSize?: number; search?: string }) =>
  api.get<PaginatedResponse<ClubDto>>('/clubs', { params }).then((res) => res.data)

export const getClub = (id: string) =>
  api.get<ClubDto>(`/clubs/${id}`).then((res) => res.data)

export const createClub = (data: Partial<ClubDto>) =>
  api.post<ClubDto>('/clubs', data).then((res) => res.data)

export const updateClub = (id: string, data: Partial<ClubDto>) =>
  api.put<ClubDto>(`/clubs/${id}`, data).then((res) => res.data)

export const deleteClub = (id: string) =>
  api.delete(`/clubs/${id}`)

// Club Services
export const getClubServices = (clubId: string) =>
  api.get<ClubServiceDto[]>(`/clubs/${clubId}/services`).then((res) => res.data)

export const createClubService = (clubId: string, data: Partial<ClubServiceDto>) =>
  api.post<ClubServiceDto>(`/clubs/${clubId}/services`, data).then((res) => res.data)

export const updateClubService = (clubId: string, id: string, data: Partial<ClubServiceDto>) =>
  api.put<ClubServiceDto>(`/clubs/${clubId}/services/${id}`, data).then((res) => res.data)

export const deleteClubService = (clubId: string, id: string) =>
  api.delete(`/clubs/${clubId}/services/${id}`)

// Club Rules
export const getClubRules = (clubId: string) =>
  api.get<ClubRuleDto[]>(`/clubs/${clubId}/rules`).then((res) => res.data)

export const createClubRule = (clubId: string, data: { content: string; sentiment?: string }) =>
  api.post<ClubRuleDto>(`/clubs/${clubId}/rules`, data).then((res) => res.data)

export const updateClubRule = (clubId: string, id: string, data: { content?: string; sentiment?: string }) =>
  api.put<ClubRuleDto>(`/clubs/${clubId}/rules/${id}`, data).then((res) => res.data)

export const deleteClubRule = (clubId: string, id: string) =>
  api.delete(`/clubs/${clubId}/rules/${id}`)

// Promotions
export const getPromotions = () =>
  api.get<PromotionOrderDto[]>('/promotions').then((res) => res.data)

export const createPromotion = (data: { clubId: string; fee: number; startAt: string; endAt: string }) =>
  api.post<PromotionOrderDto>('/promotions', data).then((res) => res.data)

export const deletePromotion = (id: string) =>
  api.delete(`/promotions/${id}`)

export const getPromotionRanking = () =>
  api.get<{ clubId: string; clubName: string; totalDailyRate: string }[]>('/promotions/ranking').then((res) => res.data)

export default api
