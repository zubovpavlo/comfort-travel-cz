import { Request, Response, NextFunction } from 'express';
import { accommodationModel } from '../models/accommodationModel';
import { Accommodation } from '../types';

export const accommodationController = {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        res.status(400).json({ error: 'lat and lon are required' });
        return;
      }
      const radius = req.query.radius ? Number(req.query.radius) : undefined;
      const params = {
        lat,
        lon,
        radiusM: radius,
        type: req.query.type
          ? (String(req.query.type).split(',') as Accommodation['type'][])
          : undefined,
        min_rating: req.query.min_rating ? Number(req.query.min_rating) : undefined,
        max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
        amenities: req.query.amenities ? String(req.query.amenities).split(',') : undefined,
        sort: req.query.sort as 'price' | 'rating' | 'reviews' | undefined,
      };

      const accommodations = await accommodationModel.search(params);
      res.json(accommodations);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const externalId = String(req.query.id || '');
      if (!externalId) {
        res.status(400).json({ error: 'id is required' });
        return;
      }
      const acc = await accommodationModel.findById(externalId);
      if (!acc) {
        res.status(404).json({ error: 'Ubytování nenalezeno.' });
        return;
      }
      res.json(acc);
    } catch (err) {
      next(err);
    }
  },
};
