import api from './axiosInstance';

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),

  getUsers: (page = 1, limit = 20) => api.get('/admin/users', { params: { page, limit } }),
  updateUserRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
};
