import axios from 'axios';
import type { LoginRequest, LoginResponse } from '@delta-club/shared';

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
