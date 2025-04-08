import { Router } from 'express';
import {
  redirectToGoogle,
  handleGoogleCallback,
  googleStatus,
} from '../../controllers/googleController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { disconnectGoogle } from '../../controllers/googleController';

const router = Router();

// Authenticated route to initiate Google OAuth
router.get('/auth', authMiddleware, redirectToGoogle);

// Public callback route from Google
router.get('/callback', handleGoogleCallback);

// Authenticated route to check connection status
router.get('/status', authMiddleware, googleStatus);

// Disconnect route for Google integration
router.delete('/disconnect', authMiddleware, disconnectGoogle);

export default router;
