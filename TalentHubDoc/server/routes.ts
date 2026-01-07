import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isDatabaseAvailable } from "./db";
import { requireAuth, requireRole, attachUser } from "./auth";
import OpenAI from "openai";
import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { insertUserSchema, insertJobSchema, insertCandidateSchema, insertApplicationSchema } from "@shared/schema";
import { z } from "zod";
import type { Request, Response } from "express";
import { upload, uploadsDir } from "./upload";
import { processResume } from "./services/resumeParser";
import {
  generateSkillRecommendations,
  analyzeSkillsMarketDemand,
  suggestCareerPaths,
  analyzeSkillGap,
  isGeminiAvailable
} from "./services/geminiSkillsService";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import PDFDocument from "pdfkit";
declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

  // Health check (no auth)
  app.get("/api/health/db", (_req, res) => {
    console.log("[route] GET /api/health/db");
    res.json({ database: isDatabaseAvailable() });
  });

  // ===== AUTH ROUTES ====

  // ============ INTELLIGENT CHATBOT ENDPOINT ============
  // Rate limiting map for chat requests (userId -> last request timestamps)
  const chatRateLimitMap = new Map<string, number[]>();
  const CHAT_RATE_LIMIT = 10; // max messages per minute
  const CHAT_RATE_WINDOW = 60 * 1000; // 1 minute in ms

  app.post("/api/chat", attachUser, async (req, res) => {
    try {
      const { messages, pageContext } = req.body || {};

      // Validate request
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ message: "messages array required" });
        return;
      }

      // Get user context (allow unauthenticated users with limited context)
      const userId = req.user?.id || "anonymous";
      const userRole = (req.user?.role as "candidate" | "recruiter" | "admin") || "candidate";
      const username = req.user?.username || "Guest";

      // Rate limiting
      const now = Date.now();
      const userRequests = chatRateLimitMap.get(userId) || [];
      const recentRequests = userRequests.filter((timestamp) => now - timestamp < CHAT_RATE_WINDOW);

      if (recentRequests.length >= CHAT_RATE_LIMIT) {
        res.status(429).json({
          message: "rate limit exceeded",
          error: "Please wait a moment before sending more messages."
        });
        return;
      }

      // Update rate limit tracker
      recentRequests.push(now);
      chatRateLimitMap.set(userId, recentRequests);

      // Gather user context based on role
      let userContext: any = {
        role: userRole,
        userId,
        username,
      };

      if (req.user && isDatabaseAvailable()) {
        try {
          if (userRole === "candidate") {
            const candidate = await storage.getCandidate(userId);
            const applications = await storage.getApplicationsByCandidate(candidate?.id || "");

            // Calculate profile completion
            let profileFields = 0;
            let filledFields = 0;
            if (candidate) {
              const fields = ['firstName', 'lastName', 'bio', 'location', 'headline', 'resume_url'];
              profileFields = fields.length + 1; // +1 for skills
              filledFields = fields.filter(f => candidate[f as keyof typeof candidate]).length;
              if (candidate.skills && candidate.skills.length > 0) filledFields++;
            }
            const profileCompletion = profileFields > 0 ? Math.round((filledFields / profileFields) * 100) : 0;

            // Count application statuses
            const statusCounts = {
              applied: applications.filter(a => a.status === "applied").length,
              shortlisted: applications.filter(a => a.status === "shortlisted").length,
              interview: applications.filter(a => a.status === "interview").length,
              rejected: applications.filter(a => a.status === "rejected").length,
              offered: applications.filter(a => a.status === "offered").length,
            };

            userContext = {
              ...userContext,
              profileCompletionPercent: profileCompletion,
              skillsCount: candidate?.skills?.length || 0,
              appliedJobsCount: applications.length,
              applicationStatuses: statusCounts,
              hasResume: !!candidate?.resume_url,
            };
          } else if (userRole === "recruiter") {
            const jobs = await storage.getJobsByRecruiter(userId);
            const activeJobs = jobs.filter(j => j.isActive);
            let totalApplications = 0;
            let shortlistedCount = 0;

            for (const job of jobs) {
              const apps = await storage.getApplicationsByJob(job.id);
              totalApplications += apps.length;
              shortlistedCount += apps.filter(a => a.status === "shortlisted").length;
            }

            userContext = {
              ...userContext,
              activeJobsCount: activeJobs.length,
              totalJobsCount: jobs.length,
              totalApplicationsCount: totalApplications,
              shortlistedCandidatesCount: shortlistedCount,
            };
          } else if (userRole === "admin") {
            const users = await storage.getAllUsers();
            const jobs = await storage.getAllJobs();
            const applications = await storage.getAllApplications();

            userContext = {
              ...userContext,
              totalUsers: users.length,
              candidateCount: users.filter(u => u.role === "candidate").length,
              recruiterCount: users.filter(u => u.role === "recruiter").length,
              adminCount: users.filter(u => u.role === "admin").length,
              totalJobs: jobs.length,
              totalApplications: applications.length,
            };
          }
        } catch (err) {
          console.error("[chat] Error gathering user context:", err);
          // Continue with basic context
        }
      }

      // Generate system prompt with context
      const { generateSystemPrompt, generateQuickSuggestions } = await import("./chatbot/systemPrompts");
      const systemPrompt = generateSystemPrompt(userContext, pageContext);

      // Prepare conversation with context
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      const conversationMessages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        // Include last 10 messages for context (to save tokens)
        ...messages.slice(-10).map((msg: any) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
      ];

      // Call OpenAI API or fallback
      let aiResponse = "";

      if (openai) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: conversationMessages,
            temperature: 0.7,
            max_tokens: 500,
          });
          aiResponse = completion.choices[0]?.message?.content || "";
        } catch (err) {
          console.error("[chat] OpenAI API error:", err);
          aiResponse = "I'm having trouble connecting right now. Please try again in a moment.";
        }
      } else {
        // Fallback responses if no OpenAI - using intelligent pattern matching
        const { generateFallbackResponse } = await import("./chatbot/fallbackResponses");
        aiResponse = generateFallbackResponse(lastUserMessage, userContext);
      }

      // Generate intelligent suggestions based on conversation
      const suggestions = generateQuickSuggestions(userContext, lastUserMessage);

      // Prepare response
      const response = {
        message: aiResponse,
        suggestions: suggestions.slice(0, 4), // Return top 4 suggestions
      };

      res.json(response);
    } catch (err) {
      console.error("[chat] Error:", err);
      res.status(500).json({
        message: "Sorry, I'm having trouble right now. Please try again in a moment.",
        suggestions: [
          "What features does TalentHub Pro offer?",
          "How do I get started?",
        ],
      });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      const email = String(body.email || "").trim();
      const role = body.role || "candidate"; // Default to candidate if not specified

      const parsed = insertUserSchema.safeParse({ username, password, email, role });
      if (!parsed.success) {
        res.status(400).json({ message: "invalid request" });
        return;
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        res.status(409).json({ message: "user exists" });
        return;
      }

      const user = await storage.createUser(parsed.data);

      // Automatically create candidate profile for candidate users
      if (user.role === "candidate") {
        await storage.createOrUpdateCandidate({
          userId: user.id,
          firstName: null,
          lastName: null,
          bio: null,
          location: null,
          skills: null,
          experience: null,
          headline: null,
        });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role; // Save role for access control
      res.json({ id: user.id, username: user.username, role: user.role });
    } catch {
      res.status(500).json({ message: "register error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        res.status(401).json({ message: "invalid credentials" });
        return;
      }
      req.session.userId = user.id;
      req.session.userRole = user.role; // Save role for access control
      res.json({ id: user.id, username: user.username, role: user.role });
    } catch {
      res.status(500).json({ message: "login error" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const id = req.session.userId;
      if (!id) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const user = await storage.getUser(id);
      if (!user) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      res.json({ id: user.id, username: user.username, role: user.role });
    } catch {
      res.status(500).json({ message: "me error" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.post("/api/match/score", async (req, res) => {
    try {
      const { candidateId, jobId, candidateSkills, jobSkills } = req.body || {};

      // Semantic Skill Synonyms Map - handles variations of skill names
      const skillSynonyms: Record<string, string[]> = {
        // JavaScript ecosystem
        "javascript": ["js", "ecmascript", "es6", "es2015", "es2020", "vanilla js"],
        "typescript": ["ts"],
        "react": ["reactjs", "react.js", "react js"],
        "angular": ["angularjs", "angular.js", "angular 2+"],
        "vue": ["vuejs", "vue.js", "vue 3"],
        "node": ["nodejs", "node.js", "node js"],
        "express": ["expressjs", "express.js"],
        "next": ["nextjs", "next.js"],
        "nuxt": ["nuxtjs", "nuxt.js"],
        // Python ecosystem
        "python": ["python3", "py", "python 3"],
        "django": ["django rest", "drf"],
        "flask": ["flask api"],
        "fastapi": ["fast api"],
        // Databases
        "mongodb": ["mongo", "mongo db"],
        "postgresql": ["postgres", "psql", "pg"],
        "mysql": ["my sql"],
        "sql": ["sql server", "mssql", "t-sql"],
        "redis": ["redis cache"],
        // Cloud & DevOps
        "aws": ["amazon web services", "amazon aws"],
        "azure": ["microsoft azure", "ms azure"],
        "gcp": ["google cloud", "google cloud platform"],
        "docker": ["containerization", "containers"],
        "kubernetes": ["k8s", "kube"],
        "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous deployment"],
        // Mobile
        "react native": ["reactnative", "react-native", "rn"],
        "flutter": ["dart flutter"],
        "ios": ["swift", "objective-c", "objective c"],
        "android": ["kotlin", "java android"],
        // Other
        "machine learning": ["ml", "deep learning", "ai", "artificial intelligence"],
        "data science": ["data analysis", "data analytics"],
        "graphql": ["graph ql"],
        "rest api": ["restful", "rest", "restful api"],
        "git": ["github", "gitlab", "version control"],
        "agile": ["scrum", "kanban", "agile methodology"],
        "html": ["html5"],
        "css": ["css3", "scss", "sass", "less"],
        "tailwind": ["tailwindcss", "tailwind css"],
        "bootstrap": ["bootstrap 5", "bootstrap css"],
      };

      // Related skills map - for partial credit
      const relatedSkills: Record<string, string[]> = {
        "react": ["javascript", "html", "css", "redux", "jsx"],
        "angular": ["typescript", "javascript", "rxjs"],
        "vue": ["javascript", "html", "css"],
        "node": ["javascript", "express", "npm"],
        "python": ["django", "flask", "fastapi"],
        "java": ["spring", "maven", "gradle"],
        "typescript": ["javascript"],
        "next": ["react", "javascript", "typescript"],
        "docker": ["kubernetes", "devops"],
        "aws": ["cloud", "devops"],
      };

      // Function to normalize skill name
      const normalizeSkill = (skill: string): string => {
        const lower = skill.toLowerCase().trim();
        // Check if this skill is a synonym and return the canonical name
        for (const [canonical, synonyms] of Object.entries(skillSynonyms)) {
          if (lower === canonical || synonyms.includes(lower)) {
            return canonical;
          }
        }
        return lower;
      };

      // Function to check if candidate has skill (with semantic matching)
      const hasSkill = (candidateSkills: string[], requiredSkill: string): { matched: boolean; matchType: string } => {
        const normalizedRequired = normalizeSkill(requiredSkill);
        const normalizedCandidateSkills = candidateSkills.map(normalizeSkill);

        // Direct match (including synonyms)
        if (normalizedCandidateSkills.includes(normalizedRequired)) {
          return { matched: true, matchType: "exact" };
        }

        // Check if any candidate skill is a synonym
        for (const candSkill of normalizedCandidateSkills) {
          if (candSkill === normalizedRequired) {
            return { matched: true, matchType: "synonym" };
          }
        }

        // Check related skills for partial credit
        const related = relatedSkills[normalizedRequired] || [];
        for (const candSkill of normalizedCandidateSkills) {
          if (related.includes(candSkill)) {
            return { matched: true, matchType: "related" };
          }
        }

        return { matched: false, matchType: "none" };
      };

      // Support both new format (candidateId + jobId) and old format (candidateSkills + jobSkills)
      let candidate: any = null;
      let job: any = null;
      let candSkills: string[] = [];
      let reqSkills: string[] = [];

      if (candidateId && jobId) {
        // Fetch candidate and job from database
        candidate = await storage.getCandidateById(candidateId);
        job = await storage.getJob(jobId);

        if (!candidate || !job) {
          res.status(404).json({ message: "Candidate or job not found" });
          return;
        }

        candSkills = Array.isArray(candidate.skills) ? candidate.skills : [];
        reqSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
      } else {
        // Legacy format
        candSkills = Array.isArray(candidateSkills) ? candidateSkills.map(String) : [];
        reqSkills = Array.isArray(jobSkills) ? jobSkills.map(String) : [];
      }

      if (reqSkills.length === 0) {
        res.status(400).json({ message: "Job skills required" });
        return;
      }

      // Get must-have skills (critical skills with higher weight)
      const mustHaveSkills: string[] = job?.mustHaveSkills && Array.isArray(job.mustHaveSkills)
        ? job.mustHaveSkills
        : [];

      // Calculate skills match with semantic matching
      const matchedSkills = reqSkills.map((skill) => {
        const result = hasSkill(candSkills, skill);
        const isMustHave = mustHaveSkills.some(mh =>
          normalizeSkill(mh) === normalizeSkill(skill)
        );
        return {
          skill,
          matched: result.matched,
          matchType: result.matchType,
          isMustHave
        };
      });

      // Calculate skills score with must-have weighting
      // Must-have skills: 2x weight, Nice-to-have: 1x weight
      let skillPoints = 0;
      let totalWeight = 0;
      let mustHavesMissing = 0;

      for (const m of matchedSkills) {
        const weight = m.isMustHave ? 2 : 1;
        totalWeight += weight;

        if (m.matched) {
          const matchValue = (m.matchType === "related") ? 0.5 : 1;
          skillPoints += matchValue * weight;
        } else if (m.isMustHave) {
          mustHavesMissing++;
        }
      }

      // Calculate base skills score
      let skillsScore = totalWeight > 0 ? Math.round((skillPoints / totalWeight) * 100) : 0;

      // Penalty for missing must-have skills (each missing must-have reduces score by 15%)
      if (mustHavesMissing > 0) {
        const penalty = Math.min(mustHavesMissing * 15, 50); // Max 50% penalty
        skillsScore = Math.max(0, skillsScore - penalty);
      }

      // Calculate experience match (if candidate and job data available)
      let experienceScore = 50; // Default
      if (candidate && job) {
        const candidateYears = candidate.yearsOfExperience || candidate.experience || 0;
        const requiredYears = job.experience || 0;
        if (candidateYears >= requiredYears) {
          experienceScore = 100;
        } else if (candidateYears >= requiredYears * 0.7) {
          experienceScore = 75;
        } else if (candidateYears >= requiredYears * 0.5) {
          experienceScore = 50;
        } else {
          experienceScore = 25;
        }
      }

      // Calculate education match
      let educationScore = 75; // Default - assume good match
      if (candidate && job) {
        const candEducation = (candidate.education || "").toLowerCase();
        const jobEducation = (job.education || "").toLowerCase();
        if (candEducation && jobEducation) {
          if (candEducation.includes(jobEducation) || jobEducation.includes(candEducation)) {
            educationScore = 100;
          } else if (candEducation.includes("master") || candEducation.includes("phd")) {
            educationScore = 90;
          } else if (candEducation.includes("bachelor")) {
            educationScore = 75;
          } else {
            educationScore = 50;
          }
        }
      }

      // Calculate location match
      let locationScore = 75; // Default
      if (candidate && job) {
        const candLocation = (candidate.location || "").toLowerCase();
        const jobLocation = (job.location || "").toLowerCase();
        const jobType = (job.jobType || "").toLowerCase();

        if (jobLocation.includes("remote") || jobType.includes("remote")) {
          locationScore = 100;
        } else if (candLocation && jobLocation) {
          if (candLocation === jobLocation) {
            locationScore = 100;
          } else if (candLocation.includes(jobLocation) || jobLocation.includes(candLocation)) {
            locationScore = 75;
          } else {
            locationScore = 25;
          }
        }
      }

      // NEW: Calculate availability match
      let availabilityScore = 75; // Default
      if (candidate) {
        const status = (candidate.jobSearchStatus || "").toLowerCase();
        const availability = (candidate.availability || "").toLowerCase();

        if (status === "available" || status === "actively_looking") {
          availabilityScore = 100;
        } else if (status === "open" || availability.includes("immediate")) {
          availabilityScore = 90;
        } else if (availability.includes("2 week") || availability.includes("two week")) {
          availabilityScore = 85;
        } else if (availability.includes("1 month") || availability.includes("one month")) {
          availabilityScore = 70;
        } else if (status === "not_available" || status === "employed") {
          availabilityScore = 30;
        }
      }

      // NEW: Calculate salary match
      let salaryScore = 75; // Default
      if (candidate && job) {
        const expectedSalary = candidate.expectedSalary;
        const jobMinSalary = job.salary_min;
        const jobMaxSalary = job.salary_max;

        if (expectedSalary && (jobMinSalary || jobMaxSalary)) {
          // Parse expected salary (handle formats like "50000", "$50,000", "50k", "50000-60000")
          const parseSalary = (s: string): number => {
            const cleaned = s.replace(/[$,\s]/g, '').toLowerCase();
            if (cleaned.includes('k')) {
              return parseFloat(cleaned.replace('k', '')) * 1000;
            }
            // If range, take average
            if (cleaned.includes('-')) {
              const parts = cleaned.split('-').map(p => parseFloat(p));
              return (parts[0] + (parts[1] || parts[0])) / 2;
            }
            return parseFloat(cleaned) || 0;
          };

          const expectedAmount = parseSalary(String(expectedSalary));
          const minSalary = jobMinSalary || 0;
          const maxSalary = jobMaxSalary || minSalary * 1.5;

          if (expectedAmount > 0) {
            if (expectedAmount >= minSalary && expectedAmount <= maxSalary) {
              salaryScore = 100; // Perfect match
            } else if (expectedAmount < minSalary) {
              salaryScore = 100; // Candidate expects less - great for employer
            } else if (expectedAmount <= maxSalary * 1.1) {
              salaryScore = 80; // Slightly above budget
            } else if (expectedAmount <= maxSalary * 1.25) {
              salaryScore = 60; // Above budget but negotiable
            } else {
              salaryScore = 30; // Significantly above budget
            }
          }
        }
      }

      // Combine Location + Availability + Salary into one factor (equal sub-weights)
      const locationAndFitScore = Math.round(
        (locationScore * 0.4) + (availabilityScore * 0.3) + (salaryScore * 0.3)
      );

      // Calculate overall weighted score (OLD WEIGHTS with combined location factor at 20%)
      // Skills: 40%, Experience: 25%, Education: 15%, Location+Availability+Salary: 20%
      const overallScore = Math.round(
        (skillsScore * 0.40) +
        (experienceScore * 0.25) +
        (educationScore * 0.15) +
        (locationAndFitScore * 0.20)
      );

      res.json({
        score: overallScore,
        matchedSkills,
        mustHavesMissing,
        breakdown: {
          skills: skillsScore,
          experience: experienceScore,
          education: educationScore,
          locationAndFit: locationAndFitScore,
          // Sub-breakdown for location factor
          locationDetails: {
            location: locationScore,
            availability: availabilityScore,
            salary: salaryScore,
          },
        },
      });
    } catch (err) {
      console.error("Match scoring error:", err);
      res.status(500).json({ message: "match error" });
    }
  });

  app.post("/api/interview/generate", async (req, res) => {
    try {
      const { jobId, candidateId, jobTitle, skills, company } = req.body || {};

      let jobDetails: any = null;
      let base = String(jobTitle || "Software Engineer");
      let companyName = company || "the company";
      let requiredSkills: string[] = [];

      // If jobId is provided, fetch job details from database
      if (jobId) {
        jobDetails = await storage.getJob(jobId);
        if (jobDetails) {
          base = jobDetails.title || base;
          companyName = jobDetails.company || companyName;
          requiredSkills = Array.isArray(jobDetails.requiredSkills)
            ? jobDetails.requiredSkills
            : [];
        }
      }

      // Use skills from request body if provided
      const ks = Array.isArray(skills) && skills.length > 0
        ? skills.map(String)
        : requiredSkills;

      // Try Groq AI first (FREE - 14,400 requests/day)
      if (process.env.GROQ_API_KEY) {
        try {
          console.log("[Interview] Generating questions with Groq AI...");
          const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

          const prompt = `You are an expert interview coach. Generate 12 interview questions for a "${base}" position at "${companyName}".
${ks.length > 0 ? `Required skills: ${ks.join(", ")}` : ""}

Return ONLY a valid JSON array with NO markdown formatting, NO code blocks. Each question object must have:
- "question": the interview question (string)
- "category": one of "technical", "behavioral", "situational", or "company" (string)
- "difficulty": one of "easy", "medium", or "hard" (string)

Generate:
- 4 technical questions (related to ${ks.slice(0, 3).join(", ") || "the role"})
- 3 behavioral questions (STAR method style)
- 3 situational questions (hypothetical scenarios)
- 2 company-specific questions (about ${companyName})

Mix difficulties: 3 easy, 6 medium, 3 hard.
Make questions specific and relevant to ${base} role.`;

          const completion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "You are an interview question generator. Return ONLY valid JSON array, no markdown, no explanation."
              },
              { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 2000,
          });

          const responseText = completion.choices[0]?.message?.content?.trim() || "[]";

          // Clean JSON response
          let cleanedText = responseText;
          if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
          }

          const aiQuestions = JSON.parse(cleanedText);

          if (Array.isArray(aiQuestions) && aiQuestions.length > 0) {
            const questions = aiQuestions.map((q: any, i: number) => ({
              id: String(i + 1),
              question: q.question,
              category: q.category || "technical",
              difficulty: q.difficulty || "medium",
            }));

            console.log(`[Interview] Generated ${questions.length} questions with Groq AI`);

            res.json({
              jobTitle: base,
              company: companyName,
              questions,
              aiGenerated: true
            });
            return;
          }
        } catch (aiError) {
          console.warn("[Interview] Groq AI failed, using fallback:", aiError);
        }
      }

      // Fallback: Template-based questions
      console.log("[Interview] Using template-based questions (fallback)");

      const technicalQuestions = [
        { question: `Explain how you would design a scalable ${base} system.`, category: "technical", difficulty: "hard" },
        { question: `How would you optimize performance in a ${base} application?`, category: "technical", difficulty: "medium" },
        { question: `What trade-offs do you consider when choosing ${ks[0] || "a technology"}?`, category: "technical", difficulty: "easy" },
        { question: `Describe your experience with ${ks[1] || "modern development tools"} and how you've used it in production.`, category: "technical", difficulty: "medium" },
      ];

      const behavioralQuestions = [
        { question: `Describe a challenge you faced in a previous role and how you resolved it.`, category: "behavioral", difficulty: "medium" },
        { question: `Tell me about a time you influenced a team decision.`, category: "behavioral", difficulty: "easy" },
        { question: `How do you handle constructive criticism and feedback?`, category: "behavioral", difficulty: "easy" },
        { question: `Describe a situation where you had to work with a difficult team member.`, category: "behavioral", difficulty: "medium" },
      ];

      const companyQuestions = [
        { question: `Why do you want to work at ${companyName}?`, category: "company", difficulty: "easy" },
        { question: `What do you know about ${companyName}'s products/services?`, category: "company", difficulty: "easy" },
        { question: `How do you align with ${companyName}'s mission and values?`, category: "company", difficulty: "medium" },
      ];

      const situationalQuestions = [
        { question: `Given a priority conflict between two important features, how do you proceed?`, category: "situational", difficulty: "medium" },
        { question: `If you discovered a critical bug right before a major release, what would you do?`, category: "situational", difficulty: "hard" },
        { question: `How would you handle a situation where a stakeholder disagrees with your technical recommendation?`, category: "situational", difficulty: "medium" },
      ];

      const allQuestions = [
        ...technicalQuestions,
        ...behavioralQuestions,
        ...companyQuestions,
        ...situationalQuestions,
      ];

      const questions = allQuestions.map((q, i) => ({ id: String(i + 1), ...q }));

      res.json({
        jobTitle: base,
        company: companyName,
        questions,
        aiGenerated: false
      });
    } catch (err) {
      console.error("Interview generation error:", err);
      res.status(500).json({ message: "interview error" });
    }
  });

  // ============ AI-POWERED SKILL INSIGHTS ENDPOINTS (Gemini) ============

  // Get AI-powered skill recommendations
  app.post("/api/recommendations/skills", async (req, res) => {
    try {
      const { candidateSkills, goal, targetRole } = req.body || {};
      const skills = Array.isArray(candidateSkills) ? candidateSkills.map(String) : [];

      console.log("[Gemini Skills] Generating recommendations for:", { skills, goal, targetRole });

      const recommendations = await generateSkillRecommendations(skills, goal, targetRole);

      res.json({
        basedOn: String(goal || "career growth"),
        targetRole: targetRole || null,
        aiPowered: isGeminiAvailable(),
        recommendations
      });
    } catch (err) {
      console.error("[Gemini Skills] Recommendations error:", err);
      res.status(500).json({ message: "recommendations error" });
    }
  });

  // Analyze market demand for skills
  app.post("/api/skills/market-demand", async (req, res) => {
    try {
      const { skills } = req.body || {};
      const skillsList = Array.isArray(skills) ? skills.map(String) : [];

      if (skillsList.length === 0) {
        res.status(400).json({ message: "skills array required" });
        return;
      }

      console.log("[Gemini Skills] Analyzing market demand for:", skillsList);

      const insights = await analyzeSkillsMarketDemand(skillsList);

      res.json({
        aiPowered: isGeminiAvailable(),
        analyzedAt: new Date().toISOString(),
        insights
      });
    } catch (err) {
      console.error("[Gemini Skills] Market demand error:", err);
      res.status(500).json({ message: "market demand analysis error" });
    }
  });

  // Suggest career paths based on skills
  app.post("/api/skills/career-paths", async (req, res) => {
    try {
      const { currentSkills, yearsOfExperience, currentRole } = req.body || {};
      const skills = Array.isArray(currentSkills) ? currentSkills.map(String) : [];

      console.log("[Gemini Skills] Suggesting career paths for:", { skills, yearsOfExperience, currentRole });

      const careerPaths = await suggestCareerPaths(skills, yearsOfExperience, currentRole);

      res.json({
        aiPowered: isGeminiAvailable(),
        basedOn: {
          skills: skills.length,
          experience: yearsOfExperience || "not specified",
          currentRole: currentRole || "not specified"
        },
        careerPaths
      });
    } catch (err) {
      console.error("[Gemini Skills] Career paths error:", err);
      res.status(500).json({ message: "career paths suggestion error" });
    }
  });

  // Skill gap analysis for target role
  app.post("/api/skills/gap-analysis", async (req, res) => {
    try {
      const { currentSkills, targetRole } = req.body || {};
      const skills = Array.isArray(currentSkills) ? currentSkills.map(String) : [];

      if (!targetRole) {
        res.status(400).json({ message: "targetRole is required" });
        return;
      }

      console.log("[Gemini Skills] Analyzing skill gap for:", { skills, targetRole });

      const analysis = await analyzeSkillGap(skills, targetRole);

      res.json({
        aiPowered: isGeminiAvailable(),
        analysis
      });
    } catch (err) {
      console.error("[Gemini Skills] Gap analysis error:", err);
      res.status(500).json({ message: "skill gap analysis error" });
    }
  });

  // Check if Gemini AI is available
  app.get("/api/skills/ai-status", (_req, res) => {
    res.json({
      geminiAvailable: isGeminiAvailable(),
      provider: isGeminiAvailable() ? "Google Gemini" : "Fallback (Static Data)"
    });
  });

  app.post("/api/availability", async (req, res) => {
    try {
      const availability = req.body || {};
      if (!availability) {
        res.status(400).json({ message: "invalid request" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "availability error" });
    }
  });

  // ============ JOB MANAGEMENT ENDPOINTS ============
  app.post("/api/jobs", requireRole(["recruiter"]), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const body = req.body || {};
      const parsed = insertJobSchema.safeParse({ ...body, recruiterId: userId });
      if (!parsed.success) {
        res.status(400).json({ message: "invalid request", errors: parsed.error.flatten() });
        return;
      }
      const job = await storage.createJob(parsed.data);
      res.json(job);
    } catch (err) {
      res.status(500).json({ message: "job creation error" });
    }
  });

  app.get("/api/jobs", async (req: Request, res: Response) => {
    console.log("[route] GET /api/jobs - START");
    try {
      const userId = req.session?.userId;
      const userRole = req.session?.userRole;

      console.log("[route] GET /api/jobs - Calling storage.getAllJobs()");
      const allJobs = await storage.getAllJobs();

      // If user is a recruiter, only show their own jobs
      // Candidates and guests can see all jobs (to browse and apply)
      let jobs = allJobs;
      if (userRole === "recruiter" && userId) {
        jobs = allJobs.filter((job: any) => job.recruiterId === userId);
        console.log(`[route] GET /api/jobs - Filtered to ${jobs.length} jobs for recruiter ${userId}`);
      }

      console.log("[route] GET /api/jobs - Got jobs, sending response");
      res.json(jobs);
    } catch (err) {
      console.error("[route] GET /api/jobs - ERROR:", err);
      res.status(500).json({ message: "fetch jobs error" });
    }
  });

  app.get("/api/jobs/:id", async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ message: "job not found" });
        return;
      }
      res.json(job);
    } catch (err) {
      res.status(500).json({ message: "fetch job error" });
    }
  });

  app.put("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const job = await storage.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ message: "job not found" });
        return;
      }
      if (job.recruiterId !== userId) {
        res.status(403).json({ message: "forbidden" });
        return;
      }
      const updated = await storage.updateJob(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "update job error" });
    }
  });

  app.delete("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const job = await storage.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ message: "job not found" });
        return;
      }
      if (job.recruiterId !== userId) {
        res.status(403).json({ message: "forbidden" });
        return;
      }
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        res.status(500).json({ message: "failed to delete job" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "delete job error" });
    }
  });

  // ============ CANDIDATE PROFILE ENDPOINTS ============
  app.get("/api/candidates", requireAuth, async (req: Request, res: Response) => {
    try {
      const candidates = await storage.getAllCandidates();
      res.json(candidates);
    } catch (err) {
      console.error("Get all candidates error:", err);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.post("/api/candidates", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const body = req.body || {};
      const parsed = insertCandidateSchema.safeParse({ ...body, userId });
      if (!parsed.success) {
        res.status(400).json({ message: "invalid request", errors: parsed.error.flatten() });
        return;
      }
      const candidate = await storage.createOrUpdateCandidate(parsed.data);
      res.json(candidate);
    } catch (err) {
      res.status(500).json({ message: "candidate creation error" });
    }
  });

  app.get("/api/candidates/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const candidate = await storage.getCandidate(userId);
      if (!candidate) {
        res.status(404).json({ message: "candidate profile not found" });
        return;
      }
      res.json(candidate);
    } catch (err) {
      res.status(500).json({ message: "fetch candidate error" });
    }
  });

  app.put("/api/candidates/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const body = req.body || {};
      const parsed = insertCandidateSchema.partial().safeParse(body);
      if (!parsed.success) {
        res.status(400).json({ message: "invalid request", errors: parsed.error.flatten() });
        return;
      }
      const candidate = await storage.createOrUpdateCandidate({ ...parsed.data, userId });
      res.json(candidate);
    } catch (err) {
      res.status(500).json({ message: "update candidate error" });
    }
  });

  // Update candidate by ID (for recruiters)
  app.put("/api/candidates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      // Only recruiters and admins can update other candidates
      if (userRole !== "recruiter" && userRole !== "admin") {
        res.status(403).json({ message: "forbidden - only recruiters can update candidates" });
        return;
      }
      const candidateId = req.params.id;
      const body = req.body || {};
      const parsed = insertCandidateSchema.partial().safeParse(body);
      if (!parsed.success) {
        res.status(400).json({ message: "invalid request", errors: parsed.error.flatten() });
        return;
      }

      // Get the existing candidate
      const existingCandidate = await storage.getCandidateById(candidateId);
      if (!existingCandidate) {
        res.status(404).json({ message: "candidate not found" });
        return;
      }

      // Update the candidate
      const candidate = await storage.createOrUpdateCandidate({
        ...parsed.data,
        userId: existingCandidate.userId
      });
      res.json(candidate);
    } catch (err) {
      res.status(500).json({ message: "update candidate error" });
    }
  });

  // AI-Powered Resume upload endpoint
  app.post("/api/candidates/resume", requireAuth, upload.single("resume"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: "no file uploaded" });
        return;
      }

      const filePath = req.file.path;
      const fileType = req.file.mimetype;
      const resumeUrl = `/api/candidates/resume/${req.file.filename}`;

      console.log("[route] Processing resume with AI...");
      console.log("[route] File path:", filePath);
      console.log("[route] File type:", fileType);

      // Extract and parse resume with AI
      const extractedData = await processResume(filePath, fileType);

      console.log("[route] Extracted data:", JSON.stringify(extractedData, null, 2));

      // Get existing candidate or prepare for update
      const existingCandidate = await storage.getCandidate(userId);

      // Prepare update data
      const updateData: any = {
        userId,
        resume_url: resumeUrl,
      };

      // Update with extracted data
      if (extractedData.bio) updateData.bio = extractedData.bio;
      if (extractedData.location) updateData.location = extractedData.location;
      if (extractedData.skills && extractedData.skills.length > 0) {
        updateData.skills = extractedData.skills;
      }
      if (extractedData.yearsOfExperience) {
        updateData.yearsOfExperience = extractedData.yearsOfExperience;
      }
      if (extractedData.experience && extractedData.experience.length > 0) {
        updateData.experienceDetails = JSON.stringify(extractedData.experience);
      }
      if (extractedData.education && extractedData.education.length > 0) {
        updateData.educationDetails = JSON.stringify(extractedData.education);
      }

      // LinkedIn-style sections
      if (extractedData.certifications && extractedData.certifications.length > 0) {
        updateData.certificationsDetails = JSON.stringify(extractedData.certifications);
      }
      if (extractedData.projects && extractedData.projects.length > 0) {
        updateData.projectsDetails = JSON.stringify(extractedData.projects);
      }
      if (extractedData.languages && extractedData.languages.length > 0) {
        updateData.languagesDetails = JSON.stringify(extractedData.languages);
      }
      if (extractedData.volunteer && extractedData.volunteer.length > 0) {
        updateData.volunteerDetails = JSON.stringify(extractedData.volunteer);
      }
      if (extractedData.awards && extractedData.awards.length > 0) {
        updateData.awardsDetails = JSON.stringify(extractedData.awards);
      }
      if (extractedData.publications && extractedData.publications.length > 0) {
        updateData.publicationsDetails = JSON.stringify(extractedData.publications);
      }
      if (extractedData.courses && extractedData.courses.length > 0) {
        updateData.coursesDetails = JSON.stringify(extractedData.courses);
      }

      // Update name fields in candidate
      if (extractedData.name) {
        const nameParts = extractedData.name.split(" ");
        if (nameParts.length > 0) {
          updateData.firstName = nameParts[0];
          if (nameParts.length > 1) {
            updateData.lastName = nameParts.slice(1).join(" ");
          }
        }
      }

      // Update candidate profile
      const candidate = await storage.createOrUpdateCandidate(updateData);

      // Also update user table with extracted email and phone
      const user = await storage.getUser(userId);
      if (user) {
        const userUpdates: any = {};
        if (extractedData.email && !user.email) {
          userUpdates.email = extractedData.email;
        }
        if (extractedData.phone) {
          userUpdates.phone = extractedData.phone;
        }
        if (extractedData.name && !user.email) {
          // If user doesn't have email, try to use name for updates
          userUpdates.username = user.username; // keep existing
        }
        if (Object.keys(userUpdates).length > 0) {
          await storage.updateUser(userId, userUpdates);
        }
      }

      res.json({
        message: "resume uploaded and processed successfully",
        resumeUrl,
        filename: req.file.filename,
        extractedData,
        candidate,
      });
    } catch (err) {
      console.error("[route] Resume upload error:", err);
      res.status(500).json({ message: "resume upload error", error: String(err) });
    }
  });

  // Resume download endpoint
  app.get("/api/candidates/resume/:filename", async (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadsDir, filename);

      // Check if file exists
      if (!existsSync(filePath)) {
        res.status(404).json({ message: "resume not found" });
        return;
      }

      // Send file
      res.sendFile(filePath);
    } catch (err) {
      console.error("[route] Resume download error:", err);
      res.status(500).json({ message: "resume download error" });
    }
  });

  // Generate and download CV as PDF
  app.get("/api/candidates/cv/download", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      const candidate = await storage.getCandidate(userId);
      if (!candidate) {
        res.status(404).json({ message: "candidate not found" });
        return;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "user not found" });
        return;
      }

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="CV_${candidate.firstName || "Candidate"}_${candidate.lastName || ""}.pdf"`
      );

      // Pipe PDF to response
      doc.pipe(res);

      // Header - Name and Title
      doc.fontSize(24).font("Helvetica-Bold").text(
        `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim() || "Your Name",
        { align: "center" }
      );
      doc.moveDown(0.3);

      if (candidate.headline) {
        doc.fontSize(14).font("Helvetica").fillColor("#666666").text(
          candidate.headline,
          { align: "center" }
        );
      }
      doc.moveDown(1);

      // Contact Information
      doc.fillColor("#000000").fontSize(10);
      const contactInfo = [];
      if (user.email) contactInfo.push(`Email: ${user.email}`);
      if (user.phone) contactInfo.push(`Phone: ${user.phone}`);
      if (candidate.location) contactInfo.push(`Location: ${candidate.location}`);

      if (contactInfo.length > 0) {
        doc.text(contactInfo.join(" | "), { align: "center" });
        doc.moveDown(1.5);
      }

      // Professional Summary
      if (candidate.bio) {
        doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("PROFESSIONAL SUMMARY");
        doc.moveDown(0.5);
        doc.fontSize(10).font("Helvetica").fillColor("#000000").text(candidate.bio, {
          align: "justify",
        });
        doc.moveDown(1.5);
      }

      // Skills
      if (candidate.skills && candidate.skills.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("SKILLS");
        doc.moveDown(0.5);
        doc.fontSize(10).font("Helvetica").fillColor("#000000").text(
          candidate.skills.join(" • "),
          { align: "justify" }
        );
        doc.moveDown(1.5);
      }

      // Experience
      if (candidate.experienceDetails) {
        try {
          const experience = JSON.parse(candidate.experienceDetails);
          if (Array.isArray(experience) && experience.length > 0) {
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("EXPERIENCE");
            doc.moveDown(0.5);

            experience.forEach((exp: any, index: number) => {
              doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(exp.title || "Position");
              doc.fontSize(10).font("Helvetica").fillColor("#666666").text(
                `${exp.company || "Company"} | ${exp.duration || ""}`
              );
              doc.moveDown(0.3);

              if (exp.description) {
                if (Array.isArray(exp.description)) {
                  exp.description.forEach((item: string) => {
                    doc.fontSize(10).fillColor("#000000").text(`• ${item}`, {
                      indent: 10,
                      align: "justify",
                    });
                  });
                } else {
                  doc.fontSize(10).fillColor("#000000").text(exp.description, {
                    align: "justify",
                  });
                }
              }

              if (index < experience.length - 1) {
                doc.moveDown(1);
              }
            });
            doc.moveDown(1.5);
          }
        } catch (err) {
          console.error("Error parsing experience:", err);
        }
      }

      // Education
      if (candidate.educationDetails) {
        try {
          const education = JSON.parse(candidate.educationDetails);
          if (Array.isArray(education) && education.length > 0) {
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("EDUCATION");
            doc.moveDown(0.5);

            education.forEach((edu: any, index: number) => {
              doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(edu.degree || "Degree");
              doc.fontSize(10).font("Helvetica").fillColor("#666666").text(
                `${edu.institution || "Institution"} | ${edu.year || ""}`
              );

              if (index < education.length - 1) {
                doc.moveDown(0.8);
              }
            });
            doc.moveDown(1.5);
          }
        } catch (err) {
          console.error("Error parsing education:", err);
        }
      }

      // Certifications
      if (candidate.certificationsDetails) {
        try {
          const certifications = JSON.parse(candidate.certificationsDetails);
          if (Array.isArray(certifications) && certifications.length > 0) {
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("CERTIFICATIONS");
            doc.moveDown(0.5);

            certifications.forEach((cert: any, index: number) => {
              doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(cert.name || "Certification");
              doc.fontSize(10).font("Helvetica").fillColor("#666666").text(
                `${cert.issuer || "Issuer"} | ${cert.date || ""}`
              );
              if (cert.credentialId) {
                doc.fontSize(9).fillColor("#888888").text(`Credential ID: ${cert.credentialId}`);
              }

              if (index < certifications.length - 1) {
                doc.moveDown(0.8);
              }
            });
            doc.moveDown(1.5);
          }
        } catch (err) {
          console.error("Error parsing certifications:", err);
        }
      }

      // Projects
      if (candidate.projectsDetails) {
        try {
          const projects = JSON.parse(candidate.projectsDetails);
          if (Array.isArray(projects) && projects.length > 0) {
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("PROJECTS");
            doc.moveDown(0.5);

            projects.forEach((project: any, index: number) => {
              doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(project.title || "Project");
              if (project.date) {
                doc.fontSize(10).font("Helvetica").fillColor("#666666").text(project.date);
              }
              if (project.description) {
                doc.moveDown(0.2);
                doc.fontSize(10).fillColor("#000000").text(project.description, { align: "justify" });
              }
              if (project.technologies && Array.isArray(project.technologies) && project.technologies.length > 0) {
                doc.moveDown(0.2);
                doc.fontSize(9).fillColor("#666666").text(`Technologies: ${project.technologies.join(", ")}`);
              }

              if (index < projects.length - 1) {
                doc.moveDown(1);
              }
            });
            doc.moveDown(1.5);
          }
        } catch (err) {
          console.error("Error parsing projects:", err);
        }
      }

      // Languages
      if (candidate.languagesDetails) {
        try {
          const languages = JSON.parse(candidate.languagesDetails);
          if (Array.isArray(languages) && languages.length > 0) {
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("LANGUAGES");
            doc.moveDown(0.5);

            const languageList = languages.map((lang: any) =>
              `${lang.language || "Language"} (${lang.proficiency || "Proficiency"})`
            ).join(" • ");
            doc.fontSize(10).font("Helvetica").fillColor("#000000").text(languageList);
            doc.moveDown(1.5);
          }
        } catch (err) {
          console.error("Error parsing languages:", err);
        }
      }

      // Volunteer Experience
      if (candidate.volunteerDetails) {
        try {
          const volunteer = JSON.parse(candidate.volunteerDetails);
          if (Array.isArray(volunteer) && volunteer.length > 0) {
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("VOLUNTEER EXPERIENCE");
            doc.moveDown(0.5);

            volunteer.forEach((vol: any, index: number) => {
              doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(vol.role || "Role");
              doc.fontSize(10).font("Helvetica").fillColor("#666666").text(
                `${vol.organization || "Organization"} | ${vol.duration || ""}`
              );
              if (vol.description) {
                doc.moveDown(0.2);
                doc.fontSize(10).fillColor("#000000").text(vol.description, { align: "justify" });
              }

              if (index < volunteer.length - 1) {
                doc.moveDown(1);
              }
            });
            doc.moveDown(1.5);
          }
        } catch (err) {
          console.error("Error parsing volunteer:", err);
        }
      }

      // Awards & Honors
      if (candidate.awardsDetails) {
        try {
          const awards = JSON.parse(candidate.awardsDetails);
          if (Array.isArray(awards) && awards.length > 0) {
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("AWARDS & HONORS");
            doc.moveDown(0.5);

            awards.forEach((award: any, index: number) => {
              doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(award.title || "Award");
              doc.fontSize(10).font("Helvetica").fillColor("#666666").text(
                `${award.issuer || "Issuer"} | ${award.date || ""}`
              );
              if (award.description) {
                doc.moveDown(0.2);
                doc.fontSize(10).fillColor("#000000").text(award.description, { align: "justify" });
              }

              if (index < awards.length - 1) {
                doc.moveDown(0.8);
              }
            });
            doc.moveDown(1.5);
          }
        } catch (err) {
          console.error("Error parsing awards:", err);
        }
      }

      // Publications
      if (candidate.publicationsDetails) {
        try {
          const publications = JSON.parse(candidate.publicationsDetails);
          if (Array.isArray(publications) && publications.length > 0) {
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("PUBLICATIONS");
            doc.moveDown(0.5);

            publications.forEach((pub: any, index: number) => {
              doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(pub.title || "Publication");
              doc.fontSize(10).font("Helvetica").fillColor("#666666").text(
                `${pub.publisher || "Publisher"} | ${pub.date || ""}`
              );
              if (pub.description) {
                doc.moveDown(0.2);
                doc.fontSize(10).fillColor("#000000").text(pub.description, { align: "justify" });
              }

              if (index < publications.length - 1) {
                doc.moveDown(0.8);
              }
            });
            doc.moveDown(1.5);
          }
        } catch (err) {
          console.error("Error parsing publications:", err);
        }
      }

      // Courses
      if (candidate.coursesDetails) {
        try {
          const courses = JSON.parse(candidate.coursesDetails);
          if (Array.isArray(courses) && courses.length > 0) {
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#2563eb").text("COURSES & TRAINING");
            doc.moveDown(0.5);

            courses.forEach((course: any, index: number) => {
              doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(course.name || "Course");
              doc.fontSize(10).font("Helvetica").fillColor("#666666").text(
                `${course.institution || "Institution"} | ${course.date || ""}`
              );

              if (index < courses.length - 1) {
                doc.moveDown(0.8);
              }
            });
          }
        } catch (err) {
          console.error("Error parsing courses:", err);
        }
      }

      // Finalize PDF
      doc.end();
    } catch (err) {
      console.error("[route] CV download error:", err);
      res.status(500).json({ message: "cv generation error" });
    }
  });

  // Delete resume endpoint
  app.delete("/api/candidates/resume", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      const candidate = await storage.getCandidate(userId);
      if (!candidate || !candidate.resume_url) {
        res.status(404).json({ message: "no resume found" });
        return;
      }

      // Extract filename from URL
      const filename = candidate.resume_url.split("/").pop();
      if (filename) {
        const filePath = path.join(uploadsDir, filename);
        if (existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      }

      // Update candidate profile to remove resume URL
      await storage.createOrUpdateCandidate({
        userId,
        resume_url: null,
      });

      res.json({ message: "resume deleted successfully" });
    } catch (err) {
      console.error("[route] Resume delete error:", err);
      res.status(500).json({ message: "resume delete error" });
    }
  });

  app.get("/api/candidates/:id", async (req: Request, res: Response) => {
    try {
      const candidate = await storage.getCandidateById(req.params.id);
      if (!candidate) {
        res.status(404).json({ message: "candidate not found" });
        return;
      }
      res.json(candidate);
    } catch (err) {
      res.status(500).json({ message: "fetch candidate error" });
    }
  });

  // ============ APPLICATION ENDPOINTS ============
  app.post("/api/applications", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const candidate = await storage.getCandidate(userId);
      if (!candidate) {
        res.status(400).json({ message: "candidate profile required" });
        return;
      }
      const body = req.body || {};
      const parsed = insertApplicationSchema.safeParse({ ...body, candidateId: candidate.id });
      if (!parsed.success) {
        res.status(400).json({ message: "invalid request", errors: parsed.error.flatten() });
        return;
      }
      const application = await storage.createApplication(parsed.data);
      res.json(application);
    } catch (err) {
      res.status(500).json({ message: "application error" });
    }
  });

  app.get("/api/applications/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const candidate = await storage.getCandidate(userId);
      if (!candidate) {
        res.status(404).json({ message: "candidate not found" });
        return;
      }
      const applications = await storage.getApplicationsByCandidate(candidate.id);
      res.json(applications);
    } catch (err) {
      res.status(500).json({ message: "fetch applications error" });
    }
  });

  app.get("/api/jobs/:jobId/applications", requireRole(["recruiter"]), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        res.status(404).json({ message: "job not found" });
        return;
      }
      if (job.recruiterId !== userId) {
        res.status(403).json({ message: "forbidden" });
        return;
      }
      const applications = await storage.getApplicationsByJob(req.params.jobId);
      res.json(applications);
    } catch (err) {
      res.status(500).json({ message: "fetch applications error" });
    }
  });

  app.put("/api/applications/:id/status", async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const { status } = req.body || {};
      if (!status) {
        res.status(400).json({ message: "status required" });
        return;
      }
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        res.status(404).json({ message: "application not found" });
        return;
      }
      const job = await storage.getJob(application.jobId);
      if (!job || job.recruiterId !== userId) {
        res.status(403).json({ message: "forbidden" });
        return;
      }
      const updated = await storage.updateApplicationStatus(req.params.id, status);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "update application error" });
    }
  });

  app.delete("/api/applications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        res.status(404).json({ message: "application not found" });
        return;
      }
      const candidate = await storage.getCandidate(userId);
      if (!candidate || application.candidateId !== candidate.id) {
        res.status(403).json({ message: "forbidden" });
        return;
      }
      if (application.status !== "applied") {
        res.status(400).json({ message: "can only withdraw applications with 'applied' status" });
        return;
      }
      const deleted = await storage.deleteApplication(req.params.id);
      if (!deleted) {
        res.status(500).json({ message: "failed to delete application" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "withdraw application error" });
    }
  });

  // ============ SAVED JOBS ENDPOINTS ============

  // Save a job for later
  app.post("/api/saved-jobs", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      const { jobId } = req.body;
      if (!jobId) {
        res.status(400).json({ message: "jobId required" });
        return;
      }

      const candidate = await storage.getCandidate(userId);
      if (!candidate) {
        res.status(404).json({ message: "candidate not found" });
        return;
      }

      // Check if job exists
      const job = await storage.getJob(jobId);
      if (!job) {
        res.status(404).json({ message: "job not found" });
        return;
      }

      // Check if already saved
      const existingSave = await storage.getSavedJob(candidate.id, jobId);
      if (existingSave) {
        res.status(400).json({ message: "job already saved" });
        return;
      }

      const savedJob = await storage.saveJob(candidate.id, jobId);
      res.json(savedJob);
    } catch (err) {
      console.error("Save job error:", err);
      res.status(500).json({ message: "save job error" });
    }
  });

  // Get all saved jobs for current user
  app.get("/api/saved-jobs/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      const candidate = await storage.getCandidate(userId);
      if (!candidate) {
        res.status(404).json({ message: "candidate not found" });
        return;
      }

      const savedJobs = await storage.getSavedJobsByCandidate(candidate.id);
      res.json({ savedJobs });
    } catch (err) {
      console.error("Get saved jobs error:", err);
      res.status(500).json({ message: "get saved jobs error" });
    }
  });

  // Remove a saved job
  app.delete("/api/saved-jobs/:jobId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      const candidate = await storage.getCandidate(userId);
      if (!candidate) {
        res.status(404).json({ message: "candidate not found" });
        return;
      }

      const deleted = await storage.deleteSavedJob(candidate.id, req.params.jobId);
      if (!deleted) {
        res.status(404).json({ message: "saved job not found" });
        return;
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("Delete saved job error:", err);
      res.status(500).json({ message: "delete saved job error" });
    }
  });

  // ============ ADMIN ENDPOINTS ============
  app.get("/api/admin/users", requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send passwords to frontend
      const sanitizedUsers = users.map(u => ({ ...u, password: undefined }));
      res.json(sanitizedUsers);
    } catch (err) {
      res.status(500).json({ message: "fetch users error" });
    }
  });

  app.put("/api/admin/users/:id", requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body || {};

      // Don't allow password updates through this endpoint
      delete updates.password;
      delete updates.id;
      delete updates.createdAt;

      const updated = await storage.updateUser(id, updates);
      if (!updated) {
        res.status(404).json({ message: "user not found" });
        return;
      }

      // Don't send password to frontend
      res.json({ ...updated, password: undefined });
    } catch (err) {
      res.status(500).json({ message: "update user error" });
    }
  });

  app.delete("/api/admin/users/:id", requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      // Prevent admin from deleting themselves
      if (id === userId) {
        res.status(400).json({ message: "cannot delete own account" });
        return;
      }

      const success = await storage.deleteUser(id);
      if (!success) {
        res.status(404).json({ message: "user not found" });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "delete user error" });
    }
  });

  app.get("/api/admin/applications", requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const applications = await storage.getAllApplications();
      res.json(applications);
    } catch (err) {
      res.status(500).json({ message: "fetch applications error" });
    }
  });

  app.get("/api/admin/stats", requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const jobs = await storage.getAllJobs();
      const applications = await storage.getAllApplications();

      const stats = {
        totalUsers: users.length,
        candidateCount: users.filter(u => u.role === "candidate").length,
        recruiterCount: users.filter(u => u.role === "recruiter").length,
        adminCount: users.filter(u => u.role === "admin").length,
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.isActive).length,
        totalApplications: applications.length,
        pendingApplications: applications.filter(a => a.status === "applied").length,
        shortlistedApplications: applications.filter(a => a.status === "shortlisted").length,
      };

      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "fetch stats error" });
    }
  });

  // ============ CONTACT REQUEST ENDPOINTS ============

  // Recruiter sends contact request to candidate
  app.post("/api/contact-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const recruiterId = req.session.userId;
      const userRole = req.session.userRole;

      if (!recruiterId || userRole !== "recruiter") {
        res.status(403).json({ message: "Only recruiters can send contact requests" });
        return;
      }

      const { candidateId, jobId, message } = req.body || {};
      if (!candidateId) {
        res.status(400).json({ message: "candidateId is required" });
        return;
      }

      // Check if request already exists
      const existing = await storage.getContactRequest(recruiterId, candidateId);
      if (existing) {
        res.status(409).json({ message: "Contact request already sent", status: existing.status });
        return;
      }

      const request = await storage.createContactRequest(recruiterId, candidateId, jobId, message);
      res.json(request);
    } catch (err) {
      console.error("Create contact request error:", err);
      res.status(500).json({ message: "Failed to create contact request" });
    }
  });

  // Get contact requests for candidate (their notifications)
  app.get("/api/contact-requests/candidate", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      const candidate = await storage.getCandidate(userId);
      if (!candidate) {
        res.status(404).json({ message: "Candidate profile not found" });
        return;
      }

      const requests = await storage.getContactRequestsByCandidate(candidate.id);

      // Get recruiter details for each request
      const requestsWithDetails = await Promise.all(
        requests.map(async (req: any) => {
          const recruiter = await storage.getUser(req.recruiterId);
          const job = req.jobId ? await storage.getJob(req.jobId) : null;
          return {
            ...req,
            recruiterName: recruiter?.username || "Unknown Recruiter",
            jobTitle: job?.title || null,
          };
        })
      );

      res.json(requestsWithDetails);
    } catch (err) {
      console.error("Get contact requests error:", err);
      res.status(500).json({ message: "Failed to fetch contact requests" });
    }
  });

  // Get contact requests sent by recruiter (to check approval status)
  app.get("/api/contact-requests/recruiter", requireAuth, async (req: Request, res: Response) => {
    try {
      const recruiterId = req.session.userId;
      if (!recruiterId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      const requests = await storage.getContactRequestsByRecruiter(recruiterId);
      res.json(requests);
    } catch (err) {
      console.error("Get recruiter contact requests error:", err);
      res.status(500).json({ message: "Failed to fetch contact requests" });
    }
  });

  // Candidate responds to contact request (approve/reject)
  app.put("/api/contact-requests/:id/respond", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      const { id } = req.params;
      const { status } = req.body || {};

      if (!status || !["approved", "rejected"].includes(status)) {
        res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
        return;
      }

      const updated = await storage.updateContactRequestStatus(id, status);
      if (!updated) {
        res.status(404).json({ message: "Contact request not found" });
        return;
      }

      res.json(updated);
    } catch (err) {
      console.error("Update contact request error:", err);
      res.status(500).json({ message: "Failed to update contact request" });
    }
  });

  // Check if recruiter has approved access to candidate
  app.get("/api/contact-requests/check/:candidateId", requireAuth, async (req: Request, res: Response) => {
    try {
      const recruiterId = req.session.userId;
      if (!recruiterId) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      const { candidateId } = req.params;
      const request = await storage.getContactRequest(recruiterId, candidateId);

      res.json({
        hasAccess: request?.status === "approved",
        status: request?.status || null,
        requestExists: !!request,
      });
    } catch (err) {
      console.error("Check contact request error:", err);
      res.status(500).json({ message: "Failed to check contact request" });
    }
  });

  return httpServer;
}
