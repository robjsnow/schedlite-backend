import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Book an available slot
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { slotId, name, email, note } = req.body;

  if (!slotId || !name || !email) {
    res.status(400).json({ message: 'slotId, name, and email are required.' });
    return;
  }

  try {
    // Check if slot exists and is available
    const slot = await prisma.calendarSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      res.status(404).json({ message: 'Slot not found.' });
      return;
    }

    if (slot.isBooked) {
      res.status(409).json({ message: 'Slot is already booked.' });
      return;
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        slotId,
        name,
        email,
        note,
      },
    });

    // Update the slot to mark it booked
    await prisma.calendarSlot.update({
      where: { id: slotId },
      data: {
        isBooked: true,
      },
    });

    res.status(201).json(booking);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to book slot.' });
    return;
  }
});

export default router;
