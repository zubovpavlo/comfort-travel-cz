import { Router } from 'express';
import { fuelPriceService } from '../services/fuelPriceService';

const router = Router();

router.get('/price', async (_req, res) => {
  const prices = await fuelPriceService.getPrices();
  if (!prices) {
    res.status(503).json({ error: 'Ceny paliv nejsou momentálně dostupné.' });
    return;
  }
  res.json(prices);
});

export default router;
