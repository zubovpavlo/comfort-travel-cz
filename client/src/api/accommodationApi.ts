import api from './axiosInstance';
import { Accommodation } from '../types';

export const accommodationApi = {
  search: (params: {
    lat: number;
    lon: number;
    radius?: number;
    type?: string[];
    min_rating?: number;
    max_price?: number;
    amenities?: string[];
  }) =>
    api.get<Accommodation[]>('/accommodation/search', {
      params: {
        lat: params.lat,
        lon: params.lon,
        radius: params.radius,
        type: params.type?.join(','),
        min_rating: params.min_rating,
        max_price: params.max_price,
        amenities: params.amenities?.join(','),
      },
    }),

  getById: (externalId: string) =>
    api.get<Accommodation>('/accommodation/detail', { params: { id: externalId } }),
};
