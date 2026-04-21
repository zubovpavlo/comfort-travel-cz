export interface Place {
  id?: string;
  name: string;
  region?: string | null;
  lat: number;
  lon: number;
}

export interface User {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'admin';
  pref_price: number;
  pref_time: number;
  pref_comfort: number;
  pref_rating: number;
}

export type TransportType = 'train' | 'bus' | 'tram' | 'metro' | 'walk' | 'car';

export type FuelType = 'benzin' | 'diesel' | 'lpg';

export interface CarOptions {
  fuel_type: FuelType;
  consumption_l_per_100km: number;
  fuel_price_czk_per_l?: number;
  time_mode?: 'depart' | 'arrive';
  outbound_time?: string; // HH:MM
  return_time?: string;   // HH:MM
}

export interface FuelPrices {
  benzin: number;
  diesel: number;
  lpg: number;
  source: string;
  updated: string;
}

export interface Accommodation {
  id: string;
  external_id: string;
  city_name?: string | null;
  name: string;
  type: 'hotel' | 'hostel' | 'pension' | 'apartment' | 'motel';
  star_rating: number | null;
  user_rating: number | null;
  review_count: number;
  price_per_night: number | null;
  latitude: number;
  longitude: number;
  address: string | null;
  amenities: string[];
  description: string | null;
  image_url?: string | null;
}

export interface RouteSegment {
  carrierName?: string | null;
  routeShortName?: string | null;
  originStopName: string;
  originLat: number;
  originLon: number;
  destStopName: string;
  destLat: number;
  destLon: number;
  transportType: TransportType;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  priceCzk: number;
  comfortClass?: string;
  geometry?: [number, number][];
}

export interface Route {
  segments: RouteSegment[];
  totalDurationMinutes: number;
  totalPriceCzk: number;
  transfers: number;
  totalWaitMinutes: number;
}

export interface ScoredCombo {
  outbound_route: Route;
  return_route: Route;
  accommodation: Accommodation;
  total_price_czk: number;
  total_travel_minutes: number;
  comfort_score: number;
  accommodation_rating: number;
  normalized_scores: {
    price: number;
    travel_time: number;
    comfort: number;
    rating: number;
  };
  total_score: number;
}

export interface RecommendationWeights {
  price: number;
  travel_time: number;
  comfort: number;
  rating: number;
}

export interface SearchParams {
  origin: Place;
  destination: Place;
  travel_date: string;
  return_date: string;
  nights: number;
  passengers: number;
  weights: RecommendationWeights;
  filters: {
    max_price_total?: number;
    transport_types?: string[];
    accommodation_types?: string[];
    min_accommodation_rating?: number;
    max_transfers?: number;
    radius_m?: number;
    amenities?: string[];
  };
  transport_mode?: 'transit' | 'car';
  car_options?: CarOptions;
}

export interface FavoriteCombo {
  id: number;
  combo_snapshot: ScoredCombo;
  total_score: number | null;
  total_price_czk: number | null;
  notes: string | null;
  created_at: string;
}

export interface SavedSearch {
  id: number;
  origin_place: Place;
  dest_place: Place;
  travel_date: string | null;
  nights: number | null;
  search_params: Record<string, unknown> | null;
  created_at: string;
}
