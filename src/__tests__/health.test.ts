import request from 'supertest';
import { initializeApp } from '../app';

describe('Health Check', () => {
  let app: Express.Application;

  beforeAll(async () => {
    app = await initializeApp();
  });

  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('status', 'healthy');
    expect(response.body.data).toHaveProperty('database', 'connected');
  });
});