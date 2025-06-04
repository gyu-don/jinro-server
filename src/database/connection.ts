import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export class Database {
  private db: sqlite3.Database;

  constructor(filename: string = ':memory:') {
    this.db = new sqlite3.Database(filename);
  }

  async initialize(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    
    await run(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        game_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        message_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        action_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id)
      )
    `);
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    await run(sql, params);
  }

  async get<T>(sql: string, params?: unknown[]): Promise<T | undefined> {
    const get = promisify(this.db.get.bind(this.db));
    return get(sql, params) as Promise<T | undefined>;
  }

  async all<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const all = promisify(this.db.all.bind(this.db));
    return all(sql, params) as Promise<T[]>;
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

let dbInstance: Database | null = null;

export const getDatabase = (): Database => {
  if (!dbInstance) {
    const dbPath = process.env.DATABASE_PATH || 'jinro.db';
    dbInstance = new Database(dbPath);
  }
  return dbInstance;
};