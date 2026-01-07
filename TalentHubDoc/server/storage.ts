import {
  type User, type InsertUser, users,
  type Candidate, type InsertCandidate, candidates,
  type Job, type InsertJob, jobs,
  type Application, type InsertApplication, applications,
  type SavedJob, type InsertSavedJob, savedJobs,
  type ContactRequest, contactRequests,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db, isDatabaseAvailable } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Candidate operations
  getCandidate(userId: string): Promise<Candidate | undefined>;
  createOrUpdateCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getCandidateById(id: string): Promise<Candidate | undefined>;
  getAllCandidates(): Promise<Candidate[]>;

  // Job operations
  getJob(id: string): Promise<Job | undefined>;
  getJobsByRecruiter(recruiterId: string): Promise<Job[]>;
  getAllJobs(): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;

  // Application operations
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationsByCandidate(candidateId: string): Promise<Application[]>;
  getApplicationsByJob(jobId: string): Promise<Application[]>;
  getAllApplications(): Promise<Application[]>;
  createApplication(app: InsertApplication): Promise<Application>;
  updateApplicationStatus(id: string, status: string): Promise<Application | undefined>;
  deleteApplication(id: string): Promise<boolean>;

  // Saved Jobs operations
  getSavedJob(candidateId: string, jobId: string): Promise<SavedJob | undefined>;
  getSavedJobsByCandidate(candidateId: string): Promise<any[]>;
  saveJob(candidateId: string, jobId: string): Promise<SavedJob>;
  deleteSavedJob(candidateId: string, jobId: string): Promise<boolean>;

  // Contact Request operations
  createContactRequest(recruiterId: string, candidateId: string, jobId?: string, message?: string): Promise<ContactRequest>;
  getContactRequestsByCandidate(candidateId: string): Promise<ContactRequest[]>;
  getContactRequestsByRecruiter(recruiterId: string): Promise<ContactRequest[]>;
  getContactRequest(recruiterId: string, candidateId: string): Promise<ContactRequest | undefined>;
  updateContactRequestStatus(id: string, status: string): Promise<ContactRequest | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private candidates: Map<string, Candidate>;
  private jobs: Map<string, Job>;
  private applications: Map<string, Application>;
  private savedJobs: Map<string, SavedJob>;
  private contactRequests: Map<string, ContactRequest>;

  constructor() {
    this.users = new Map();
    this.candidates = new Map();
    this.jobs = new Map();
    this.applications = new Map();
    this.savedJobs = new Map();
    this.contactRequests = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || "candidate",
      email: insertUser.email || null,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated: User = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getCandidate(userId: string): Promise<Candidate | undefined> {
    return Array.from(this.candidates.values()).find(c => c.userId === userId);
  }

  async getCandidateById(id: string): Promise<Candidate | undefined> {
    return this.candidates.get(id);
  }

  async getAllCandidates(): Promise<Candidate[]> {
    return Array.from(this.candidates.values());
  }

  async createOrUpdateCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const existing = await this.getCandidate(candidate.userId);
    if (existing) {
      const updated: Candidate = {
        ...existing,
        ...candidate,
        updatedAt: new Date(),
      };
      this.candidates.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const newCandidate: Candidate = {
      ...candidate,
      id,
      firstName: candidate.firstName || null,
      lastName: candidate.lastName || null,
      bio: candidate.bio || null,
      location: candidate.location || null,
      skills: candidate.skills || null,
      experience: candidate.experience || null,
      yearsOfExperience: candidate.yearsOfExperience || null,
      experienceDetails: candidate.experienceDetails || null,
      educationDetails: candidate.educationDetails || null,
      certificationsDetails: candidate.certificationsDetails ?? null,
      projectsDetails: candidate.projectsDetails ?? null,
      languagesDetails: candidate.languagesDetails ?? null,
      volunteerDetails: candidate.volunteerDetails ?? null,
      awardsDetails: candidate.awardsDetails ?? null,
      publicationsDetails: candidate.publicationsDetails ?? null,
      coursesDetails: candidate.coursesDetails ?? null,
      resume_url: candidate.resume_url || null,
      headline: candidate.headline || null,
      expectedSalary: candidate.expectedSalary || null,
      availability: candidate.availability || null,
      jobSearchStatus: candidate.jobSearchStatus ?? "available",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.candidates.set(id, newCandidate);
    return newCandidate;
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobsByRecruiter(recruiterId: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(j => j.recruiterId === recruiterId);
  }

  async getAllJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(j => j.isActive);
  }

  async createJob(job: InsertJob): Promise<Job> {
    const id = randomUUID();
    const newJob: Job = {
      ...job,
      id,
      location: job.location || null,
      requiredSkills: job.requiredSkills || null,
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      jobType: job.jobType || null,
      externalUrl: job.externalUrl || null,
      linkedinUrl: job.linkedinUrl || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(id, newJob);
    return newJob;
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    const updated: Job = {
      ...job,
      ...updates,
      updatedAt: new Date(),
    };
    this.jobs.set(id, updated);
    return updated;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async getApplication(id: string): Promise<Application | undefined> {
    return this.applications.get(id);
  }

  async getApplicationsByCandidate(candidateId: string): Promise<any[]> {
    const apps = Array.from(this.applications.values()).filter(a => a.candidateId === candidateId);
    return apps.map(app => {
      const job = this.jobs.get(app.jobId);
      return {
        ...app,
        jobTitle: job?.title || "Unknown Job",
        company: job?.recruiterId || "Unknown Company",
        location: job?.location,
        salary_min: job?.salary_min,
        salary_max: job?.salary_max,
        jobType: job?.jobType,
      };
    });
  }

  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(a => a.jobId === jobId);
  }

  async createApplication(app: InsertApplication): Promise<Application> {
    const id = randomUUID();
    const newApp: Application = {
      ...app,
      id,
      status: "applied",
      coverLetter: app.coverLetter || null,
      matchScore: null,
      appliedAt: new Date(),
      updatedAt: new Date(),
    };
    this.applications.set(id, newApp);
    return newApp;
  }

  async updateApplicationStatus(id: string, status: string): Promise<Application | undefined> {
    const app = this.applications.get(id);
    if (!app) return undefined;
    const updated: Application = {
      ...app,
      status,
      updatedAt: new Date(),
    };
    this.applications.set(id, updated);
    return updated;
  }

  async deleteApplication(id: string): Promise<boolean> {
    return this.applications.delete(id);
  }

  async getAllApplications(): Promise<Application[]> {
    return Array.from(this.applications.values());
  }

  // Saved Jobs operations
  async getSavedJob(candidateId: string, jobId: string): Promise<SavedJob | undefined> {
    const key = `${candidateId}:${jobId}`;
    return this.savedJobs.get(key);
  }

  async getSavedJobsByCandidate(candidateId: string): Promise<any[]> {
    const saved = Array.from(this.savedJobs.values()).filter(
      (s) => s.candidateId === candidateId
    );
    // Join with job data
    return saved.map((s) => ({
      ...s,
      job: this.jobs.get(s.jobId),
    }));
  }

  async saveJob(candidateId: string, jobId: string): Promise<SavedJob> {
    const savedJob: SavedJob = {
      id: randomUUID(),
      candidateId,
      jobId,
      savedAt: new Date(),
    };
    const key = `${candidateId}:${jobId}`;
    this.savedJobs.set(key, savedJob);
    return savedJob;
  }

  async deleteSavedJob(candidateId: string, jobId: string): Promise<boolean> {
    const key = `${candidateId}:${jobId}`;
    return this.savedJobs.delete(key);
  }

  // Contact Request operations
  async createContactRequest(recruiterId: string, candidateId: string, jobId?: string, message?: string): Promise<ContactRequest> {
    const request: ContactRequest = {
      id: randomUUID(),
      recruiterId,
      candidateId,
      status: "pending",
      message: message || null,
      jobId: jobId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contactRequests.set(request.id, request);
    return request;
  }

  async getContactRequestsByCandidate(candidateId: string): Promise<ContactRequest[]> {
    return Array.from(this.contactRequests.values()).filter(r => r.candidateId === candidateId);
  }

  async getContactRequestsByRecruiter(recruiterId: string): Promise<ContactRequest[]> {
    return Array.from(this.contactRequests.values()).filter(r => r.recruiterId === recruiterId);
  }

  async getContactRequest(recruiterId: string, candidateId: string): Promise<ContactRequest | undefined> {
    return Array.from(this.contactRequests.values()).find(
      r => r.recruiterId === recruiterId && r.candidateId === candidateId
    );
  }

  async updateContactRequestStatus(id: string, status: string): Promise<ContactRequest | undefined> {
    const request = this.contactRequests.get(id);
    if (!request) return undefined;
    const updated: ContactRequest = { ...request, status, updatedAt: new Date() };
    this.contactRequests.set(id, updated);
    return updated;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    console.log(`[db:query] getUser(${id}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      console.log(`[db:query] getUser(${id}) - COMPLETE, found: ${result.length > 0}`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] getUser(${id}) - ERROR:`, err);
      throw err;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log(`[db:query] getUserByUsername(${username}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      console.log(`[db:query] getUserByUsername(${username}) - COMPLETE, found: ${result.length > 0}`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] getUserByUsername(${username}) - ERROR:`, err);
      throw err;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log(`[db:query] createUser(${insertUser.username}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.insert(users).values(insertUser).returning();
      console.log(`[db:query] createUser(${insertUser.username}) - COMPLETE`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] createUser(${insertUser.username}) - ERROR:`, err);
      throw err;
    }
  }

  async getAllUsers(): Promise<User[]> {
    console.log(`[db:query] getAllUsers() - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(users);
      console.log(`[db:query] getAllUsers() - COMPLETE, found: ${result.length} users`);
      return result;
    } catch (err) {
      console.error(`[db:query] getAllUsers() - ERROR:`, err);
      throw err;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    console.log(`[db:query] updateUser(${id}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      console.log(`[db:query] updateUser(${id}) - COMPLETE`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] updateUser(${id}) - ERROR:`, err);
      throw err;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    console.log(`[db:query] deleteUser(${id}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      console.log(`[db:query] deleteUser(${id}) - COMPLETE`);
      return result.length > 0;
    } catch (err) {
      console.error(`[db:query] deleteUser(${id}) - ERROR:`, err);
      throw err;
    }
  }

  async getCandidate(userId: string): Promise<Candidate | undefined> {
    console.log(`[db:query] getCandidate(${userId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(candidates).where(eq(candidates.userId, userId)).limit(1);
      console.log(`[db:query] getCandidate(${userId}) - COMPLETE, found: ${result.length > 0}`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] getCandidate(${userId}) - ERROR:`, err);
      throw err;
    }
  }

  async getCandidateById(id: string): Promise<Candidate | undefined> {
    console.log(`[db:query] getCandidateById(${id}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
      console.log(`[db:query] getCandidateById(${id}) - COMPLETE, found: ${result.length > 0}`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] getCandidateById(${id}) - ERROR:`, err);
      throw err;
    }
  }

  async getAllCandidates(): Promise<Candidate[]> {
    console.log(`[db:query] getAllCandidates() - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(candidates);
      console.log(`[db:query] getAllCandidates() - COMPLETE, found: ${result.length}`);
      return result;
    } catch (err) {
      console.error(`[db:query] getAllCandidates() - ERROR:`, err);
      throw err;
    }
  }

  async createOrUpdateCandidate(candidate: InsertCandidate): Promise<Candidate> {
    if (!db) throw new Error("Database not available");
    const existing = await this.getCandidate(candidate.userId);
    if (existing) {
      const result = await db.update(candidates).set(candidate).where(eq(candidates.id, existing.id)).returning();
      return result[0];
    }
    const result = await db.insert(candidates).values(candidate).returning();
    return result[0];
  }

  async getJob(id: string): Promise<Job | undefined> {
    console.log(`[db:query] getJob(${id}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
      console.log(`[db:query] getJob(${id}) - COMPLETE, found: ${result.length > 0}`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] getJob(${id}) - ERROR:`, err);
      throw err;
    }
  }

  async getJobsByRecruiter(recruiterId: string): Promise<Job[]> {
    console.log(`[db:query] getJobsByRecruiter(${recruiterId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(jobs).where(eq(jobs.recruiterId, recruiterId));
      console.log(`[db:query] getJobsByRecruiter(${recruiterId}) - COMPLETE, found: ${result.length} jobs`);
      return result;
    } catch (err) {
      console.error(`[db:query] getJobsByRecruiter(${recruiterId}) - ERROR:`, err);
      throw err;
    }
  }

  async getAllJobs(): Promise<Job[]> {
    console.log(`[db:query] getAllJobs() - START`);
    try {
      if (!db) throw new Error("Database not available");
      console.log(`[db:query] getAllJobs() - DB instance exists, executing query...`);
      const result = await db.select().from(jobs).where(eq(jobs.isActive, true));
      console.log(`[db:query] getAllJobs() - COMPLETE, found: ${result.length} jobs`);
      return result;
    } catch (err) {
      console.error(`[db:query] getAllJobs() - ERROR:`, err);
      throw err;
    }
  }

  async createJob(job: InsertJob): Promise<Job> {
    console.log(`[db:query] createJob(${job.title}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.insert(jobs).values(job).returning();
      console.log(`[db:query] createJob(${job.title}) - COMPLETE`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] createJob(${job.title}) - ERROR:`, err);
      throw err;
    }
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    console.log(`[db:query] updateJob(${id}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.update(jobs).set(updates).where(eq(jobs.id, id)).returning();
      console.log(`[db:query] updateJob(${id}) - COMPLETE`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] updateJob(${id}) - ERROR:`, err);
      throw err;
    }
  }

  async deleteJob(id: string): Promise<boolean> {
    console.log(`[db:query] deleteJob(${id}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.delete(jobs).where(eq(jobs.id, id)).returning();
      console.log(`[db:query] deleteJob(${id}) - COMPLETE`);
      return result.length > 0;
    } catch (err) {
      console.error(`[db:query] deleteJob(${id}) - ERROR:`, err);
      throw err;
    }
  }

  async getApplication(id: string): Promise<Application | undefined> {
    console.log(`[db:query] getApplication(${id}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
      console.log(`[db:query] getApplication(${id}) - COMPLETE, found: ${result.length > 0}`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] getApplication(${id}) - ERROR:`, err);
      throw err;
    }
  }

  async getApplicationsByCandidate(candidateId: string): Promise<any[]> {
    console.log(`[db:query] getApplicationsByCandidate(${candidateId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db
        .select({
          id: applications.id,
          candidateId: applications.candidateId,
          jobId: applications.jobId,
          status: applications.status,
          matchScore: applications.matchScore,
          coverLetter: applications.coverLetter,
          appliedAt: applications.appliedAt,
          updatedAt: applications.updatedAt,
          jobTitle: jobs.title,
          company: jobs.recruiterId,
          location: jobs.location,
          salary_min: jobs.salary_min,
          salary_max: jobs.salary_max,
          jobType: jobs.jobType,
        })
        .from(applications)
        .leftJoin(jobs, eq(applications.jobId, jobs.id))
        .where(eq(applications.candidateId, candidateId));
      console.log(`[db:query] getApplicationsByCandidate(${candidateId}) - COMPLETE, found: ${result.length}`);
      return result;
    } catch (err) {
      console.error(`[db:query] getApplicationsByCandidate(${candidateId}) - ERROR:`, err);
      throw err;
    }
  }

  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    console.log(`[db:query] getApplicationsByJob(${jobId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(applications).where(eq(applications.jobId, jobId));
      console.log(`[db:query] getApplicationsByJob(${jobId}) - COMPLETE, found: ${result.length}`);
      return result;
    } catch (err) {
      console.error(`[db:query] getApplicationsByJob(${jobId}) - ERROR:`, err);
      throw err;
    }
  }

  async createApplication(app: InsertApplication): Promise<Application> {
    console.log(`[db:query] createApplication(jobId=${app.jobId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.insert(applications).values(app).returning();
      console.log(`[db:query] createApplication(jobId=${app.jobId}) - COMPLETE`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] createApplication(jobId=${app.jobId}) - ERROR:`, err);
      throw err;
    }
  }

  async updateApplicationStatus(id: string, status: string): Promise<Application | undefined> {
    console.log(`[db:query] updateApplicationStatus(${id}, ${status}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.update(applications).set({ status }).where(eq(applications.id, id)).returning();
      console.log(`[db:query] updateApplicationStatus(${id}, ${status}) - COMPLETE`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] updateApplicationStatus(${id}, ${status}) - ERROR:`, err);
      throw err;
    }
  }

  async deleteApplication(id: string): Promise<boolean> {
    console.log(`[db:query] deleteApplication(${id}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.delete(applications).where(eq(applications.id, id)).returning();
      console.log(`[db:query] deleteApplication(${id}) - COMPLETE`);
      return result.length > 0;
    } catch (err) {
      console.error(`[db:query] deleteApplication(${id}) - ERROR:`, err);
      throw err;
    }
  }

  async getAllApplications(): Promise<Application[]> {
    console.log(`[db:query] getAllApplications() - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(applications);
      console.log(`[db:query] getAllApplications() - COMPLETE, found: ${result.length}`);
      return result;
    } catch (err) {
      console.error(`[db:query] getAllApplications() - ERROR:`, err);
      throw err;
    }
  }

  // Saved Jobs operations
  async getSavedJob(candidateId: string, jobId: string): Promise<SavedJob | undefined> {
    console.log(`[db:query] getSavedJob(${candidateId}, ${jobId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db
        .select()
        .from(savedJobs)
        .where(and(eq(savedJobs.candidateId, candidateId), eq(savedJobs.jobId, jobId)))
        .limit(1);
      console.log(`[db:query] getSavedJob - COMPLETE, found: ${result.length > 0}`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] getSavedJob - ERROR:`, err);
      throw err;
    }
  }

  async getSavedJobsByCandidate(candidateId: string): Promise<any[]> {
    console.log(`[db:query] getSavedJobsByCandidate(${candidateId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db
        .select({
          id: savedJobs.id,
          candidateId: savedJobs.candidateId,
          jobId: savedJobs.jobId,
          savedAt: savedJobs.savedAt,
          job: jobs,
        })
        .from(savedJobs)
        .leftJoin(jobs, eq(savedJobs.jobId, jobs.id))
        .where(eq(savedJobs.candidateId, candidateId));
      console.log(`[db:query] getSavedJobsByCandidate - COMPLETE, found: ${result.length}`);
      return result;
    } catch (err) {
      console.error(`[db:query] getSavedJobsByCandidate - ERROR:`, err);
      throw err;
    }
  }

  async saveJob(candidateId: string, jobId: string): Promise<SavedJob> {
    console.log(`[db:query] saveJob(${candidateId}, ${jobId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const savedJob: InsertSavedJob = {
        candidateId,
        jobId,
      };
      const result = await db.insert(savedJobs).values(savedJob).returning();
      console.log(`[db:query] saveJob - COMPLETE`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] saveJob - ERROR:`, err);
      throw err;
    }
  }

  async deleteSavedJob(candidateId: string, jobId: string): Promise<boolean> {
    console.log(`[db:query] deleteSavedJob(${candidateId}, ${jobId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db
        .delete(savedJobs)
        .where(and(eq(savedJobs.candidateId, candidateId), eq(savedJobs.jobId, jobId)))
        .returning();
      console.log(`[db:query] deleteSavedJob - COMPLETE`);
      return result.length > 0;
    } catch (err) {
      console.error(`[db:query] deleteSavedJob - ERROR:`, err);
      throw err;
    }
  }

  // Contact Request operations
  async createContactRequest(recruiterId: string, candidateId: string, jobId?: string, message?: string): Promise<ContactRequest> {
    console.log(`[db:query] createContactRequest - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.insert(contactRequests).values({
        recruiterId,
        candidateId,
        status: "pending",
        message: message || null,
        jobId: jobId || null,
      }).returning();
      console.log(`[db:query] createContactRequest - COMPLETE`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] createContactRequest - ERROR:`, err);
      throw err;
    }
  }

  async getContactRequestsByCandidate(candidateId: string): Promise<ContactRequest[]> {
    console.log(`[db:query] getContactRequestsByCandidate(${candidateId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(contactRequests).where(eq(contactRequests.candidateId, candidateId));
      console.log(`[db:query] getContactRequestsByCandidate - COMPLETE, found: ${result.length}`);
      return result;
    } catch (err) {
      console.error(`[db:query] getContactRequestsByCandidate - ERROR:`, err);
      throw err;
    }
  }

  async getContactRequestsByRecruiter(recruiterId: string): Promise<ContactRequest[]> {
    console.log(`[db:query] getContactRequestsByRecruiter(${recruiterId}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(contactRequests).where(eq(contactRequests.recruiterId, recruiterId));
      console.log(`[db:query] getContactRequestsByRecruiter - COMPLETE, found: ${result.length}`);
      return result;
    } catch (err) {
      console.error(`[db:query] getContactRequestsByRecruiter - ERROR:`, err);
      throw err;
    }
  }

  async getContactRequest(recruiterId: string, candidateId: string): Promise<ContactRequest | undefined> {
    console.log(`[db:query] getContactRequest - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.select().from(contactRequests)
        .where(and(eq(contactRequests.recruiterId, recruiterId), eq(contactRequests.candidateId, candidateId)))
        .limit(1);
      console.log(`[db:query] getContactRequest - COMPLETE, found: ${result.length > 0}`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] getContactRequest - ERROR:`, err);
      throw err;
    }
  }

  async updateContactRequestStatus(id: string, status: string): Promise<ContactRequest | undefined> {
    console.log(`[db:query] updateContactRequestStatus(${id}, ${status}) - START`);
    try {
      if (!db) throw new Error("Database not available");
      const result = await db.update(contactRequests)
        .set({ status, updatedAt: new Date() })
        .where(eq(contactRequests.id, id))
        .returning();
      console.log(`[db:query] updateContactRequestStatus - COMPLETE`);
      return result[0];
    } catch (err) {
      console.error(`[db:query] updateContactRequestStatus - ERROR:`, err);
      throw err;
    }
  }
}

// Storage instances
let memStorage: MemStorage | null = null;
let dbStorage: DatabaseStorage | null = null;

// Dynamic storage getter that checks database availability at runtime
export const getStorage = (): IStorage => {
  if (isDatabaseAvailable()) {
    if (!dbStorage) {
      dbStorage = new DatabaseStorage();
      console.log("[storage] Using PostgreSQL database");
    }
    return dbStorage;
  } else {
    if (!memStorage) {
      memStorage = new MemStorage();
      console.log("[storage] Using in-memory storage (data will be lost on restart)");
    }
    return memStorage;
  }
};

// Export storage as a getter property for backwards compatibility
export const storage = new Proxy({} as IStorage, {
  get: (_target, prop) => {
    const storageInstance = getStorage();
    return (storageInstance as any)[prop];
  }
});
