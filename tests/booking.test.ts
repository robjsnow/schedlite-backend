import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth';
import slotsRoutes from '../src/routes/slots';
import bookingsRoutes from '../src/routes/bookings';
import prisma from '../src/lib/prisma';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/book', bookingsRoutes);

const testUser = {
  email: 'booktest@example.com',
  password: 'securepass123',
};

let jwtToken: string;
let slotId: string;

describe('Booking Routes', () => {
  beforeAll(async () => {
    // Clean up the user and any related slots/bookings
    await prisma.booking.deleteMany();
    await prisma.calendarSlot.deleteMany();
    await prisma.user.deleteMany({ where: { email: testUser.email } });

    // Register and login
    await request(app).post('/api/auth/register').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send(testUser);
    jwtToken = loginRes.body.token;

    // Create a slot
    const slotRes = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        endTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(),   // 1.5 hours from now
      });

    slotId = slotRes.body.id;
  });

  it('should allow booking an available slot', async () => {
    const res = await request(app).post('/api/book').send({
      slotId,
      name: 'Booking Tester',
      email: 'booker@example.com',
      note: 'Testing booking route!',
    });

    expect(res.status).toBe(201);
    expect(res.body.slotId).toBe(slotId);
    expect(res.body.name).toBe('Booking Tester');
  });

  it('should prevent double booking the same slot', async () => {
    const res = await request(app).post('/api/book').send({
      slotId,
      name: 'Another Tester',
      email: 'another@example.com',
    });

    expect(res.status).toBe(409); // Conflict
    expect(res.body.message).toMatch(/already booked/i);
  });

  it('should reject booking a slot in the past', async () => {
    // Create a past-time slot
    const pastSlotRes = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        endTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),      // 1.5 hours ago
      });

    const pastSlotId = pastSlotRes.body.id;

    // Try to book it
    const res = await request(app).post('/api/book').send({
      slotId: pastSlotId,
      name: 'Too Late',
      email: 'late@example.com',
      note: 'Missed it',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot book a slot in the past.');
  });
});

