import { Request, Response } from 'express';
import { google } from 'googleapis';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
);

// GET /api/integrations/google/auth
export const redirectToGoogle = (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state: userId,
  });

  res.json({ url }); // returning JSON so frontend can redirect
};

// GET /api/integrations/google/callback
export const handleGoogleCallback = async (req: Request, res: Response): Promise<void> => {
  const code = req.query.code as string;
  const userId = req.query.state as string;

  if (!code || !userId) {
    res.status(400).json({ error: 'Missing code or user ID' });
    return;
  }

  const { tokens } = await oauth2Client.getToken(code);

  await prisma.googleToken.upsert({
    where: { userId },
    update: {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      expiryDate: tokens.expiry_date || 0,
    },
    create: {
      userId,
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      expiryDate: tokens.expiry_date || 0,
    },
  });

  res.send('✅ Google Calendar connected! You can close this tab.');
};

// GET /api/integrations/google/status
export const googleStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = await prisma.googleToken.findUnique({
    where: { userId },
  });

  res.json({ connected: !!token });
};

// DELETE /api/integrations/google/disconnect
export const disconnectGoogle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await prisma.googleToken.deleteMany({ where: { userId } });

  res.json({ message: 'Google Calendar disconnected' });
};
