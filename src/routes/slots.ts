import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { generateFutureSlotsForUser } from '../lib/scheduler';

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

  router.post('/bulk', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { schedule, overrides } = req.body;
    const userId = req.userId;
  
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
  
    if (!Array.isArray(schedule)) {
      res.status(400).json({ message: 'Invalid schedule data.' });
      return;
    }
  
    const today = new Date();
    const daysToGenerate = 30;
  
    const slotsToCreate: { startTime: Date; endTime: Date; userId: string }[] = [];
  
    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  
      const rule = schedule.find((s: any) => s.day === weekday && s.enabled);
      if (!rule) continue;
  
      const [startH, startM] = rule.start.split(':');
      const [endH, endM] = rule.end.split(':');
  
      const start = new Date(date);
      start.setHours(Number(startH), Number(startM), 0, 0);
  
      const end = new Date(date);
      end.setHours(Number(endH), Number(endM), 0, 0);
  
      slotsToCreate.push({ startTime: start, endTime: end, userId });
    }
  
    // Apply overrides

overrides.forEach((override: any) => {
  const date = new Date(override.date);
  const existingIdx = slotsToCreate.findIndex(slot =>
    slot.startTime.toDateString() === date.toDateString()
  );

  if (override.status === 'unavailable') {
    if (existingIdx !== -1) slotsToCreate.splice(existingIdx, 1);
  } else if (
    override.status === 'available' &&
    typeof override.start === 'string' &&
    typeof override.end === 'string'
  ) {
    const [startH, startM] = override.start.split(':');
    const [endH, endM] = override.end.split(':');

    const start = new Date(date);
    start.setHours(Number(startH), Number(startM), 0, 0);

    const end = new Date(date);
    end.setHours(Number(endH), Number(endM), 0, 0);

    slotsToCreate.push({ startTime: start, endTime: end, userId });
  }
});

  
    await prisma.calendarSlot.deleteMany({
      where: {
        userId,
        startTime: { gte: today },
        isBooked: false,
      },
    });
  
    await prisma.calendarSlot.createMany({ data: slotsToCreate });
  
    res.status(201).json({ message: 'Availability updated.' });
  });

  router.post('/generate', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
  
      await generateFutureSlotsForUser(req.userId);
      res.status(200).json({ message: 'Future slots generated based on availability.' });
      return;
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to generate slots.' });
      return;
    }
  });
  
  
export default router;
