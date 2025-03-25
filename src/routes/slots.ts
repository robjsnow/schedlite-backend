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
    const newStart = new Date(startTime);
    const newEnd = new Date(endTime);
  
    // Check for overlapping slots
    const overlapping = await prisma.calendarSlot.findFirst({
      where: {
        userId: req.userId,
        OR: [
          {
            startTime: { lt: newEnd },
            endTime: { gt: newStart },
          },
        ],
      },
    });
  
    if (overlapping) {
      res.status(409).json({ message: 'Slot overlaps with an existing one.' });
      return;
    }
  
    const slot = await prisma.calendarSlot.create({
      data: {
        userId: req.userId,
        startTime: newStart,
        endTime: newEnd,
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
  
  router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const slotId = req.params.id;
  
    const slot = await prisma.calendarSlot.findUnique({ where: { id: slotId } });
  
    if (!slot) {
      res.status(404).json({ message: 'Slot not found.' });
      return;
    }
  
    if (slot.userId !== req.userId) {
      res.status(403).json({ message: 'You do not own this slot.' });
      return;
    }
  
    if (slot.isBooked) {
      res.status(400).json({ message: 'Cannot delete a slot that is already booked.' });
      return;
    }
  
    await prisma.calendarSlot.delete({ where: { id: slotId } });
  
    res.status(200).json({ message: 'Slot deleted successfully.' });
    return;
  });
  

router.get('/mine', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    try {
      const slots = await prisma.calendarSlot.findMany({
        where: { userId: req.userId },
        orderBy: { startTime: 'desc' },
        include: { booking: true }, // include booking info if any
      });
  
      res.json(slots);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to fetch your slots.' });
    }
  }); 
export default router;
