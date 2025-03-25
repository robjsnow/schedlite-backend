import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Register route
router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    res.status(400).json({ message: 'Email already in use.' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });

  res.status(201).json({ message: 'User registered successfully.' });
});

// Login route
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ token });
});


router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
  
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, createdAt: true }
    });
  
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
  
    res.json(user);
  });
  
export default router;
