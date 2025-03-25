import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { isBefore } from 'date-fns';
import validator from 'validator';

const router = Router();

// Book an available slot
router.post('/', async (req: Request, res: Response): Promise<void> => {
    const { slotId, name, email, note } = req.body;
  
    if (!slotId || !name || !email) {
      res.status(400).json({ message: 'slotId, name, and email are required.' });
      return;
    }

    if (!validator.isEmail(email)) {
        res.status(400).json({ message: 'Invalid email format.' });
        return;
      }
    
    try {
      const slot = await prisma.calendarSlot.findUnique({ where: { id: slotId } });
  
      if (!slot) {
        res.status(404).json({ message: 'Slot not found.' });
        return;
      }
  
      if (slot.isBooked) {
        res.status(409).json({ message: 'Slot is already booked.' });
        return;
      }
  
      // ⛔️ Check if slot is in the past
      if (isBefore(new Date(slot.startTime), new Date())) {
        res.status(400).json({ message: 'Cannot book a slot in the past.' });
        return;
      }
  
      // ✅ All clear — create booking
      const booking = await prisma.booking.create({
        data: { slotId, name, email, note },
      });
  
      await prisma.calendarSlot.update({
        where: { id: slotId },
        data: { isBooked: true },
      });
  
      res.status(201).json(booking);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to book slot.' });
    }
  });
export default router;
