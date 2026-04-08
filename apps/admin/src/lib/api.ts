import axios from 'axios'
import type {
  LoginRequest,
  LoginResponse,
  ClubDto,
  ClubServiceDto,
  ClubRuleDto,
  PromotionOrderDto,
  PaginatedResponse,
  ParseTaskDto,
  AiConfigDto,
  CreateAiConfigDto,
  UpdateAiConfigDto,
  SystemConfigDto,
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

// Upload
export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<{ url: string; key: string }>('/upload', formData).then((res) => res.data)
}

// AI Smart Import
export const aiImportServices = (clubId: string, data: { files: File[]; textContent?: string }) => {
  const formData = new FormData()
  for (const file of data.files) {
    formData.append('files', file)
  }
  if (data.textContent) {
    formData.append('textContent', data.textContent)
  }
  return api.post<{ clubName: string; services: Array<{ name: string; tiers: Array<{ price: number; guarantee: string; note?: string }> }>; rules: Array<{ content: string; category: string }> }>(`/clubs/${clubId}/services/ai-import`, formData).then((res) => res.data)
}

// Batch create services
export const batchCreateClubServices = (clubId: string, services: Array<Record<string, unknown>>) =>
  api.post(`/clubs/${clubId}/services/batch`, { services }).then((res) => res.data)

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

// Bloggers
export const getBloggers = () =>
  api.get('/bloggers').then((res) => res.data)

export const createBlogger = (data: { name: string; avatar?: string }) =>
  api.post('/bloggers', data).then((res) => res.data)

export const updateBlogger = (id: string, data: { name?: string; avatar?: string; isActive?: boolean }) =>
  api.patch(`/bloggers/${id}`, data).then((res) => res.data)

export const deleteBlogger = (id: string) =>
  api.delete(`/bloggers/${id}`)

// Blogger Accounts
export const addBloggerAccount = (bloggerId: string, data: {
  platform: string; platformUserId: string; platformUsername?: string; crawlCategories: string[]
}) => api.post(`/bloggers/${bloggerId}/accounts`, data).then((res) => res.data)

export const updateBloggerAccount = (accountId: string, data: {
  platformUsername?: string; crawlCategories?: string[]
}) => api.patch(`/bloggers/accounts/${accountId}`, data).then((res) => res.data)

export const deleteBloggerAccount = (accountId: string) =>
  api.delete(`/bloggers/accounts/${accountId}`)

// Crawl Tasks
export const getCrawlTasks = () =>
  api.get('/crawl-tasks').then((res) => res.data)

export const getCrawlTaskRuns = (taskId?: string) =>
  api.get('/crawl-tasks/runs', { params: { taskId } }).then((res) => res.data)

export const updateCrawlTask = (id: string, data: {
  taskType?: string; category?: string; platform?: string; targetId?: string;
  cronExpression?: string; isActive?: boolean
}) => api.patch(`/crawl-tasks/${id}`, data).then((res) => res.data)

export const triggerCrawlTask = (id: string) =>
  api.post(`/crawl-tasks/${id}/trigger`).then((res) => res.data)

export const createCrawlTask = (data: {
  taskType: string; category: string; platform: string; targetId: string; cronExpression?: string
}) => api.post('/crawl-tasks', data).then((res) => res.data)

export const deleteCrawlTask = (id: string) =>
  api.delete(`/crawl-tasks/${id}`).then((res) => res.data)


// Contents
export const getContents = (params?: { platform?: string; contentType?: string; category?: string; aiParsed?: string; bloggerId?: string }) =>
  api.get('/contents', { params }).then((res) => res.data)

export const linkContentClub = (contentId: string, clubId: string) =>
  api.post(`/contents/${contentId}/link-club`, { clubId }).then((res) => res.data)

export const mergeContentGroup = (contentIds: string[], primaryId: string) =>
  api.post('/contents/merge', { contentIds, primaryId }).then((res) => res.data)

export const splitContentFromGroup = (contentId: string) =>
  api.post(`/contents/${contentId}/split`).then((res) => res.data)

// Parse Tasks
export const getParseTasks = (status?: string) =>
  api.get<ParseTaskDto[]>('/parse-tasks', { params: { status } }).then((res) => res.data)

export const getParseTask = (id: string) =>
  api.get<ParseTaskDto>(`/parse-tasks/${id}`).then((res) => res.data)

export const retryParseTask = (id: string) =>
  api.post(`/parse-tasks/${id}/retry`).then((res) => res.data)

export const confirmParseTask = (id: string, data: { clubId: string; parsedResult?: unknown }) =>
  api.post(`/parse-tasks/${id}/confirm`, data).then((res) => res.data)

// Wechat Avatar
export const fetchWechatAvatar = (wechatOfficialAccount: string) =>
  api.post<{ logoUrl: string }>('/clubs/fetch-wechat-avatar', { wechatOfficialAccount }).then((res) => res.data)

// AI Configs
export const getAiConfigs = () =>
  api.get<AiConfigDto[]>('/ai-configs').then((res) => res.data)

export const createAiConfig = (data: CreateAiConfigDto) =>
  api.post<AiConfigDto>('/ai-configs', data).then((res) => res.data)

export const updateAiConfig = (id: string, data: UpdateAiConfigDto) =>
  api.put<AiConfigDto>(`/ai-configs/${id}`, data).then((res) => res.data)

export const deleteAiConfig = (id: string) =>
  api.delete(`/ai-configs/${id}`)

// System Configs
export const getSystemConfigs = () =>
  api.get<SystemConfigDto[]>('/system-configs').then((res) => res.data)

export const updateSystemConfig = (key: string, value: string) =>
  api.put<SystemConfigDto>(`/system-configs/${key}`, { value }).then((res) => res.data)

// Announcements
export const getAnnouncements = (params?: { page?: number; pageSize?: number }) =>
  api.get('/announcements', { params }).then((res) => res.data)

export const getAnnouncement = (id: string) =>
  api.get(`/announcements/${id}`).then((res) => res.data)

export const createAnnouncement = (data: { title: string; content: string; status?: string }) =>
  api.post('/announcements', data).then((res) => res.data)

export const updateAnnouncement = (id: string, data: { title?: string; content?: string; status?: string }) =>
  api.put(`/announcements/${id}`, data).then((res) => res.data)

export const deleteAnnouncement = (id: string) =>
  api.delete(`/announcements/${id}`).then((res) => res.data)

// Overview
export interface OverviewSummary {
  clubs: { total: number; published: number; closed: number }
  contents: { total: number; last7dNew: number }
  bloggers: { total: number; accountTotal: number }
  promotions: { activeCount: number; activeDailyRateSum: number }
}

export interface OverviewTodos {
  pendingReviewComments: number
  failedCrawlLast24h: number
  aiParseFailedContents: number
}

export interface RecentContentItem {
  id: string
  title: string
  platform: string
  category: string
  authorName: string | null
  coverUrl: string | null
  createdAt: string
  clubId: string | null
  clubName: string | null
}

export const getOverviewSummary = () =>
  api.get<OverviewSummary>('/overview/summary').then((res) => res.data)

export const getOverviewTodos = () =>
  api.get<OverviewTodos>('/overview/todos').then((res) => res.data)

export const getRecentContents = (limit = 10) =>
  api
    .get<RecentContentItem[]>('/overview/recent-contents', { params: { limit } })
    .then((res) => res.data)

export default api
