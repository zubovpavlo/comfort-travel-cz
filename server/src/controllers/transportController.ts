import { Request, Response, NextFunction } from 'express';
import { findOptimalRoutes } from '../services/routeFinder';
import { TransportType, Place } from '../types';

function parsePlace(req: Request, prefix: 'origin' | 'dest'): Place | null {
  const name = req.query[`${prefix}_name`];
  const lat = Number(req.query[`${prefix}_lat`]);
  const lon = Number(req.query[`${prefix}_lon`]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { name: String(name || ''), lat, lon };
}

export const transportController = {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const origin = parsePlace(req, 'origin');
      const destination = parsePlace(req, 'dest');
      if (!origin || !destination) {
        res.status(400).json({ error: 'Missing origin/destination coordinates' });
        return;
      }
      const date = String(req.query.date || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'Invalid or missing date (YYYY-MM-DD)' });
        return;
      }
      const time = req.query.time ? String(req.query.time) : undefined;
      const transportTypes = req.query.type
        ? (String(req.query.type).split(',') as TransportType[])
        : undefined;

      const routes = await findOptimalRoutes({
        origin,
        destination,
        date,
        time,
        transportTypes,
      });
      res.json({ count: routes.length, routes });
    } catch (err) {
      next(err);
    }
  },
};
