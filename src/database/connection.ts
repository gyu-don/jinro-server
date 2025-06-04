// Database connection and setup for SQLite

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'jinro.db');
const MIGRATIONS_PATH = path.join(process.cwd(), 'migrations');

export class DatabaseConnection {
  private db: Database.Database;
  private static instance: DatabaseConnection;

  private constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  private initialize(): void {
    this.createMigrationsTable();
    this.runMigrations();
  }

  private createMigrationsTable(): void {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    this.db.exec(sql);
  }

  private runMigrations(): void {
    if (!fs.existsSync(MIGRATIONS_PATH)) {
      return;
    }

    const migrationFiles = fs
      .readdirSync(MIGRATIONS_PATH)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const appliedMigrations = this.db
      .prepare('SELECT filename FROM migrations')
      .all() as { filename: string }[];

    const appliedSet = new Set(appliedMigrations.map(m => m.filename));

    for (const filename of migrationFiles) {
      if (!appliedSet.has(filename)) {
        console.log(`Applying migration: ${filename}`);
        const migrationPath = path.join(MIGRATIONS_PATH, filename);
        const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
        
        this.db.transaction(() => {
          this.db.exec(migrationSql);
          this.db
            .prepare('INSERT INTO migrations (filename) VALUES (?)')
            .run(filename);
        })();
        
        console.log(`Migration applied: ${filename}`);
      }
    }
  }

  public close(): void {
    this.db.close();
  }

  // Helper methods for common database operations
  public transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  public prepare(sql: string) {
    return this.db.prepare(sql);
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance();