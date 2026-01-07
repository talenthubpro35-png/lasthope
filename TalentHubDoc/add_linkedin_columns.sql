-- Add LinkedIn-style CV sections to candidates table

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS certifications_details TEXT,
ADD COLUMN IF NOT EXISTS projects_details TEXT,
ADD COLUMN IF NOT EXISTS languages_details TEXT,
ADD COLUMN IF NOT EXISTS volunteer_details TEXT,
ADD COLUMN IF NOT EXISTS awards_details TEXT,
ADD COLUMN IF NOT EXISTS publications_details TEXT,
ADD COLUMN IF NOT EXISTS courses_details TEXT;
