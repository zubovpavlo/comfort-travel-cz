import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', orderController.create);
router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getById);
router.patch('/:id/cancel', orderController.cancel);
router.post('/:id/review', orderController.review);

export default router;
