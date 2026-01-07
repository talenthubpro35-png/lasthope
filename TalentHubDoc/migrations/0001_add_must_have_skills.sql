-- Add must_have_skills column to jobs table if it doesn't exist
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "must_have_skills" text[] DEFAULT ARRAY[]::text[];
