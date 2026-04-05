import axios from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  ClubDto,
  ClubServiceDto,
  ClubRuleDto,
  PromotionOrderDto,
  PaginatedResponse,
} from '@delta-club/shared';

const api = axios.create({
  baseURL: '/admin',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', data);
  return res.data;
}

export async function getMe() {
  const res = await api.get<{ id: string; username: string; role: string }>('/auth/me');
  return res.data;
}

export default api;

// Clubs
export async function getClubs(params?: { page?: number; pageSize?: number; search?: string }) {
  const res = await api.get<PaginatedResponse<ClubDto>>('/clubs', { params });
  return res.data;
}

export async function getClub(id: string) {
  const res = await api.get<ClubDto>(`/clubs/${id}`);
  return res.data;
}

export async function createClub(data: Partial<ClubDto>) {
  const res = await api.post<ClubDto>('/clubs', data);
  return res.data;
}

export async function updateClub(id: string, data: Partial<ClubDto>) {
  const res = await api.put<ClubDto>(`/clubs/${id}`, data);
  return res.data;
}

export async function deleteClub(id: string) {
  await api.delete(`/clubs/${id}`);
}

// Club Services
export async function getClubServices(clubId: string) {
  const res = await api.get<ClubServiceDto[]>(`/clubs/${clubId}/services`);
  return res.data;
}

export async function createClubService(clubId: string, data: Partial<ClubServiceDto>) {
  const res = await api.post<ClubServiceDto>(`/clubs/${clubId}/services`, data);
  return res.data;
}

export async function updateClubService(clubId: string, id: string, data: Partial<ClubServiceDto>) {
  const res = await api.put<ClubServiceDto>(`/clubs/${clubId}/services/${id}`, data);
  return res.data;
}

export async function deleteClubService(clubId: string, id: string) {
  await api.delete(`/clubs/${clubId}/services/${id}`);
}

// Club Rules
export async function getClubRules(clubId: string) {
  const res = await api.get<ClubRuleDto[]>(`/clubs/${clubId}/rules`);
  return res.data;
}

export async function createClubRule(clubId: string, data: { content: string; sentiment?: string }) {
  const res = await api.post<ClubRuleDto>(`/clubs/${clubId}/rules`, data);
  return res.data;
}

export async function updateClubRule(clubId: string, id: string, data: { content?: string; sentiment?: string }) {
  const res = await api.put<ClubRuleDto>(`/clubs/${clubId}/rules/${id}`, data);
  return res.data;
}

export async function deleteClubRule(clubId: string, id: string) {
  await api.delete(`/clubs/${clubId}/rules/${id}`);
}

// Promotions
export async function getPromotions() {
  const res = await api.get<PromotionOrderDto[]>('/promotions');
  return res.data;
}

export async function createPromotion(data: { clubId: string; fee: number; startAt: string; endAt: string }) {
  const res = await api.post<PromotionOrderDto>('/promotions', data);
  return res.data;
}

export async function deletePromotion(id: string) {
  await api.delete(`/promotions/${id}`);
}

export async function getPromotionRanking() {
  const res = await api.get<{ clubId: string; clubName: string; totalDailyRate: string }[]>('/promotions/ranking');
  return res.data;
}
