import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - for all users (candidates, recruiters, admins)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("candidate"), // "candidate", "recruiter", "admin"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidates table - detailed candidate profiles
export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  bio: text("bio"),
  location: text("location"),
  skills: text("skills").array().default(sql`ARRAY[]::text[]`), // array of skill names
  experience: integer("experience"), // years (deprecated, use yearsOfExperience)
  yearsOfExperience: integer("years_of_experience"), // total years of experience
  experienceDetails: text("experience_details"), // JSON string of work experience array
  educationDetails: text("education_details"), // JSON string of education array

  // LinkedIn-style additional sections
  certificationsDetails: text("certifications_details"), // JSON string of certifications array
  projectsDetails: text("projects_details"), // JSON string of projects array
  languagesDetails: text("languages_details"), // JSON string of languages array
  volunteerDetails: text("volunteer_details"), // JSON string of volunteer experience array
  awardsDetails: text("awards_details"), // JSON string of awards & honors array
  publicationsDetails: text("publications_details"), // JSON string of publications array
  coursesDetails: text("courses_details"), // JSON string of courses array

  resume_url: text("resume_url"),
  headline: text("headline"),
  expectedSalary: text("expected_salary"), // Expected salary range
  availability: text("availability"), // Availability status (immediate, 2 weeks, 1 month, etc)
  jobSearchStatus: text("job_search_status").default("available"), // "available", "selected", "not_available"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Jobs table - job postings
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recruiterId: varchar("recruiter_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requiredSkills: text("required_skills").array().default(sql`ARRAY[]::text[]`),
  mustHaveSkills: text("must_have_skills").array().default(sql`ARRAY[]::text[]`), // Critical skills (higher weight in matching)
  location: text("location"),
  salary_min: integer("salary_min"),
  salary_max: integer("salary_max"),
  jobType: text("job_type"), // "full-time", "part-time", "contract", "remote"
  externalUrl: text("external_url"), // Company career page URL
  linkedinUrl: text("linkedin_url"), // LinkedIn job posting URL
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applications table - candidate applications to jobs
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  jobId: varchar("job_id").notNull(),
  status: text("status").notNull().default("applied"), // "applied", "viewed", "shortlisted", "interview", "rejected", "offered"
  matchScore: integer("match_score"), // 0-100 skill match percentage
  coverLetter: text("cover_letter"),
  appliedAt: timestamp("applied_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Saved Jobs table - jobs saved by candidates for later
export const savedJobs = pgTable("saved_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateId: varchar("candidate_id").notNull(),
  jobId: varchar("job_id").notNull(),
  savedAt: timestamp("saved_at").defaultNow(),
});

// Interview Questions table - AI-generated interview questions
export const interviewQuestions = pgTable("interview_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  question: text("question").notNull(),
  category: text("category"), // "technical", "behavioral", "situational"
  difficulty: text("difficulty"), // "easy", "medium", "hard"
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).pick({
  userId: true,
  firstName: true,
  lastName: true,
  bio: true,
  location: true,
  skills: true,
  experience: true,
  yearsOfExperience: true,
  experienceDetails: true,
  educationDetails: true,
  certificationsDetails: true,
  projectsDetails: true,
  languagesDetails: true,
  volunteerDetails: true,
  awardsDetails: true,
  publicationsDetails: true,
  coursesDetails: true,
  headline: true,
  expectedSalary: true,
  availability: true,
  jobSearchStatus: true,
  resume_url: true,
});

export const insertJobSchema = createInsertSchema(jobs).pick({
  recruiterId: true,
  title: true,
  description: true,
  requiredSkills: true,
  mustHaveSkills: true,
  location: true,
  salary_min: true,
  salary_max: true,
  jobType: true,
  externalUrl: true,
  linkedinUrl: true,
});

export const insertApplicationSchema = createInsertSchema(applications).pick({
  candidateId: true,
  jobId: true,
  coverLetter: true,
});

export const insertSavedJobSchema = createInsertSchema(savedJobs).pick({
  candidateId: true,
  jobId: true,
});

// Type inference
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;
export type SavedJob = typeof savedJobs.$inferSelect;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;

// Contact Requests table - recruiters request to view candidate profiles
export const contactRequests = pgTable("contact_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recruiterId: varchar("recruiter_id").notNull(),
  candidateId: varchar("candidate_id").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
  message: text("message"),
  jobId: varchar("job_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ContactRequest = typeof contactRequests.$inferSelect;
