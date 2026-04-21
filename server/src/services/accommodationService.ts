import db from '../config/database';
import { env } from '../config/env';
import { overpassClient, OverpassElement } from './overpassClient';
import { Accommodation } from '../types';

const TOURISM_TO_TYPE: Record<string, Accommodation['type']> = {
  hotel: 'hotel',
  hostel: 'hostel',
  guest_house: 'pension',
  motel: 'hotel',
  apartment: 'apartment',
};

function normalizeAmenities(tags: Record<string, string>): string[] {
  const out: string[] = [];
  const internet = tags['internet_access'];
  if (internet && ['yes', 'wlan', 'wifi'].includes(internet)) out.push('wifi');
  if (tags['parking'] === 'yes' || tags['amenity:parking'] === 'yes') out.push('parking');
  if (tags['breakfast'] === 'yes' || tags['breakfast']) out.push('breakfast');
  if (tags['swimming_pool'] === 'yes') out.push('pool');
  if (tags['fitness_centre'] === 'yes') out.push('fitness');
  if (tags['spa'] === 'yes' || tags['sauna'] === 'yes') out.push('spa');
  if (tags['restaurant'] === 'yes' || tags['restaurant']) out.push('restaurant');
  if (tags['air_conditioning'] === 'yes') out.push('air_conditioning');
  if (tags['pets'] === 'yes') out.push('pet_friendly');
  return out;
}

function priceHeuristic(type: Accommodation['type'], stars: number | null, name: string): number {
  // Deterministic ±15% variation based on name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  const pct = ((hash % 30) - 15) / 100;

  let base: number;
  if (type === 'hostel') base = 560;
  else if (type === 'pension') base = 1100;
  else if (type === 'apartment') base = 1800;
  else {
    if (!stars || stars < 2) base = 1300;
    else if (stars < 3) base = 1600;
    else if (stars < 4) base = 2100;
    else if (stars < 5) base = 3400;
    else base = 5800;
  }
  return Math.round(base * (1 + pct) / 50) * 50;
}

function elementToAccommodation(el: OverpassElement): Accommodation | null {
  const tags = el.tags || {};
  const name = tags['name'];
  if (!name) return null;

  const tourism = tags['tourism'] || 'hotel';
  const type = TOURISM_TO_TYPE[tourism] || 'hotel';

  const lat = el.type === 'node' ? el.lat : el.center?.lat;
  const lon = el.type === 'node' ? el.lon : el.center?.lon;
  if (lat === undefined || lon === undefined) return null;

  const external_id = `${el.type}/${el.id}`;

  const addrParts = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const addrCity = tags['addr:city'] || null;
  const address = [addrParts, addrCity].filter(Boolean).join(', ') || null;

  let image_url: string | null = null;
  if (tags['image'] && /^https?:\/\//.test(tags['image'])) {
    image_url = tags['image'];
  } else if (tags['wikimedia_commons']) {
    image_url = `https://commons.wikimedia.org/wiki/${encodeURIComponent(tags['wikimedia_commons'])}`;
  }

  const starsRaw = tags['stars'];
  const star_rating = starsRaw ? parseFloat(starsRaw) : null;
  const starVal = Number.isFinite(star_rating ?? NaN) ? star_rating : null;

  // Parse explicit charge tag first; otherwise use heuristic
  let price_per_night: number | null = null;
  const chargeRaw = tags['charge'] || tags['price'];
  if (chargeRaw) {
    const m = chargeRaw.match(/(\d[\d\s.,]*)/);
    if (m) {
      const parsed = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
      if (parsed > 0) price_per_night = parsed;
    }
  }
  if (price_per_night === null) {
    price_per_night = priceHeuristic(type, starVal, name);
  }

  return {
    id: external_id,
    external_id,
    name,
    type,
    star_rating: starVal,
    user_rating: null,
    review_count: 0,
    price_per_night,
    address,
    city_name: addrCity,
    amenities: normalizeAmenities(tags),
    description: tags['description'] || null,
    image_url,
    latitude: lat,
    longitude: lon,
  };
}

async function upsertToCache(accs: Accommodation[]): Promise<void> {
  if (accs.length === 0) return;
  const rows = accs.map((a) => ({
    external_id: a.external_id,
    name: a.name,
    type: a.type,
    star_rating: a.star_rating,
    user_rating: a.user_rating,
    review_count: a.review_count,
    price_per_night: a.price_per_night,
    address: a.address,
    city_name: a.city_name,
    amenities: a.amenities,
    description: a.description,
    image_url: a.image_url,
    latitude: a.latitude,
    longitude: a.longitude,
    fetched_at: new Date(),
  }));
  await db('accommodations')
    .insert(rows)
    .onConflict('external_id')
    .merge();
}

function rowToAccommodation(row: any): Accommodation {
  return {
    id: row.external_id,
    external_id: row.external_id,
    name: row.name,
    type: row.type,
    star_rating: row.star_rating !== null ? Number(row.star_rating) : null,
    user_rating: row.user_rating !== null ? Number(row.user_rating) : null,
    review_count: Number(row.review_count || 0),
    price_per_night: row.price_per_night !== null
      ? Number(row.price_per_night)
      : priceHeuristic(row.type ?? 'hotel', row.star_rating != null ? Number(row.star_rating) : null, row.name ?? ''),
    address: row.address,
    city_name: row.city_name,
    amenities: row.amenities || [],
    description: row.description,
    image_url: row.image_url,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    fetched_at: row.fetched_at,
  };
}

export interface AccommodationSearchInput {
  lat: number;
  lon: number;
  radiusM?: number;
  type?: Accommodation['type'][];
  min_rating?: number;
  max_price?: number;
  amenities?: string[];
  sort?: 'price' | 'rating' | 'reviews';
}

export const accommodationService = {
  async search(params: AccommodationSearchInput): Promise<Accommodation[]> {
    const radiusM = params.radiusM ?? env.accommodationRadiusM;
    const ttlMs = env.accommodationCacheTtlMin * 60 * 1000;
    const cacheCutoff = new Date(Date.now() - ttlMs);

    // Bounding box based on radius (rough — 1° lat ≈ 111km).
    const latDelta = radiusM / 111_000;
    const lonDelta = radiusM / (111_000 * Math.cos((params.lat * Math.PI) / 180));

    const cacheQuery = db('accommodations')
      .whereBetween('latitude', [params.lat - latDelta, params.lat + latDelta])
      .andWhereBetween('longitude', [params.lon - lonDelta, params.lon + lonDelta])
      .andWhere('fetched_at', '>=', cacheCutoff);

    const cached = await cacheQuery;
    let accs: Accommodation[];

    if (cached.length > 0) {
      accs = cached.map(rowToAccommodation);
    } else {
      let elements: OverpassElement[];
      try {
        elements = await overpassClient.findAccommodations(params.lat, params.lon, radiusM);
      } catch (err) {
        console.error('Overpass search failed:', err instanceof Error ? err.message : err);
        return [];
      }
      accs = elements
        .map(elementToAccommodation)
        .filter((a): a is Accommodation => a !== null);
      await upsertToCache(accs);
    }

    return applyFilters(accs, params);
  },

  async findById(externalId: string): Promise<Accommodation | null> {
    const ttlMs = env.accommodationCacheTtlMin * 60 * 1000;
    const cacheCutoff = new Date(Date.now() - ttlMs);
    const row = await db('accommodations').where({ external_id: externalId }).first();
    if (row && row.fetched_at && new Date(row.fetched_at) >= cacheCutoff) {
      return rowToAccommodation(row);
    }

    try {
      const el = await overpassClient.findById(externalId);
      if (!el) return row ? rowToAccommodation(row) : null;
      const acc = elementToAccommodation(el);
      if (!acc) return row ? rowToAccommodation(row) : null;
      await upsertToCache([acc]);
      return acc;
    } catch {
      return row ? rowToAccommodation(row) : null;
    }
  },

  async count(): Promise<number> {
    const [{ count }] = await db('accommodations').count('id as count');
    return Number(count);
  },
};

function applyFilters(accs: Accommodation[], params: AccommodationSearchInput): Accommodation[] {
  let out = accs;
  if (params.type && params.type.length > 0) {
    const set = new Set(params.type);
    out = out.filter((a) => set.has(a.type));
  }
  if (params.min_rating !== undefined) {
    out = out.filter((a) => a.user_rating === null || Number(a.user_rating) >= params.min_rating!);
  }
  if (params.max_price !== undefined) {
    out = out.filter((a) => a.price_per_night === null || Number(a.price_per_night) <= params.max_price!);
  }
  if (params.amenities && params.amenities.length > 0) {
    const required = params.amenities;
    out = out.filter((a) => required.every((r) => a.amenities.includes(r)));
  }

  const sort = params.sort || 'rating';
  if (sort === 'price') {
    out.sort((a, b) => (a.price_per_night ?? Infinity) - (b.price_per_night ?? Infinity));
  } else if (sort === 'reviews') {
    out.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
  } else {
    out.sort((a, b) => (b.star_rating ?? 0) - (a.star_rating ?? 0));
  }
  return out;
}
