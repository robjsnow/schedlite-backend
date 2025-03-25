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

  it('should prevent overlapping availability slots', async () => {
    const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2hr
    const endTime = new Date(Date.now() + 3 * 60 * 60 * 1000);   // +3hr
  
    // Create first slot
    const res1 = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
  
    expect(res1.status).toBe(201);
  
    // Try to create overlapping slot (starts before end, ends after start)
    const res2 = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        startTime: new Date(startTime.getTime() + 15 * 60 * 1000).toISOString(), // +2h15m
        endTime: new Date(endTime.getTime() + 30 * 60 * 1000).toISOString(),     // +3h30m
      });
  
    expect(res2.status).toBe(409); // Conflict
    expect(res2.body.message).toBe('Slot overlaps with an existing one.');
  });
  
});
