import { Router } from 'express';
import { favoriteController } from '../controllers/favoriteController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', favoriteController.getFavorites);
router.post('/', favoriteController.addFavorite);
router.delete('/:id', favoriteController.removeFavorite);

router.get('/searches', favoriteController.getSavedSearches);
router.post('/searches', favoriteController.saveSearch);
router.delete('/searches/:id', favoriteController.removeSavedSearch);

export default router;
