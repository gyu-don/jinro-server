#!/usr/bin/env tsx

// Database migration script

import { dbConnection } from '../database/connection';

async function runMigrations() {
  try {
    console.log('Starting database migration...');
    
    // The migration will run automatically when DatabaseConnection is initialized
    const db = dbConnection.getDatabase();
    
    // Verify the schema was created correctly
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'migrations'
      ORDER BY name
    `).all() as { name: string }[];

    console.log('Database tables created:');
    for (const table of tables) {
      console.log(`  - ${table.name}`);
    }

    // Show applied migrations
    const migrations = db.prepare('SELECT filename, applied_at FROM migrations ORDER BY applied_at').all() as { filename: string; applied_at: string }[];
    
    console.log('\nApplied migrations:');
    for (const migration of migrations) {
      console.log(`  - ${migration.filename} (${migration.applied_at})`);
    }

    console.log('\nDatabase migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}