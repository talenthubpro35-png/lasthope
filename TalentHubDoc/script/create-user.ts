import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "../shared/schema.js";
import { users } from "../shared/schema.js";
import { config } from 'dotenv';

// Load environment variables from .env file
config();

async function createUser() {
  console.log('Creating user...');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please set DATABASE_URL in your .env file');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  try {
    const username = process.argv[2] || 'haroon';
    const password = process.argv[3] || 'haroon123';
    const role = process.argv[4] || 'candidate';

    // Insert user
    const result = await db.insert(users).values({
      username: username,
      password: password,
      role: role,
      email: `${username}@talenthub.com`,
    }).returning();

    console.log('✅ User created successfully!');
    console.log('\nLogin credentials:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: ${role}`);

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    if (error?.code === '23505') { // Unique constraint violation
      console.log('ℹ️  User already exists!');
      console.log('To delete and recreate, use a database tool or update manually.');
    } else {
      console.error('Error creating user:', error);
    }
    await pool.end();
    process.exit(1);
  }
}

createUser();
