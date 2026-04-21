import api from './axiosInstance';
import { Route, Accommodation } from '../types';

export interface CreateOrderPayload {
  outbound_snapshot: Route;
  return_snapshot: Route;
  accommodation_snapshot?: Accommodation | null;
  nights: number;
  total_price_czk: number;
  route_snapshot?: Record<string, unknown>;
}

export interface Order {
  id: number;
  user_id: number;
  outbound_snapshot: Route;
  return_snapshot: Route;
  accommodation_snapshot: Accommodation | null;
  nights: number;
  total_price_czk: number | string;
  status: 'confirmed' | 'cancelled';
  payment_ref: string | null;
  route_snapshot: Record<string, unknown> | null;
  rating: number | null;
  review_text: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const orderApi = {
  create: async (payload: CreateOrderPayload): Promise<{ order: Order; payment_ref: string }> => {
    const { data } = await api.post('/orders', payload);
    return data;
  },

  getMyOrders: async (): Promise<{ orders: Order[] }> => {
    const { data } = await api.get('/orders');
    return data;
  },

  getById: async (id: number): Promise<{ order: Order }> => {
    const { data } = await api.get(`/orders/${id}`);
    return data;
  },

  cancel: async (id: number): Promise<{ order: Order }> => {
    const { data } = await api.patch(`/orders/${id}/cancel`);
    return data;
  },

  review: async (id: number, rating: number, reviewText: string | null): Promise<{ order: Order }> => {
    const { data } = await api.post(`/orders/${id}/review`, { rating, review_text: reviewText });
    return data;
  },
};
