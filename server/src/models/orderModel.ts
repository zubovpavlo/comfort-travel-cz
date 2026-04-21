import db from '../config/database';
import { Order } from '../types';

export interface CreateOrderData {
  outbound_snapshot: Record<string, unknown>;
  return_snapshot: Record<string, unknown>;
  accommodation_snapshot?: Record<string, unknown> | null;
  nights: number;
  total_price_czk: number;
  route_snapshot?: Record<string, unknown>;
}

export const orderModel = {
  async create(userId: number, data: CreateOrderData): Promise<Order> {
    const paymentRef = `CT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const [order] = await db('orders')
      .insert({
        user_id: userId,
        outbound_snapshot: JSON.stringify(data.outbound_snapshot),
        return_snapshot: JSON.stringify(data.return_snapshot),
        accommodation_snapshot: data.accommodation_snapshot
          ? JSON.stringify(data.accommodation_snapshot)
          : null,
        nights: data.nights,
        total_price_czk: data.total_price_czk,
        status: 'confirmed',
        payment_ref: paymentRef,
        route_snapshot: data.route_snapshot ? JSON.stringify(data.route_snapshot) : null,
      })
      .returning('*');

    return order;
  },

  async findByUser(userId: number): Promise<Order[]> {
    return db('orders')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  },

  async findById(id: number, userId?: number): Promise<Order | undefined> {
    let query = db('orders').where({ id });
    if (userId !== undefined) {
      query = query.andWhere('user_id', userId);
    }
    return query.first();
  },

  async cancel(id: number, userId: number): Promise<Order | undefined> {
    const [order] = await db('orders')
      .where({ id, user_id: userId })
      .update({ status: 'cancelled' })
      .returning('*');
    return order;
  },

  async count(): Promise<number> {
    const [{ count }] = await db('orders').count('id as count');
    return Number(count);
  },
};
