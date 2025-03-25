import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth';
import prisma from '../src/lib/prisma';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const testUser = {
  email: 'test@test.com',
  password: 'password123',
};

let jwtToken: string;

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Clean up if user exists
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  it('should register a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User registered successfully.');
  });

  it('should not allow duplicate registration', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email already in use.');
  });

  it('should log in and return a JWT token', async () => {
    const res = await request(app).post('/api/auth/login').send(testUser);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    jwtToken = res.body.token;
  });

  it('should return user info at /me with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
  });

  it('should block /me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/missing|invalid/i);
  });
});
