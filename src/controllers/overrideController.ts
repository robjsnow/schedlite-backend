import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

export const getOverrides = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const overrides = await prisma.availabilityOverride.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    res.json(overrides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch overrides.' });
  }
};
