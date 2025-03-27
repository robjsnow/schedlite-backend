import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import * as SlotController from '../controllers/slotController';

const router = Router();

router.post('/', authMiddleware, SlotController.createSlot);
router.get('/available', SlotController.getAvailableSlots);
router.delete('/:id', authMiddleware, SlotController.deleteSlot);
router.get('/mine', authMiddleware, SlotController.getMySlots);
router.post('/bulk', authMiddleware, SlotController.bulkUpdateAvailability);
router.post('/generate', authMiddleware, SlotController.generateFutureSlots);

export default router;
