import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import express, { Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import slotRoutes from './routes/slotsRoutes';
import ruleRoutes from './routes/rulesRoutes';
import overrideRoutes from './routes/overridesRoutes';
import bookingRoutes from './routes/bookingsRoutes';
import authRoutes from './routes/authRoutes';
import sessionTypeRoutes from './routes/sessionTypeRoutes';
import googleRoutes from './routes/integrations/google';



const app = express();
const port: number = parseInt(process.env.PORT || '3330', 10);

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Register middleware
app.use('/api/auth', authRoutes);

app.use('/api/slots', slotRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/overrides', overrideRoutes);
app.use('/api/book', bookingRoutes);
app.use('/api/session-types', sessionTypeRoutes);
app.use('/api/integrations/google', googleRoutes); 

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('The SchedLite backend is currently online ✅ ');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
