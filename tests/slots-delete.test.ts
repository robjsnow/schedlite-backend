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

const user1 = { email: 'deleter@example.com', password: 'pass1234' };
const user2 = { email: 'other@example.com', password: 'pass1234' };

let token1: string;
let token2: string;
let ownSlotId: string;
let bookedSlotId: string;

describe('Slot Deletion', () => {
  beforeAll(async () => {
    await prisma.booking.deleteMany();
    await prisma.calendarSlot.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { in: [user1.email, user2.email] } },
    });

    await request(app).post('/api/auth/register').send(user1);
    await request(app).post('/api/auth/register').send(user2);

    const login1 = await request(app).post('/api/auth/login').send(user1);
    const login2 = await request(app).post('/api/auth/login').send(user2);
    token1 = login1.body.token;
    token2 = login2.body.token;

    // Create a deletable slot for user1
    const slotRes1 = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 5400000).toISOString(),
      });
    ownSlotId = slotRes1.body.id;

    // Create a booked slot for user1
    const slotRes2 = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        startTime: new Date(Date.now() + 7200000).toISOString(),
        endTime: new Date(Date.now() + 9000000).toISOString(),
      });
    bookedSlotId = slotRes2.body.id;

    await request(app).post('/api/book').send({
      slotId: bookedSlotId,
      name: 'Booked User',
      email: 'booked@example.com',
    });
  });

  it('should allow the slot owner to delete their own slot', async () => {
    const res = await request(app)
      .delete(`/api/slots/${ownSlotId}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);
  });

  it('should not allow deleting a booked slot', async () => {
    const res = await request(app)
      .delete(`/api/slots/${bookedSlotId}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already booked/i);
  });

  it("should not allow deleting someone else's slot", async () => {
    const res = await request(app)
      .delete(`/api/slots/${bookedSlotId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/do not own/i);
  });
});
