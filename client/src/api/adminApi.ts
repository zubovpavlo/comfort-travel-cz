import api from './axiosInstance';

export interface DbOverview {
  size_pretty: string;
  size_bytes: number;
  version: string;
  connections: number;
  server_time: string;
  uptime: string;
}

export interface DbTableInfo {
  table_name: string;
  row_count: number;
  size_bytes: number;
  size_pretty: string;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  browsable: boolean;
  clearable: boolean;
}

export interface DbRowsResponse {
  rows: Record<string, unknown>[];
  columns: string[];
  total: number;
  page: number;
  limit: number;
}

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),

  getUsers: (page = 1, limit = 20) => api.get('/admin/users', { params: { page, limit } }),
  updateUserRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),

  dbOverview: () => api.get<DbOverview>('/admin/db/overview'),
  dbTables: () => api.get<{ tables: DbTableInfo[] }>('/admin/db/tables'),
  dbRows: (table: string, page = 1, limit = 25) =>
    api.get<DbRowsResponse>(`/admin/db/tables/${table}`, { params: { page, limit } }),
  dbDeleteRow: (table: string, id: number | string) =>
    api.delete(`/admin/db/tables/${table}/${id}`),
  dbClearCache: (table: 'transport_connections' | 'accommodations') =>
    api.post('/admin/db/cache/clear', { table }),
};
