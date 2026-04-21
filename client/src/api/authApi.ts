import api from './axiosInstance';
import { User } from '../types';

export const authApi = {
  register: (data: { email: string; password: string; first_name?: string; last_name?: string }) =>
    api.post<{ user: User; token: string }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/auth/login', data),

  getProfile: () => api.get<User>('/auth/me'),

  updateProfile: (data: Partial<User>) => api.put<User>('/auth/me', data),
};
