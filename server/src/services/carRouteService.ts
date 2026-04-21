import { Place, Route, RouteSegment, CarOptions } from '../types';
import { fuelPriceService } from './fuelPriceService';

const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'comfort-travel-cz/1.0';
const FUEL_DEFAULTS_L_PER_100KM: Record<CarOptions['fuel_type'], number> = {
  benzin: 7.5,
  diesel: 6.5,
  lpg: 10.0,
};

interface OsrmRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: { coordinates: [number, number][] }; // [lon, lat]
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: OsrmRoute[];
}

async function fetchOsrm(origin: Place, dest: Place): Promise<OsrmRoute | null> {
  // `overview=simplified` applies Douglas-Peucker on the server side, reducing
  // polyline size by ~10× while preserving the visual shape — full geometry can
  // easily push sessionStorage past its 5 MB quota in multi-destination searches.
  const url = `${OSRM_BASE}/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=simplified&geometries=geojson`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    clearTimeout(id);
    const data = (await res.json()) as OsrmResponse;
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    return data.routes[0];
  } catch (err) {
    clearTimeout(id);
    console.error('OSRM route failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

function formatTime(minutesFromMidnight: number): string {
  const h = Math.floor(((minutesFromMidnight % 1440) + 1440) % 1440 / 60);
  const m = ((minutesFromMidnight % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseHHMM(s: string | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

// Returns [departureMinutes, arrivalMinutes] given a user-specified reference time and mode.
function scheduleTimes(durationMin: number, refMinutes: number | null, mode: 'depart' | 'arrive' | undefined): [number, number] {
  const defaultDepart = 8 * 60; // 08:00 placeholder when no time specified
  if (refMinutes === null) return [defaultDepart, defaultDepart + durationMin];
  if (mode === 'arrive') return [refMinutes - durationMin, refMinutes];
  return [refMinutes, refMinutes + durationMin];
}

// Resolve fuel price: manual override → live scrape → fallback heuristic
async function resolveFuelPrice(opts: CarOptions): Promise<{ price: number; source: string }> {
  if (opts.fuel_price_czk_per_l && opts.fuel_price_czk_per_l > 0) {
    return { price: opts.fuel_price_czk_per_l, source: 'manual' };
  }
  const prices = await fuelPriceService.getPrices();
  if (prices) return { price: prices[opts.fuel_type], source: prices.source };
  const fallback: Record<CarOptions['fuel_type'], number> = {
    benzin: 40,
    diesel: 38,
    lpg: 18,
  };
  return { price: fallback[opts.fuel_type], source: 'fallback' };
}

export const carRouteService = {
  async getRoute(origin: Place, dest: Place, opts: CarOptions, refTime?: string): Promise<Route | null> {
    const osrm = await fetchOsrm(origin, dest);
    if (!osrm) return null;

    const distanceKm = osrm.distance / 1000;
    const durationMin = Math.max(1, Math.round(osrm.duration / 60));
    const consumption = opts.consumption_l_per_100km || FUEL_DEFAULTS_L_PER_100KM[opts.fuel_type];
    const { price: pricePerL } = await resolveFuelPrice(opts);
    const liters = (distanceKm * consumption) / 100;
    const costCzk = Math.round(liters * pricePerL);

    // OSRM returns [lon, lat]; we store [lat, lon] in geometry
    const geometry: [number, number][] = osrm.geometry.coordinates.map(
      ([lon, lat]) => [lat, lon],
    );

    const [depMin, arrMin] = scheduleTimes(durationMin, parseHHMM(refTime), opts.time_mode);

    const segment: RouteSegment = {
      originStopName: origin.name,
      originLat: origin.lat,
      originLon: origin.lon,
      destStopName: dest.name,
      destLat: dest.lat,
      destLon: dest.lon,
      transportType: 'car',
      departureTime: formatTime(depMin),
      arrivalTime: formatTime(arrMin),
      durationMinutes: durationMin,
      priceCzk: costCzk,
      carrierName: null,
      routeShortName: null,
      headsign: null,
      tripId: null,
      geometry,
      comfortClass: 'comfort',
    };

    return {
      segments: [segment],
      totalDurationMinutes: durationMin,
      totalPriceCzk: costCzk,
      transfers: 0,
      totalWaitMinutes: 0,
    };
  },
};
