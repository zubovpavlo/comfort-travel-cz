import { Request, Response } from 'express';
import { orderModel } from '../models/orderModel';
import { z } from 'zod';

const createOrderSchema = z.object({
  outbound_snapshot: z.record(z.string(), z.unknown()),
  return_snapshot: z.record(z.string(), z.unknown()),
  accommodation_snapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  nights: z.number().int().min(0),
  total_price_czk: z.number().positive(),
  route_snapshot: z.record(z.string(), z.unknown()).optional(),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review_text: z.string().max(2000).optional().nullable(),
});

export const orderController = {
  async create(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Neplatná data objednávky', details: parsed.error.flatten() });
      return;
    }

    const order = await orderModel.create(userId, {
      outbound_snapshot: parsed.data.outbound_snapshot,
      return_snapshot: parsed.data.return_snapshot,
      accommodation_snapshot: parsed.data.accommodation_snapshot ?? null,
      nights: parsed.data.nights,
      total_price_czk: parsed.data.total_price_czk,
      route_snapshot: parsed.data.route_snapshot,
    });
    res.status(201).json({ order, payment_ref: order.payment_ref });
  },

  async getMyOrders(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const orders = await orderModel.findByUser(userId);
    res.json({ orders });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Neplatné ID' });
      return;
    }

    const order = await orderModel.findById(id, userId);
    if (!order) {
      res.status(404).json({ error: 'Objednávka nebyla nalezena' });
      return;
    }

    res.json({ order });
  },

  async cancel(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Neplatné ID' });
      return;
    }

    const order = await orderModel.cancel(id, userId);
    if (!order) {
      res.status(404).json({ error: 'Objednávka nebyla nalezena' });
      return;
    }

    res.json({ order });
  },

  async review(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Neplatné ID' });
      return;
    }

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Neplatná data hodnocení', details: parsed.error.flatten() });
      return;
    }

    const existing = await orderModel.findById(id, userId);
    if (!existing) {
      res.status(404).json({ error: 'Objednávka nebyla nalezena' });
      return;
    }
    if (existing.status !== 'confirmed') {
      res.status(400).json({ error: 'Zrušené objednávky nelze hodnotit.' });
      return;
    }
    const snap = existing.route_snapshot as { returnDate?: string } | null;
    const returnDateStr = snap?.returnDate;
    if (returnDateStr) {
      const returnDate = new Date(returnDateStr);
      if (!Number.isNaN(returnDate.getTime()) && returnDate.getTime() > Date.now()) {
        res.status(400).json({ error: 'Cesta ještě neskončila — hodnotit lze až po návratu.' });
        return;
      }
    }

    const updated = await orderModel.addReview(
      id,
      userId,
      parsed.data.rating,
      parsed.data.review_text ?? null,
    );
    res.json({ order: updated });
  },
};
