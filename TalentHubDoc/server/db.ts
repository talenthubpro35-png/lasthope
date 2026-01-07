import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

// Database connection is optional - will use in-memory storage if not configured
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let initialized = false;

export function initializeDatabase() {
  if (initialized) return; // Only initialize once
  initialized = true;

  if (process.env.DATABASE_URL) {
    try {
      console.log("[db] Attempting to connect to database...");
      console.log("[db] DATABASE_URL is set:", process.env.DATABASE_URL ? "✓" : "✗");
      pool = new Pool({ connectionString: process.env.DATABASE_URL });

      // Add event listeners to pool for debugging
      pool.on('connect', () => {
        console.log("[db] Connection pool: Client connected");
      });
      pool.on('error', (err) => {
        console.error("[db] Connection pool error:", err);
      });

      db = drizzle({ client: pool, schema });
      console.log("[db] Database connection initialized ✅");
    } catch (error) {
      console.error("[db] Failed to initialize database:", error);
      console.warn("[db] Falling back to in-memory storage");
    }
  } else {
    console.warn("[db] DATABASE_URL not set, using in-memory storage");
    console.warn("[db] Set DATABASE_URL environment variable to use PostgreSQL");
  }
}

export { pool, db };
export const isDatabaseAvailable = () => db !== null;
