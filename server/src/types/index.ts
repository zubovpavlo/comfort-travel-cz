export interface Place {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  region?: string | null;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'admin';
  pref_price: number;
  pref_time: number;
  pref_comfort: number;
  pref_rating: number;
  created_at: Date;
  updated_at: Date;
}

export type TransportType = 'train' | 'bus' | 'tram' | 'metro' | 'walk' | 'car';

export type FuelType = 'benzin' | 'diesel' | 'lpg';

export interface CarOptions {
  fuel_type: FuelType;
  consumption_l_per_100km: number;
  fuel_price_czk_per_l?: number;
}

export interface TransportConnectionCache {
  id: number;
  external_trip_id: string | null;
  origin_place_name: string;
  origin_lat: number;
  origin_lon: number;
  dest_place_name: string;
  dest_lat: number;
  dest_lon: number;
  transport_type: TransportType;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  price_czk: number;
  carrier_name: string | null;
  search_date: string;
  fetched_at: Date;
}

export interface Accommodation {
  id: string; // external_id e.g. "node/123"
  external_id: string;
  name: string;
  type: 'hotel' | 'hostel' | 'pension' | 'apartment';
  star_rating: number | null;
  user_rating: number | null;
  review_count: number;
  price_per_night: number | null;
  address: string | null;
  city_name: string | null;
  amenities: string[];
  description: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  fetched_at?: Date;
}

export interface SavedSearch {
  id: number;
  user_id: number;
  origin_place: Place;
  dest_place: Place;
  travel_date: string | null;
  nights: number;
  search_params: Record<string, unknown>;
  created_at: Date;
}

export interface FavoriteCombo {
  id: number;
  user_id: number;
  combo_snapshot: Record<string, unknown>;
  total_score: number | null;
  total_price_czk: number | null;
  notes: string | null;
  created_at: Date;
}

// Route finder types
export interface RouteSegment {
  originStopName?: string;
  originLat?: number;
  originLon?: number;
  destStopName?: string;
  destLat?: number;
  destLon?: number;
  transportType: TransportType;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  priceCzk: number;
  carrierName?: string | null;
  routeShortName?: string | null;
  headsign?: string | null;
  tripId?: string | null;
  geometry?: [number, number][];          // Decoded leg geometry (lat/lon pairs)
  comfortClass: 'standard' | 'comfort' | 'business';
}

export interface Route {
  segments: RouteSegment[];
  totalDurationMinutes: number;
  totalPriceCzk: number;
  transfers: number;
  totalWaitMinutes: number;
}

// Recommendation types
export interface RecommendationWeights {
  price: number;
  travel_time: number;
  comfort: number;
  rating: number;
}

export interface SearchFilters {
  max_price_total?: number;
  transport_types?: TransportType[];
  accommodation_types?: ('hotel' | 'hostel' | 'pension' | 'apartment')[];
  min_accommodation_rating?: number;
  max_transfers?: number;
  amenities?: string[];
  radius_m?: number;
}

export interface RecommendationRequest {
  origin: Place;
  destination: Place;
  travel_date: string;
  return_date: string;
  nights: number;
  passengers: number;
  weights?: RecommendationWeights;
  filters?: SearchFilters;
  transport_mode?: 'transit' | 'car';
  car_options?: CarOptions;
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

export interface Order {
  id: number;
  user_id: number;
  outbound_snapshot: Record<string, unknown>;
  return_snapshot: Record<string, unknown>;
  accommodation_snapshot: Record<string, unknown> | null;
  nights: number;
  total_price_czk: number;
  status: 'confirmed' | 'cancelled';
  payment_ref: string | null;
  route_snapshot: Record<string, unknown> | null;
  created_at: Date;
}

// JWT payload
export interface JwtPayload {
  userId: number;
  email: string;
  role: 'user' | 'admin';
}

// Express request extension
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
