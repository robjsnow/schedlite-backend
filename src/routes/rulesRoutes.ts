import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import * as RuleController from '../controllers/ruleController';

const router = Router();

router.get('/', authMiddleware, RuleController.getRules);
router.post('/', authMiddleware, RuleController.saveRules);

export default router;
