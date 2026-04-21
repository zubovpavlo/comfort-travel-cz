import db from '../config/database';
import { Place } from '../types';

export const favoriteModel = {
  async findByUser(userId: number) {
    return db('favorite_combos')
      .select('*')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  },

  async create(data: {
    user_id: number;
    combo_snapshot: Record<string, unknown>;
    total_score?: number | null;
    total_price_czk?: number | null;
    notes?: string | null;
  }) {
    const [fav] = await db('favorite_combos')
      .insert({
        user_id: data.user_id,
        combo_snapshot: JSON.stringify(data.combo_snapshot),
        total_score: data.total_score ?? null,
        total_price_czk: data.total_price_czk ?? null,
        notes: data.notes ?? null,
      })
      .returning('*');
    return fav;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const count = await db('favorite_combos').where({ id, user_id: userId }).del();
    return count > 0;
  },

  async findSavedSearches(userId: number) {
    return db('saved_searches')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  },

  async createSavedSearch(data: {
    user_id: number;
    origin_place: Place;
    dest_place: Place;
    travel_date?: string | null;
    nights?: number;
    search_params?: Record<string, unknown>;
  }) {
    const [row] = await db('saved_searches')
      .insert({
        user_id: data.user_id,
        origin_place: JSON.stringify(data.origin_place),
        dest_place: JSON.stringify(data.dest_place),
        travel_date: data.travel_date ?? null,
        nights: data.nights ?? 1,
        search_params: data.search_params ? JSON.stringify(data.search_params) : null,
      })
      .returning('*');
    return row;
  },

  async deleteSavedSearch(id: number, userId: number): Promise<boolean> {
    const count = await db('saved_searches').where({ id, user_id: userId }).del();
    return count > 0;
  },

  async countSearches(): Promise<number> {
    const [{ count }] = await db('saved_searches').count('id as count');
    return Number(count);
  },
};
