import { env } from '../config/env';

export interface GeocodeResult {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  areas?: Array<{ name: string; adminLevel?: number; default?: boolean }>;
  street?: string | null;
  houseNumber?: string | null;
  country?: string | null;
  zip?: string | null;
}

export type MotisMode =
  | 'WALK' | 'BIKE' | 'CAR' | 'TRANSIT'
  | 'RAIL' | 'REGIONAL_RAIL' | 'HIGHSPEED_RAIL' | 'LONG_DISTANCE'
  | 'BUS' | 'COACH'
  | 'TRAM' | 'SUBWAY' | 'METRO'
  | 'FERRY' | 'AIRPLANE' | 'CABLE_CAR' | 'FUNICULAR' | 'AERIAL_LIFT'
  | 'OTHER';

export interface MotisPlace {
  name?: string;
  stopId?: string;
  lat: number;
  lon: number;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
}

export interface MotisLeg {
  mode: MotisMode;
  from: MotisPlace;
  to: MotisPlace;
  startTime: string;
  endTime: string;
  duration: number; // seconds
  distance?: number; // meters
  routeShortName?: string;
  routeLongName?: string;
  agencyName?: string;
  agencyId?: string;
  headsign?: string;
  tripId?: string;
  legGeometry?: { points: string; precision?: number; length?: number };
  interlineWithPreviousLeg?: boolean;
}

export interface MotisItinerary {
  duration: number;
  startTime: string;
  endTime: string;
  transfers: number;
  legs: MotisLeg[];
}

export interface MotisPlanResponse {
  from: MotisPlace;
  to: MotisPlace;
  direct: MotisItinerary[];
  itineraries: MotisItinerary[];
}

async function motisFetch<T>(path: string, params: Record<string, string | number | undefined | null>, attempt = 1): Promise<T> {
  const url = new URL(`${env.transitousBaseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.append(key, String(value));
  }

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'User-Agent': env.userAgent,
    },
  });

  if (res.status === 429 && attempt < 3) {
    const delay = attempt * 2000;
    await new Promise((r) => setTimeout(r, delay));
    return motisFetch<T>(path, params, attempt + 1);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Transitous ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const transitousClient = {
  async geocode(text: string, language = 'cs'): Promise<GeocodeResult[]> {
    if (!text || text.trim().length < 2) return [];
    const data = await motisFetch<GeocodeResult[]>('/api/v1/geocode', {
      text: text.trim(),
      language,
    });
    return Array.isArray(data) ? data : [];
  },

  async plan(params: {
    fromLat: number;
    fromLon: number;
    toLat: number;
    toLon: number;
    date: string; // YYYY-MM-DD
    time?: string; // HH:MM
    transitModes?: MotisMode[];
    maxTransfers?: number;
    numItineraries?: number;
  }): Promise<MotisItinerary[]> {
    const { fromLat, fromLon, toLat, toLon, date, time } = params;
    const timeStr = `${date}T${time || '08:00'}:00Z`;

    const query: Record<string, string | number | undefined> = {
      fromPlace: `${fromLat},${fromLon}`,
      toPlace: `${toLat},${toLon}`,
      time: timeStr,
      timetableView: 'true',
    };
    if (params.transitModes && params.transitModes.length > 0) {
      query.transitModes = params.transitModes.join(',');
    }
    if (params.maxTransfers !== undefined) {
      query.maxTransfers = params.maxTransfers;
    }
    if (params.numItineraries !== undefined) {
      query.numItineraries = params.numItineraries;
    }

    const data = await motisFetch<MotisPlanResponse>('/api/v5/plan', query);
    const all = [...(data.itineraries || []), ...(data.direct || [])];
    return all;
  },
};
