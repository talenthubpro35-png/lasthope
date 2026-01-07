import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "../shared/schema.js";
import { users } from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

async function resetPassword() {
  console.log('Resetting user password...');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please set DATABASE_URL in your .env file');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  try {
    const username = process.argv[2] || 'haroon';
    const newPassword = process.argv[3] || 'password123';

    // Update user password
    const result = await db.update(users)
      .set({ password: newPassword })
      .where(eq(users.username, username))
      .returning();

    if (result.length === 0) {
      console.log(`❌ User "${username}" not found!`);
    } else {
      console.log('✅ Password updated successfully!');
      console.log('\nLogin credentials:');
      console.log(`  Username: ${username}`);
      console.log(`  Password: ${newPassword}`);
    }

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('Error updating password:', error);
    await pool.end();
    process.exit(1);
  }
}

resetPassword();
