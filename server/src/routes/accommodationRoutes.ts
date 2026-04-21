import { Router } from 'express';
import { accommodationController } from '../controllers/accommodationController';

const router = Router();

router.get('/search', accommodationController.search);
// external_id contains a slash (e.g. "node/123"), so pass it as a query param.
router.get('/detail', accommodationController.getById);

export default router;
