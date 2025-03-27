import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import validator from 'validator';
import { isBefore } from 'date-fns';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  const { slotId, name, email, note, sessionTypeId } = req.body;

  if (!slotId || !name || !email || !sessionTypeId) {
    res.status(400).json({ message: 'slotId, name, email, and sessionTypeId are required.' });
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

    if (isBefore(new Date(slot.startTime), new Date())) {
      res.status(400).json({ message: 'Cannot book a slot in the past.' });
      return;
    }

    const booking = await prisma.booking.create({
      data: {
        slotId,
        name,
        email,
        note,
        sessionTypeId,
      },
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
};

export const getMyBookings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        slot: {
          userId: req.userId,
        },
      },
      include: {
        slot: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const updates = bookings.map((booking) => {
      if (
        booking.status === 'confirmed' &&
        isBefore(new Date(booking.slot.endTime), new Date())
      ) {
        return prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'expired' },
        });
      }
    });

    await Promise.all(updates);

    const updated = await prisma.booking.findMany({
      where: {
        slot: {
          userId: req.userId,
        },
      },
      include: {
        slot: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch bookings.' });
  }
};

export const cancelBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const bookingId = req.params.id;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });

    if (!booking) {
      res.status(404).json({ message: 'Booking not found.' });
      return;
    }

    if (booking.slot.userId !== req.userId) {
      res.status(403).json({ message: 'You are not authorized to cancel this booking.' });
      return;
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });

    await prisma.calendarSlot.update({
      where: { id: booking.slotId },
      data: { isBooked: false },
    });

    res.status(200).json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel booking.' });
  }
};
