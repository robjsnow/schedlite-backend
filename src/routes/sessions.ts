import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const types = await prisma.sessionType.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(types);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch session types.' });
  }
});

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, duration, price } = req.body;

  if (!req.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!name || !duration) {
    res.status(400).json({ message: 'Name and duration are required.' });
    return;
  }

  try {
    const sessionType = await prisma.sessionType.create({
      data: {
        userId: req.userId,
        name,
        duration,
        price,
      },
    });

    res.status(201).json(sessionType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create session type.' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const sessionTypeId = req.params.id;
  
    try {
      // Check if this session type has any bookings
      const linkedBooking = await prisma.booking.findFirst({
        where: { sessionTypeId },
      });
  
      if (linkedBooking) {
        res.status(400).json({
          message: 'This session type is in use and cannot be deleted. Remove associated bookings first.',
        });
        return;
      }
  
      await prisma.sessionType.delete({
        where: { id: sessionTypeId },
      });
  
      res.status(200).json({ message: 'Session type deleted successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to delete session type.' });
    }
  });
  
  

export default router;
