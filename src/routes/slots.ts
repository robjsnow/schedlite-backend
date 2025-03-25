import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// Create an availability slot
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { startTime, endTime } = req.body;

  if (!req.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!startTime || !endTime) {
    res.status(400).json({ message: 'Start and end time are required.' });
    return;
  }

  try {
    const slot = await prisma.calendarSlot.create({
      data: {
        userId: req.userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });

    res.status(201).json(slot);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create slot.' });
    return;
  }
});

// Get all available (unbooked) slots, optional ?userId= filter
router.get('/available', async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.query;
  
    try {
      const slots = await prisma.calendarSlot.findMany({
        where: {
          isBooked: false,
          ...(userId ? { userId: userId as string } : {}),
        },
        orderBy: {
          startTime: 'asc',
        },
      });
  
      res.json(slots);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to fetch slots.' });
    }
  });
  

export default router;
