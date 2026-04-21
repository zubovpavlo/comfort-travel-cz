import { Router } from 'express';
import { transportController } from '../controllers/transportController';

const router = Router();

router.get('/search', transportController.search);

export default router;
