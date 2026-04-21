import { Router } from 'express';
import { geoController } from '../controllers/geoController';

const router = Router();

router.get('/geocode', geoController.geocode);

export default router;
