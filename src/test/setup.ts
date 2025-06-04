// Jest test setup

import { DatabaseConnection } from '../database/connection';

beforeAll(() => {
  // Use in-memory database for all tests
  process.env.DATABASE_PATH = ':memory:';
});

afterAll(() => {
  // Clean up database connection
  try {
    DatabaseConnection.getInstance().close();
  } catch (error) {
    // Ignore cleanup errors
  }
});