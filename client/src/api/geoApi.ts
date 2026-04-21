import api from './axiosInstance';
import { Place } from '../types';

export const geoApi = {
  geocode: (text: string) =>
    api.get<{ places: Place[] }>('/geo/geocode', { params: { text } }),
};
