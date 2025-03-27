import { Router } from 'express';
import * as SessionTypeController from '../controllers/sessionTypeController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, SessionTypeController.getSessionTypes);
router.post('/', authMiddleware, SessionTypeController.createSessionType);
router.delete('/:id', authMiddleware, SessionTypeController.deleteSessionType);

export default router;
