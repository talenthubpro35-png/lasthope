CREATE TABLE "applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" varchar NOT NULL,
	"job_id" varchar NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL,
	"match_score" integer,
	"cover_letter" text,
	"applied_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"first_name" text,
	"last_name" text,
	"bio" text,
	"location" text,
	"skills" text[] DEFAULT ARRAY[]::text[],
	"experience" integer,
	"years_of_experience" integer,
	"experience_details" text,
	"education_details" text,
	"certifications_details" text,
	"projects_details" text,
	"languages_details" text,
	"volunteer_details" text,
	"awards_details" text,
	"publications_details" text,
	"courses_details" text,
	"resume_url" text,
	"headline" text,
	"expected_salary" text,
	"availability" text,
	"job_search_status" text DEFAULT 'available',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interview_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"question" text NOT NULL,
	"category" text,
	"difficulty" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recruiter_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"required_skills" text[] DEFAULT ARRAY[]::text[],
	"location" text,
	"salary_min" integer,
	"salary_max" integer,
	"job_type" text,
	"external_url" text,
	"linkedin_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" varchar NOT NULL,
	"job_id" varchar NOT NULL,
	"saved_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text DEFAULT 'candidate' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
