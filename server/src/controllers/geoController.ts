import { Request, Response, NextFunction } from 'express';
import { transitousClient } from '../services/transitousClient';
import { Place } from '../types';

function extractRegion(match: { areas?: Array<{ name: string; adminLevel?: number; default?: boolean }> }): string | null {
  if (!match.areas || match.areas.length === 0) return null;
  const reg = match.areas.find((a) => a.adminLevel === 6) || match.areas.find((a) => a.default) || match.areas[0];
  return reg?.name || null;
}

export const geoController = {
  async geocode(req: Request, res: Response, next: NextFunction) {
    try {
      const text = String(req.query.text || '').trim();
      if (text.length < 2) {
        res.json({ places: [] });
        return;
      }
      const results = await transitousClient.geocode(text);
      const places: Place[] = results
        .filter((r) => typeof r.lat === 'number' && typeof r.lon === 'number')
        .map((r) => ({
          id: r.id,
          name: r.name,
          lat: r.lat,
          lon: r.lon,
          region: extractRegion(r),
        }));
      res.json({ places });
    } catch (err) {
      console.error('Geocoding error:', err instanceof Error ? err.message : err);
      res.json({ places: [] });
    }
  },
};
