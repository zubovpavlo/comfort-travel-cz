import { Request, Response, NextFunction } from 'express';
import { userModel } from '../models/userModel';
import { favoriteModel } from '../models/favoriteModel';
import { orderModel } from '../models/orderModel';
import { connectionModel } from '../models/connectionModel';
import { accommodationModel } from '../models/accommodationModel';

export const adminController = {
  async dashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const [connections, accommodations, users, searches, orders] = await Promise.all([
        connectionModel.count(),
        accommodationModel.count(),
        userModel.count(),
        favoriteModel.countSearches(),
        orderModel.count(),
      ]);
      res.json({
        users,
        searches,
        orders,
        cache: {
          transport_connections: connections,
          accommodations,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // Users
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await userModel.findAll(page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = req.body;
      const user = await userModel.update(Number(req.params.id), { role });
      if (!user) {
        res.status(404).json({ error: 'Uživatel nenalezen.' });
        return;
      }
      const { password_hash, ...safe } = user;
      res.json(safe);
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await userModel.delete(Number(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'Uživatel nenalezen.' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
