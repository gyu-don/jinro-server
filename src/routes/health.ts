import { Router, Request, Response } from 'express';
import { getDatabase } from '@/database';

const router = Router();

router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    
    await db.get('SELECT 1 as test');
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        version: process.env.npm_package_version || '1.0.0',
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Database connection failed',
    });
  }
});

export { router as healthRouter };