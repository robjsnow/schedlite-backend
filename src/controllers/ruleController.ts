import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

export const saveRules = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        .filter(
          (block: any) =>
            typeof block.start === 'string' &&
            typeof block.end === 'string' &&
            block.start &&
            block.end
        )
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
};

export const getRules = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
};
