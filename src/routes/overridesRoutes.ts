import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import * as OverrideController from '../controllers/overrideController';

const router = Router();

router.get('/', authMiddleware, OverrideController.getOverrides);

export default router;
