import express, { Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import slotsRoutes from './routes/slots';
import bookingRoutes from './routes/bookings';


// Load environment variables
dotenv.config();

const app = express();
const port: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Register middleware
app.use('/api/auth', authRoutes);

app.use('/api/slots', slotsRoutes);
app.use('/api/book', bookingRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('The SchedLite backend is currently online ✅ ');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
