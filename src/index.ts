import express, { Request, Response } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('The SchedLite backend is currently online ✅ ');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
