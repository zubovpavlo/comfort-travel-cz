import { env } from '../config/env';

export type AccommodationOsmType = 'hotel' | 'hostel' | 'guest_house' | 'apartment' | 'motel';

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

const DEFAULT_TYPES: AccommodationOsmType[] = ['hotel', 'hostel', 'guest_house', 'apartment', 'motel'];

export const overpassClient = {
  async findAccommodations(
    lat: number,
    lon: number,
    radiusM: number,
    types: AccommodationOsmType[] = DEFAULT_TYPES,
  ): Promise<OverpassElement[]> {
    const typeRegex = `^(${types.join('|')})$`;
    const ql = `
      [out:json][timeout:25];
      (
        node["tourism"~"${typeRegex}"](around:${radiusM},${lat},${lon});
        way["tourism"~"${typeRegex}"](around:${radiusM},${lat},${lon});
      );
      out center tags;
    `;

    const res = await fetch(env.overpassBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': env.userAgent,
      },
      body: `data=${encodeURIComponent(ql)}`,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Overpass ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as { elements?: OverpassElement[] };
    return data.elements || [];
  },

  async findById(externalId: string): Promise<OverpassElement | null> {
    // externalId format: "node/123" or "way/456"
    const [kind, idStr] = externalId.split('/');
    if (!kind || !idStr) return null;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return null;

    const selector = kind === 'way' ? `way(${id})` : kind === 'relation' ? `relation(${id})` : `node(${id})`;
    const ql = `
      [out:json][timeout:25];
      ${selector};
      out center tags;
    `;

    const res = await fetch(env.overpassBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': env.userAgent,
      },
      body: `data=${encodeURIComponent(ql)}`,
    });

    if (!res.ok) return null;
    const data = await res.json() as { elements?: OverpassElement[] };
    return data.elements?.[0] || null;
  },
};
