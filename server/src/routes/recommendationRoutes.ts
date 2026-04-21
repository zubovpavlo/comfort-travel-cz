import { Router } from 'express';
import { recommendationController } from '../controllers/recommendationController';

const router = Router();

router.post('/search', recommendationController.search);

export default router;
