import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { adminDbController } from '../controllers/adminDbController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', adminController.dashboard);

router.get('/users', adminController.getUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

router.get('/db/overview', adminDbController.overview);
router.get('/db/tables', adminDbController.tables);
router.get('/db/tables/:table', adminDbController.rows);
router.delete('/db/tables/:table/:id', adminDbController.deleteRow);
router.post('/db/cache/clear', adminDbController.clearCache);

export default router;
