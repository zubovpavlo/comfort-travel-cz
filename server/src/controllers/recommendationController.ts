import { Request, Response, NextFunction } from 'express';
import { recommendationService } from '../services/recommendationService';

export const recommendationController = {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await recommendationService.search(req.body);
      res.json({
        count: results.length,
        results,
      });
    } catch (err) {
      next(err);
    }
  },
};
