import { Router } from 'express';
import * as BookingController from '../controllers/bookingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/', BookingController.createBooking);
router.get('/mine', authMiddleware, BookingController.getMyBookings);
router.patch('/:id/cancel', authMiddleware, BookingController.cancelBooking);

export default router;
