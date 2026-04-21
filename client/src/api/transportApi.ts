import api from './axiosInstance';
import { Route, Place } from '../types';

export const transportApi = {
  search: (params: {
    origin: Place;
    destination: Place;
    date: string;
    time?: string;
    transport_types?: string[];
    max_transfers?: number;
  }) =>
    api.get<{ count: number; routes: Route[] }>('/transport/search', {
      params: {
        origin_name: params.origin.name,
        origin_lat: params.origin.lat,
        origin_lon: params.origin.lon,
        dest_name: params.destination.name,
        dest_lat: params.destination.lat,
        dest_lon: params.destination.lon,
        date: params.date,
        time: params.time,
        transport_types: params.transport_types?.join(','),
        max_transfers: params.max_transfers,
      },
    }),
};
