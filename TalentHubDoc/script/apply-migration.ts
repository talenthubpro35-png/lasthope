import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function applyMigration() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      // Read and execute the migration file
      const migrationPath = path.join(__dirname, '..', 'migrations', '0001_add_must_have_skills.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      console.log('Applying migration...');
      await client.query(migrationSQL);
      console.log('Migration applied successfully!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
