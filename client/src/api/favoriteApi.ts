import api from './axiosInstance';
import { FavoriteCombo, SavedSearch, ScoredCombo, Place } from '../types';

export const favoriteApi = {
  getFavorites: () => api.get<FavoriteCombo[]>('/favorites'),
  addFavorite: (data: {
    combo_snapshot: ScoredCombo;
    total_score?: number;
    total_price_czk?: number;
    notes?: string;
  }) => api.post('/favorites', data),
  removeFavorite: (id: number) => api.delete(`/favorites/${id}`),

  getSavedSearches: () => api.get<SavedSearch[]>('/favorites/searches'),
  saveSearch: (data: {
    origin_place: Place;
    dest_place: Place;
    travel_date?: string;
    nights?: number;
    search_params?: Record<string, unknown>;
  }) => api.post('/favorites/searches', data),
  removeSavedSearch: (id: number) => api.delete(`/favorites/searches/${id}`),
};
