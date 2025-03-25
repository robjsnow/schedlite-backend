import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth';
import slotsRoutes from '../src/routes/slots';
import prisma from '../src/lib/prisma';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotsRoutes);

const testUser = {
  email: 'slotsuser@example.com',
  password: 'slotspassword',
};

let jwtToken: string;
let createdSlotId: string;

describe('Slot Routes', () => {
  beforeAll(async () => {
    await prisma.booking.deleteMany();
    await prisma.calendarSlot.deleteMany();
    await prisma.user.deleteMany({ where: { email: testUser.email } });

    await request(app).post('/api/auth/register').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send(testUser);
    jwtToken = loginRes.body.token;
  });

  it('should create a new availability slot', async () => {
    const res = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        startTime: new Date(Date.now() + 3600000).toISOString(), // +1hr
        endTime: new Date(Date.now() + 5400000).toISOString(),   // +1.5hr
      });

    expect(res.status).toBe(201);
    expect(res.body.isBooked).toBe(false);
    createdSlotId = res.body.id;
  });

  it('should not allow unauthenticated slot creation', async () => {
    const res = await request(app).post('/api/slots').send({
      startTime: new Date(Date.now() + 7200000).toISOString(),
      endTime: new Date(Date.now() + 9000000).toISOString(),
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Missing or invalid token');
  });

  it('should return available slots', async () => {
    const res = await request(app).get('/api/slots/available');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((s: any) => s.id === createdSlotId)).toBeDefined();
  });
});
