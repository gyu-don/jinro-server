import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { healthRouter } from '@/routes';
import { errorHandler } from '@/middleware';
import { getDatabase } from '@/database';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', healthRouter);

app.use(errorHandler);

export const initializeApp = async (): Promise<express.Application> => {
  try {
    const db = getDatabase();
    await db.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }

  return app;
};

export { app };