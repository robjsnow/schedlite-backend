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
      if (!rule || !Array.isArray(rule.blocks)) continue;
  
      for (const block of rule.blocks) {
        const [startH, startM] = block.start.split(':');
        const [endH, endM] = block.end.split(':');
  
        const start = new Date(date);
        start.setHours(Number(startH), Number(startM), 0, 0);
  
        const end = new Date(date);
        end.setHours(Number(endH), Number(endM), 0, 0);
  
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          slotsToCreate.push({ startTime: start, endTime: end, userId });
        }
      }
    }
  
    overrides.forEach((override: any) => {
      if (!override.date) return;
  
      const date = new Date(override.date);
      if (isNaN(date.getTime())) return;
  
      const existingIdxs = slotsToCreate
        .map((slot, idx) => ({ slot, idx }))
        .filter(obj => obj.slot.startTime.toDateString() === date.toDateString())
        .map(obj => obj.idx);
  
      for (let i = existingIdxs.length - 1; i >= 0; i--) {
        slotsToCreate.splice(existingIdxs[i], 1);
      }
  
      if (
        override.status === 'available' &&
        typeof override.start === 'string' &&
        typeof override.end === 'string'
      ) {
        const [startH, startM] = override.start.split(':');
        const [endH, endM] = override.end.split(':');
  
        if (
          !startH || !startM || !endH || !endM ||
          isNaN(Number(startH)) || isNaN(Number(startM)) ||
          isNaN(Number(endH)) || isNaN(Number(endM))
        ) {
          return;
        }
  
        const start = new Date(date);
        start.setHours(Number(startH), Number(startM), 0, 0);
  
        const end = new Date(date);
        end.setHours(Number(endH), Number(endM), 0, 0);
  
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          slotsToCreate.push({ startTime: start, endTime: end, userId });
        }
      }
    });
  
    await prisma.calendarSlot.deleteMany({
      where: {
        userId,
        isBooked: false,
        startTime: { gte: today },
        booking: null,
      },
    });
  
    await prisma.availabilityOverride.deleteMany({ where: { userId } });
  
    const formattedOverrides = overrides
      .filter((o: any) => o.date && !isNaN(new Date(o.date).getTime()))
      .map((o: any) => ({
        userId,
        date: new Date(o.date),
        status: o.status,
        startTime: o.start || null,
        endTime: o.end || null,
      }));
  
    if (formattedOverrides.length > 0) {
      await prisma.availabilityOverride.createMany({ data: formattedOverrides });
    }
  
    const validSlots = slotsToCreate.filter(slot =>
      slot.startTime instanceof Date &&
      !isNaN(slot.startTime.getTime()) &&
      slot.endTime instanceof Date &&
      !isNaN(slot.endTime.getTime())
    );
  
    await prisma.calendarSlot.createMany({ data: validSlots });
  
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

  router.get('/overrides', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
  
      const overrides = await prisma.availabilityOverride.findMany({
        where: { userId: req.userId },
        orderBy: { date: 'asc' },
      });
  
      res.json(overrides); // ✅ No need to `return` this
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to fetch overrides.' });
    }
  });
  
  router.post('/rules', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { schedule } = req.body;
    const userId = req.userId;
  
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    if (!Array.isArray(schedule)) {
      res.status(400).json({ message: 'Invalid schedule data.' });
      return;
    }
  
    try {
      // Delete existing rules for the user
      await prisma.availabilityRule.deleteMany({ where: { userId } });
  
      const rulesToCreate = schedule.flatMap((day: any) => {
        if (!day.enabled || !Array.isArray(day.blocks)) return [];
        const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day.day);
        
        return day.blocks
        .filter((block: any) => typeof block.start === 'string' && typeof block.end === 'string' && block.start && block.end)
        .map((block: any) => ({
          userId,
          dayOfWeek,
          startTime: block.start,
          endTime: block.end,
          sessionTypeId: block.sessionTypeId || null,
        }));
      
      });
    
      await prisma.availabilityRule.createMany({ data: rulesToCreate });
      res.status(200).json({ message: 'Availability rules saved.' });
    } catch (err) {
      console.error('Error saving rules:', err);
      res.status(500).json({ message: 'Failed to save rules.' });
    }
  });
  
  
  // Add this GET endpoint before the export default router;
router.get('/rules', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  try {
    const rules = await prisma.availabilityRule.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json(rules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch availability rules.' });
  }
});

export default router;
