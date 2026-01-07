// API Client for TalentHub Pro
// Centralized API calls for all frontend components

const API_BASE = "/api";

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
  error?: string;
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============ AUTH ENDPOINTS ============
export const auth = {
  register: (data: {
    username: string;
    password: string;
    email: string;
    role: "candidate" | "recruiter" | "admin";
  }) =>
    apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (username: string, password: string) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    apiCall("/auth/logout", {
      method: "POST",
    }),

  getMe: () => apiCall("/auth/me"),
};

// ============ JOB ENDPOINTS ============
export const jobs = {
  create: (jobData: {
    title: string;
    description: string;
    requiredSkills?: string[];
    location?: string;
    salary_min?: number;
    salary_max?: number;
    jobType?: string;
  }) =>
    apiCall("/jobs", {
      method: "POST",
      body: JSON.stringify(jobData),
    }),

  getAll: () => apiCall("/jobs"),

  getById: (id: string) => apiCall(`/jobs/${id}`),

  update: (id: string, jobData: any) =>
    apiCall(`/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(jobData),
    }),

  getApplications: (jobId: string) =>
    apiCall(`/jobs/${jobId}/applications`),
};

// ============ CANDIDATE ENDPOINTS ============
export const candidates = {
  createOrUpdate: (candidateData: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    location?: string;
    skills?: string[];
    experience?: number;
    headline?: string;
  }) =>
    apiCall("/candidates", {
      method: "POST",
      body: JSON.stringify(candidateData),
    }),

  getMe: () => apiCall("/candidates/me"),

  getById: (id: string) => apiCall(`/candidates/${id}`),
};

// ============ APPLICATION ENDPOINTS ============
export const applications = {
  create: (jobId: string, candidateId: string, coverLetter?: string) =>
    apiCall("/applications", {
      method: "POST",
      body: JSON.stringify({ jobId, candidateId, coverLetter }),
    }),

  getMyApplications: () => apiCall("/applications/me"),

  updateStatus: (applicationId: string, status: string) =>
    apiCall(`/applications/${applicationId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  withdraw: (applicationId: string) =>
    apiCall(`/applications/${applicationId}`, {
      method: "DELETE",
    }),
};

// ============ AI ENDPOINTS ============
export const ai = {
  chat: (message: string, context?: string) =>
    apiCall("/chat", {
      method: "POST",
      body: JSON.stringify({ message, context }),
    }),

  matchScore: (candidateSkills: string[], jobSkills: string[]) =>
    apiCall("/match/score", {
      method: "POST",
      body: JSON.stringify({ candidateSkills, jobSkills }),
    }),

  generateInterviewQuestions: (jobTitle: string, skills: string[]) =>
    apiCall("/interview/generate", {
      method: "POST",
      body: JSON.stringify({ jobTitle, skills }),
    }),

  getSkillRecommendations: (candidateSkills: string[], goal?: string, targetRole?: string) =>
    apiCall("/recommendations/skills", {
      method: "POST",
      body: JSON.stringify({ candidateSkills, goal, targetRole }),
    }),
};

// ============ SKILL INSIGHTS ENDPOINTS (Gemini AI) ============
export const skillInsights = {
  // Get AI status (check if Gemini is available)
  getAIStatus: () => apiCall<{ geminiAvailable: boolean; provider: string }>("/skills/ai-status"),

  // Get market demand analysis for skills
  getMarketDemand: (skills: string[]) =>
    apiCall<{
      aiPowered: boolean;
      analyzedAt: string;
      insights: Array<{
        skillName: string;
        marketDemand: "high" | "medium" | "low";
        demandTrend: "rising" | "stable" | "declining";
        averageSalaryImpact: string;
        topIndustries: string[];
        relatedSkills: string[];
        learningPath?: string;
      }>;
    }>("/skills/market-demand", {
      method: "POST",
      body: JSON.stringify({ skills }),
    }),

  // Get career path suggestions based on skills
  getCareerPaths: (currentSkills: string[], yearsOfExperience?: number, currentRole?: string) =>
    apiCall<{
      aiPowered: boolean;
      basedOn: { skills: number; experience: string | number; currentRole: string };
      careerPaths: Array<{
        title: string;
        matchScore: number;
        requiredSkills: string[];
        skillsToLearn: string[];
        estimatedTimeToTransition: string;
        salaryRange: string;
      }>;
    }>("/skills/career-paths", {
      method: "POST",
      body: JSON.stringify({ currentSkills, yearsOfExperience, currentRole }),
    }),

  // Get skill gap analysis for target role
  getSkillGapAnalysis: (currentSkills: string[], targetRole: string) =>
    apiCall<{
      aiPowered: boolean;
      analysis: {
        currentLevel: string;
        targetRole: string;
        matchingSkills: string[];
        missingSkills: string[];
        recommendations: string[];
      };
    }>("/skills/gap-analysis", {
      method: "POST",
      body: JSON.stringify({ currentSkills, targetRole }),
    }),
};

// ============ HEALTH CHECK ============
export const health = {
  checkDb: () => apiCall("/health/db"),
};

// ============ ADMIN ENDPOINTS ============
export const admin = {
  getUsers: () => apiCall("/admin/users"),

  updateUser: (id: string, updates: { role?: string; email?: string }) =>
    apiCall(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  deleteUser: (id: string) =>
    apiCall(`/admin/users/${id}`, {
      method: "DELETE",
    }),

  getAllApplications: () => apiCall("/admin/applications"),

  getStats: () => apiCall("/admin/stats"),
};
