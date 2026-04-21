import db from '../config/database';
import { env } from '../config/env';
import { transitousClient, MotisItinerary, MotisLeg, MotisMode } from './transitousClient';
import { Route, RouteSegment, TransportType, Place } from '../types';

function modeToTransportType(mode: MotisMode): TransportType {
  switch (mode) {
    case 'RAIL':
    case 'REGIONAL_RAIL':
    case 'HIGHSPEED_RAIL':
    case 'LONG_DISTANCE':
      return 'train';
    case 'BUS':
    case 'COACH':
      return 'bus';
    case 'TRAM':
      return 'tram';
    case 'SUBWAY':
    case 'METRO':
      return 'metro';
    case 'WALK':
      return 'walk';
    default:
      return 'bus';
  }
}

function isoToHHMM(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function legDistanceKm(leg: MotisLeg): number {
  if (leg.distance && leg.distance > 0) return leg.distance / 1000;
  return haversineKm(leg.from.lat, leg.from.lon, leg.to.lat, leg.to.lon);
}

function priceForLeg(leg: MotisLeg, type: TransportType): number {
  if (type === 'walk') return 0;
  const km = legDistanceKm(leg);
  if (type === 'train') return Math.round(km * env.transitPriceCzkPerKmRail);
  if (type === 'bus') return Math.round(km * env.transitPriceCzkPerKmBus);
  // tram / metro — assume flat urban fare
  return Math.round(env.transitPriceLocalCzk);
}

function decodePolyline(encoded: string, maxPts = 200): [number, number][] {
  const pts: [number, number][] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b, shift = 0, res = 0;
    do { b = encoded.charCodeAt(idx++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (res & 1) ? ~(res >> 1) : (res >> 1);
    shift = 0; res = 0;
    do { b = encoded.charCodeAt(idx++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (res & 1) ? ~(res >> 1) : (res >> 1);
    pts.push([lat / 1e6, lng / 1e6]);
  }
  // Thin to maxPts to keep payload small while preserving route shape
  if (pts.length <= maxPts) return pts;
  const step = Math.ceil(pts.length / maxPts);
  const thinned: [number, number][] = [];
  for (let i = 0; i < pts.length; i += step) thinned.push(pts[i]);
  if (thinned[thinned.length - 1] !== pts[pts.length - 1]) thinned.push(pts[pts.length - 1]);
  return thinned;
}

function legToSegment(leg: MotisLeg): RouteSegment {
  const type = modeToTransportType(leg.mode);
  const priceCzk = priceForLeg(leg, type);
  const durationMinutes = Math.max(1, Math.round(leg.duration / 60));
  return {
    originStopName: leg.from.name,
    originLat: leg.from.lat,
    originLon: leg.from.lon,
    destStopName: leg.to.name,
    destLat: leg.to.lat,
    destLon: leg.to.lon,
    transportType: type,
    departureTime: isoToHHMM(leg.startTime),
    arrivalTime: isoToHHMM(leg.endTime),
    durationMinutes,
    priceCzk,
    carrierName: leg.agencyName || null,
    routeShortName: leg.routeShortName || null,
    headsign: leg.headsign || null,
    tripId: leg.tripId || null,
    geometry: leg.legGeometry?.points ? decodePolyline(leg.legGeometry.points) : undefined,
    comfortClass: type === 'train' || type === 'metro' ? 'comfort' : 'standard',
  };
}

function itineraryToRoute(itin: MotisItinerary): Route {
  const segments = itin.legs.map(legToSegment);
  const transitLegs = segments.filter((s) => s.transportType !== 'walk');
  const totalRideMinutes = segments.reduce((sum, s) => sum + s.durationMinutes, 0);

  let totalWaitMinutes = 0;
  for (let i = 1; i < itin.legs.length; i++) {
    const prevEnd = new Date(itin.legs[i - 1].endTime).getTime();
    const currStart = new Date(itin.legs[i].startTime).getTime();
    const waitMin = Math.max(0, Math.round((currStart - prevEnd) / 60000));
    totalWaitMinutes += waitMin;
  }

  const totalPriceCzk = segments.reduce((sum, s) => sum + s.priceCzk, 0);

  return {
    segments,
    totalDurationMinutes: totalRideMinutes + totalWaitMinutes,
    totalPriceCzk,
    transfers: Math.max(0, transitLegs.length - 1),
    totalWaitMinutes,
  };
}

function upsertRouteToCache(origin: Place, destination: Place, date: string, route: Route): Promise<void> {
  const rows = route.segments.map((seg) => ({
    external_trip_id: seg.tripId,
    origin_place_name: seg.originStopName || origin.name,
    origin_lat: seg.originLat ?? origin.lat,
    origin_lon: seg.originLon ?? origin.lon,
    dest_place_name: seg.destStopName || destination.name,
    dest_lat: seg.destLat ?? destination.lat,
    dest_lon: seg.destLon ?? destination.lon,
    transport_type: seg.transportType,
    departure_time: seg.departureTime,
    arrival_time: seg.arrivalTime,
    duration_minutes: seg.durationMinutes,
    price_czk: seg.priceCzk,
    carrier_name: seg.carrierName ?? null,
    search_date: date,
    fetched_at: new Date(),
  }));
  if (rows.length === 0) return Promise.resolve();
  return db('transport_connections').insert(rows).then(() => undefined);
}

// In-memory route cache: key → { routes, expiresAt }
// v2 — geometry decoded with 1e-6 precision
const memCache = new Map<string, { routes: Route[]; expiresAt: number }>();

function buildCacheKey(origin: Place, dest: Place, date: string, time?: string, maxTransfers?: number): string {
  return `${origin.lat},${origin.lon}|${dest.lat},${dest.lon}|${date}|${time || ''}|${maxTransfers ?? ''}`;
}

export async function findOptimalRoutes(params: {
  origin: Place;
  destination: Place;
  date: string;
  time?: string;
  transportTypes?: TransportType[];
  maxTransfers?: number;
}): Promise<Route[]> {
  const { origin, destination, date, time, transportTypes, maxTransfers } = params;

  const ttlMs = env.transportCacheTtlMin * 60 * 1000;
  const cacheKey = buildCacheKey(origin, destination, date, time, maxTransfers);
  const cached = memCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.routes;
  }

  let modes: MotisMode[] | undefined;
  if (transportTypes && transportTypes.length > 0) {
    const mapping: Record<TransportType, MotisMode[]> = {
      train: ['RAIL', 'REGIONAL_RAIL', 'HIGHSPEED_RAIL', 'LONG_DISTANCE'],
      bus: ['BUS', 'COACH'],
      tram: ['TRAM'],
      metro: ['SUBWAY', 'METRO'],
      walk: ['WALK'],
      car: [], // Car doesn't use MOTIS; handled by carRouteService
    };
    modes = Array.from(new Set(transportTypes.flatMap((t) => mapping[t] || [])));
  }

  let itineraries: MotisItinerary[];
  try {
    itineraries = await transitousClient.plan({
      fromLat: origin.lat,
      fromLon: origin.lon,
      toLat: destination.lat,
      toLon: destination.lon,
      date,
      time,
      transitModes: modes,
      maxTransfers,
      numItineraries: 10,
    });
  } catch (err) {
    console.error('Transitous plan failed:', err instanceof Error ? err.message : err);
    return [];
  }

  const routes = itineraries
    .map(itineraryToRoute)
    .filter((r) => r.segments.length > 0);

  // Cache the segments (fire-and-forget)
  Promise.all(routes.map((r) => upsertRouteToCache(origin, destination, date, r).catch(() => undefined)));

  // Sort by combined cost and take top 10
  routes.sort((a, b) => a.totalPriceCzk + a.totalDurationMinutes - (b.totalPriceCzk + b.totalDurationMinutes));
  const top = routes.slice(0, 10);

  // Store in memory cache
  memCache.set(cacheKey, { routes: top, expiresAt: Date.now() + ttlMs });

  return top;
}
