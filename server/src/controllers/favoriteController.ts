import { Request, Response, NextFunction } from 'express';
import { favoriteModel } from '../models/favoriteModel';

export const favoriteController = {
  async getFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const favorites = await favoriteModel.findByUser(req.user!.userId);
      res.json(favorites);
    } catch (err) {
      next(err);
    }
  },

  async addFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const { combo_snapshot, total_score, total_price_czk, notes } = req.body || {};
      if (!combo_snapshot || typeof combo_snapshot !== 'object') {
        res.status(400).json({ error: 'combo_snapshot is required' });
        return;
      }
      const fav = await favoriteModel.create({
        user_id: req.user!.userId,
        combo_snapshot,
        total_score: typeof total_score === 'number' ? total_score : null,
        total_price_czk: typeof total_price_czk === 'number' ? total_price_czk : null,
        notes: typeof notes === 'string' ? notes : null,
      });
      res.status(201).json(fav);
    } catch (err) {
      next(err);
    }
  },

  async removeFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await favoriteModel.delete(Number(req.params.id), req.user!.userId);
      if (!deleted) {
        res.status(404).json({ error: 'Oblíbená kombinace nenalezena.' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async getSavedSearches(req: Request, res: Response, next: NextFunction) {
    try {
      const searches = await favoriteModel.findSavedSearches(req.user!.userId);
      res.json(searches);
    } catch (err) {
      next(err);
    }
  },

  async saveSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const { origin_place, dest_place, travel_date, nights, search_params } = req.body || {};
      if (!origin_place || !dest_place) {
        res.status(400).json({ error: 'origin_place and dest_place are required' });
        return;
      }
      const search = await favoriteModel.createSavedSearch({
        user_id: req.user!.userId,
        origin_place,
        dest_place,
        travel_date,
        nights,
        search_params,
      });
      res.status(201).json(search);
    } catch (err) {
      next(err);
    }
  },

  async removeSavedSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await favoriteModel.deleteSavedSearch(Number(req.params.id), req.user!.userId);
      if (!deleted) {
        res.status(404).json({ error: 'Uložené hledání nenalezeno.' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
