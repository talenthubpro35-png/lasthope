import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "../shared/schema.js";
import { users } from "../shared/schema.js";
import { config } from 'dotenv';

// Load environment variables from .env file
config();

async function createAdmin() {
  console.log('Creating admin user...');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please set DATABASE_URL in your .env file');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  try {
    // NOTE: Currently the app doesn't use password hashing (this should be added for production!)
    const password = 'admin123';

    // Insert admin user
    const result = await db.insert(users).values({
      username: 'admin',
      password: password,
      role: 'admin',
      email: 'admin@talenthub.com',
    }).returning();

    console.log('✅ Admin user created successfully!');
    console.log('\nLogin credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    if (error?.code === '23505') { // Unique constraint violation
      console.log('ℹ️  Admin user already exists!');
      console.log('\nLogin credentials:');
      console.log('  Username: admin');
      console.log('  Password: admin123 (if you created it with this script)');
    } else {
      console.error('Error creating admin user:', error);
    }
    await pool.end();
    process.exit(1);
  }
}

createAdmin();
