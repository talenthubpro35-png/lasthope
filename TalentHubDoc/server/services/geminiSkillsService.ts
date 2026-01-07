import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import Groq from "groq-sdk";

// ============ AI CLIENT INITIALIZATION ============
let genAI: GoogleGenerativeAI | null = null;
let groqClient: Groq | null = null;
let isInitialized = false;

function initializeClients() {
  if (isInitialized) return;

  // Initialize Gemini
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    console.log("[AI] Gemini client initialized");
  }

  // Initialize Groq (free tier: 14,400 requests/day)
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    groqClient = new Groq({ apiKey: groqApiKey });
    console.log("[AI] Groq client initialized (Free: 14,400 req/day)");
  }

  if (!geminiApiKey && !groqApiKey) {
    console.log("[AI] No API keys found. Add GEMINI_API_KEY or GROQ_API_KEY to .env");
    console.log("[AI] Get free Groq key at: https://console.groq.com");
  }

  isInitialized = true;
}

function getGeminiModel(): GenerativeModel | null {
  initializeClients();
  if (!genAI) return null;
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

function getGroqClient(): Groq | null {
  initializeClients();
  return groqClient;
}

// ============ UNIFIED AI CALL FUNCTION ============
async function callAI(prompt: string): Promise<string | null> {
  // Try Groq first (faster and more quota)
  const groq = getGroqClient();
  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a career advisor AI. Always respond with valid JSON only, no markdown, no explanation."
          },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile", // Fast and capable model
        temperature: 0.7,
        max_tokens: 4000,
      });
      const response = completion.choices[0]?.message?.content;
      if (response) {
        console.log("[AI] Groq response received successfully");
        return response;
      }
    } catch (error: any) {
      console.log("[AI] Groq error:", error.message || error);
    }
  }

  // Fallback to Gemini
  const gemini = getGeminiModel();
  if (gemini) {
    try {
      const result = await gemini.generateContent(prompt);
      const response = result.response.text();
      if (response) {
        console.log("[AI] Gemini response received successfully");
        return response;
      }
    } catch (error: any) {
      console.log("[AI] Gemini error:", error.message || error);
    }
  }

  return null;
}

function cleanJsonResponse(response: string): string {
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

// ============ INTERFACES ============
export interface SkillRecommendation {
  id: string;
  skill: string;
  relevance: number;
  demandTrend: "rising" | "stable" | "declining";
  category: string;
  reason: string;
  resources?: { title: string; url: string; platform?: string }[];
}

export interface SkillInsight {
  skillName: string;
  marketDemand: "high" | "medium" | "low";
  demandTrend: "rising" | "stable" | "declining";
  averageSalaryImpact: string;
  topIndustries: string[];
  relatedSkills: string[];
  learningPath?: string;
}

export interface CareerPathSuggestion {
  title: string;
  matchScore: number;
  requiredSkills: string[];
  skillsToLearn: string[];
  estimatedTimeToTransition: string;
  salaryRange: string;
  description?: string;
  courses?: { title: string; platform: string; url: string }[];
}

export interface RoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  skills: string[];
  description: string;
  projects: { name: string; description: string }[];
  courses: { title: string; platform: string; url: string; skill: string }[];
  milestones: string[];
}

export interface SkillGapAnalysis {
  currentLevel: string;
  targetRole: string;
  matchingSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  suggestedCourses?: { title: string; platform: string; url: string; skill: string }[];
  roadmap?: {
    totalDuration: string;
    phases: RoadmapPhase[];
    weeklyHours: number;
    certifications: { name: string; provider: string; url: string }[];
    finalGoal: string;
  };
}

// ============ SKILL CATEGORIES FOR FALLBACK ============
const SKILL_CATEGORIES: Record<string, {
  keywords: string[];
  relatedSkills: string[];
  careers: string[];
  courses: { title: string; platform: string; url: string }[];
}> = {
  "AI/ML": {
    keywords: ["ai", "artificial intelligence", "machine learning", "ml", "deep learning", "neural", "nlp", "computer vision", "tensorflow", "pytorch", "llm", "generative ai", "prompt engineering", "chatgpt", "gpt", "langchain"],
    relatedSkills: ["Python", "TensorFlow", "PyTorch", "Data Science", "Statistics", "Deep Learning", "NLP", "Computer Vision", "LangChain"],
    careers: ["Machine Learning Engineer", "AI Engineer", "Data Scientist", "AI Researcher", "NLP Engineer", "MLOps Engineer"],
    courses: [
      { title: "Machine Learning Specialization", platform: "Coursera", url: "https://www.coursera.org/specializations/machine-learning-introduction" },
      { title: "Deep Learning Specialization", platform: "Coursera", url: "https://www.coursera.org/specializations/deep-learning" }
    ]
  },
  "Data": {
    keywords: ["data", "analytics", "analysis", "visualization", "tableau", "power bi", "sql", "database", "big data", "spark", "hadoop", "etl", "data engineering", "business intelligence", "bi", "excel"],
    relatedSkills: ["SQL", "Python", "Tableau", "Power BI", "Excel", "Statistics", "ETL", "Data Warehousing", "Apache Spark"],
    careers: ["Data Analyst", "Data Engineer", "Business Intelligence Analyst", "Data Scientist", "Analytics Manager"],
    courses: [
      { title: "Google Data Analytics Certificate", platform: "Coursera", url: "https://www.coursera.org/professional-certificates/google-data-analytics" },
      { title: "IBM Data Science Professional", platform: "Coursera", url: "https://www.coursera.org/professional-certificates/ibm-data-science" }
    ]
  },
  "Programming": {
    keywords: ["programming", "python", "javascript", "java", "c++", "c#", "go", "rust", "ruby", "php", "typescript", "coding", "software development", "developer", "golang"],
    relatedSkills: ["Git", "Data Structures", "Algorithms", "Problem Solving", "Debugging", "Testing", "Clean Code"],
    careers: ["Software Developer", "Backend Developer", "Full Stack Developer", "Software Engineer"],
    courses: [
      { title: "100 Days of Code Python", platform: "Udemy", url: "https://www.udemy.com/course/100-days-of-code" },
      { title: "The Complete JavaScript Course", platform: "Udemy", url: "https://www.udemy.com/course/the-complete-javascript-course" }
    ]
  },
  "Frontend": {
    keywords: ["frontend", "front-end", "react", "angular", "vue", "next.js", "html", "css", "tailwind", "ui development", "web development", "responsive", "nextjs"],
    relatedSkills: ["JavaScript", "TypeScript", "React", "CSS", "HTML", "Responsive Design", "Web Performance", "Next.js"],
    careers: ["Frontend Developer", "UI Developer", "Web Developer", "React Developer"],
    courses: [
      { title: "React - The Complete Guide", platform: "Udemy", url: "https://www.udemy.com/course/react-the-complete-guide-incl-redux" },
      { title: "Meta Front-End Developer", platform: "Coursera", url: "https://www.coursera.org/professional-certificates/meta-front-end-developer" }
    ]
  },
  "Backend": {
    keywords: ["backend", "back-end", "node.js", "express", "django", "flask", "spring", "api", "rest", "graphql", "microservices", "server", "nodejs", "fastapi"],
    relatedSkills: ["Node.js", "Python", "Java", "SQL", "MongoDB", "REST API", "GraphQL", "Docker"],
    careers: ["Backend Developer", "API Developer", "Software Engineer", "Full Stack Developer"],
    courses: [
      { title: "Node.js Complete Bootcamp", platform: "Udemy", url: "https://www.udemy.com/course/nodejs-express-mongodb-bootcamp" },
      { title: "Python Django Complete Guide", platform: "Udemy", url: "https://www.udemy.com/course/python-django-the-practical-guide" }
    ]
  },
  "Mobile": {
    keywords: ["mobile", "android", "ios", "flutter", "react native", "swift", "kotlin", "app development", "mobile app"],
    relatedSkills: ["Flutter", "React Native", "Swift", "Kotlin", "Firebase", "Mobile UI/UX", "Dart"],
    careers: ["Mobile Developer", "iOS Developer", "Android Developer", "Flutter Developer"],
    courses: [
      { title: "Flutter Development Bootcamp", platform: "Udemy", url: "https://www.udemy.com/course/flutter-bootcamp-with-dart" },
      { title: "iOS App Development Bootcamp", platform: "Udemy", url: "https://www.udemy.com/course/ios-13-app-development-bootcamp" }
    ]
  },
  "Cloud/DevOps": {
    keywords: ["cloud", "aws", "azure", "gcp", "devops", "docker", "kubernetes", "terraform", "ci/cd", "jenkins", "linux", "infrastructure", "deployment", "k8s"],
    relatedSkills: ["AWS", "Docker", "Kubernetes", "Terraform", "Linux", "CI/CD", "Ansible", "Azure", "GCP"],
    careers: ["DevOps Engineer", "Cloud Architect", "Site Reliability Engineer", "Platform Engineer", "Cloud Engineer"],
    courses: [
      { title: "AWS Solutions Architect", platform: "Udemy", url: "https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03" },
      { title: "Docker & Kubernetes Guide", platform: "Udemy", url: "https://www.udemy.com/course/docker-kubernetes-the-practical-guide" }
    ]
  },
  "Cybersecurity": {
    keywords: ["security", "cybersecurity", "hacking", "ethical hacking", "penetration", "pentest", "network security", "infosec", "encryption", "firewall", "soc", "siem"],
    relatedSkills: ["Network Security", "Penetration Testing", "Linux", "Python", "Cryptography", "SIEM", "Threat Analysis"],
    careers: ["Security Engineer", "Penetration Tester", "Security Analyst", "Cybersecurity Consultant", "SOC Analyst"],
    courses: [
      { title: "CompTIA Security+", platform: "Udemy", url: "https://www.udemy.com/course/securityplus" },
      { title: "Ethical Hacking Course", platform: "Udemy", url: "https://www.udemy.com/course/learn-ethical-hacking-from-scratch" }
    ]
  },
  "Blockchain/Web3": {
    keywords: ["blockchain", "web3", "crypto", "solidity", "smart contract", "ethereum", "defi", "nft", "decentralized"],
    relatedSkills: ["Solidity", "Ethereum", "Smart Contracts", "Web3.js", "DeFi", "Cryptography", "Hardhat"],
    careers: ["Blockchain Developer", "Smart Contract Developer", "Web3 Developer", "Crypto Analyst"],
    courses: [
      { title: "Blockchain Developer Bootcamp", platform: "Udemy", url: "https://www.udemy.com/course/blockchain-developer" },
      { title: "Solidity & Ethereum", platform: "Udemy", url: "https://www.udemy.com/course/ethereum-and-solidity-the-complete-developers-guide" }
    ]
  },
  "Design": {
    keywords: ["ui design", "ux design", "figma", "graphic design", "photoshop", "illustrator", "product design", "user experience", "user interface", "wireframe", "prototype", "ui/ux"],
    relatedSkills: ["Figma", "Adobe XD", "User Research", "Prototyping", "Visual Design", "Design Systems", "Sketch"],
    careers: ["UI/UX Designer", "Product Designer", "Graphic Designer", "UX Researcher"],
    courses: [
      { title: "Google UX Design Certificate", platform: "Coursera", url: "https://www.coursera.org/professional-certificates/google-ux-design" },
      { title: "Figma UI/UX Design", platform: "Udemy", url: "https://www.udemy.com/course/figma-ux-ui-design-user-experience-tutorial-course" }
    ]
  },
  "Marketing": {
    keywords: ["marketing", "digital marketing", "seo", "sem", "social media", "content marketing", "ads", "google ads", "facebook ads", "growth", "branding", "advertising", "ppc"],
    relatedSkills: ["SEO", "Google Analytics", "Content Marketing", "Social Media", "PPC", "Email Marketing", "Google Ads"],
    careers: ["Digital Marketing Manager", "SEO Specialist", "Content Strategist", "Growth Marketer", "Social Media Manager"],
    courses: [
      { title: "Google Digital Marketing", platform: "Coursera", url: "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce" },
      { title: "Complete Digital Marketing", platform: "Udemy", url: "https://www.udemy.com/course/learn-digital-marketing-course" }
    ]
  },
  "Content/Writing": {
    keywords: ["writing", "content", "copywriting", "technical writing", "blogging", "editing", "content creation", "documentation", "content writing"],
    relatedSkills: ["Copywriting", "SEO Writing", "Editing", "Research", "Storytelling", "Technical Documentation"],
    careers: ["Content Writer", "Copywriter", "Technical Writer", "Content Strategist", "Editor"],
    courses: [
      { title: "Copywriting Masterclass", platform: "Udemy", url: "https://www.udemy.com/course/the-complete-copywriting-course" },
      { title: "Technical Writing Course", platform: "Coursera", url: "https://www.coursera.org/learn/technical-writing" }
    ]
  },
  "Video/Media": {
    keywords: ["video", "video editing", "premiere", "after effects", "motion graphics", "animation", "youtube", "video production", "filmmaking", "davinci", "final cut"],
    relatedSkills: ["Adobe Premiere", "After Effects", "DaVinci Resolve", "Motion Graphics", "Color Grading", "Video Production"],
    careers: ["Video Editor", "Motion Designer", "Content Creator", "Videographer", "YouTube Creator"],
    courses: [
      { title: "Video Editing Masterclass", platform: "Udemy", url: "https://www.udemy.com/course/premiere-pro-cc-for-beginners" },
      { title: "After Effects Complete Course", platform: "Udemy", url: "https://www.udemy.com/course/after-effects-kinetic-typography" }
    ]
  },
  "Management": {
    keywords: ["management", "project management", "product management", "agile", "scrum", "leadership", "team lead", "manager", "pmp", "jira", "kanban"],
    relatedSkills: ["Agile", "Scrum", "Jira", "Leadership", "Communication", "Strategic Planning", "Risk Management"],
    careers: ["Project Manager", "Product Manager", "Scrum Master", "Program Manager", "Engineering Manager"],
    courses: [
      { title: "Google Project Management", platform: "Coursera", url: "https://www.coursera.org/professional-certificates/google-project-management" },
      { title: "Product Management Course", platform: "Udemy", url: "https://www.udemy.com/course/become-a-product-manager-learn-the-skills-get-a-job" }
    ]
  },
  "Business": {
    keywords: ["business", "business analysis", "strategy", "consulting", "entrepreneur", "startup", "e-commerce", "sales", "crm", "operations", "entrepreneurship"],
    relatedSkills: ["Business Analysis", "Strategic Planning", "Market Research", "Financial Analysis", "Sales", "CRM"],
    careers: ["Business Analyst", "Management Consultant", "Entrepreneur", "Operations Manager", "Strategy Analyst"],
    courses: [
      { title: "Business Analysis Fundamentals", platform: "Udemy", url: "https://www.udemy.com/course/business-analysis-fundamentals" },
      { title: "Entrepreneurship Specialization", platform: "Coursera", url: "https://www.coursera.org/specializations/wharton-entrepreneurship" }
    ]
  },
  "Finance": {
    keywords: ["finance", "financial", "accounting", "bookkeeping", "tax", "investment", "banking", "trading", "fintech", "financial analysis"],
    relatedSkills: ["Financial Analysis", "Excel", "Accounting", "Financial Modeling", "Valuation", "Budgeting"],
    careers: ["Financial Analyst", "Accountant", "Investment Analyst", "Finance Manager", "FP&A Analyst"],
    courses: [
      { title: "Financial Analysis Course", platform: "Udemy", url: "https://www.udemy.com/course/the-complete-financial-analyst-course" },
      { title: "Accounting Fundamentals", platform: "Coursera", url: "https://www.coursera.org/learn/wharton-accounting" }
    ]
  },
  "HR": {
    keywords: ["hr", "human resources", "recruitment", "hiring", "talent", "onboarding", "employee", "payroll", "people management", "talent acquisition"],
    relatedSkills: ["Recruitment", "Employee Relations", "HRIS", "Talent Management", "Compensation", "Performance Management"],
    careers: ["HR Manager", "Recruiter", "Talent Acquisition Specialist", "HR Business Partner", "People Operations"],
    courses: [
      { title: "HR Management Specialization", platform: "Coursera", url: "https://www.coursera.org/specializations/human-resource-management" },
      { title: "Recruiting & Hiring", platform: "Udemy", url: "https://www.udemy.com/course/recruiting-talent-acquisition-hiring" }
    ]
  },
  "Education": {
    keywords: ["teaching", "education", "training", "instructor", "tutor", "curriculum", "e-learning", "course creation", "learning", "coaching", "instructional design"],
    relatedSkills: ["Instructional Design", "Curriculum Development", "E-Learning", "Public Speaking", "Communication", "LMS"],
    careers: ["Corporate Trainer", "Instructional Designer", "Online Course Creator", "Education Consultant", "Learning Designer"],
    courses: [
      { title: "Instructional Design Course", platform: "Coursera", url: "https://www.coursera.org/learn/instructional-design-foundations-applications" },
      { title: "Train the Trainer", platform: "Udemy", url: "https://www.udemy.com/course/train-the-trainer-complete-training" }
    ]
  },
  "Soft Skills": {
    keywords: ["communication", "leadership", "teamwork", "problem solving", "critical thinking", "time management", "emotional intelligence", "negotiation", "presentation", "public speaking", "adaptability"],
    relatedSkills: ["Communication", "Leadership", "Problem Solving", "Time Management", "Teamwork", "Negotiation"],
    careers: ["Manager", "Team Lead", "Consultant", "Executive", "Coach"],
    courses: [
      { title: "Leadership Skills Course", platform: "Coursera", url: "https://www.coursera.org/specializations/leading-teams" },
      { title: "Communication Skills", platform: "Coursera", url: "https://www.coursera.org/learn/communication-skills" }
    ]
  },
  "Testing/QA": {
    keywords: ["testing", "qa", "quality assurance", "automation testing", "selenium", "cypress", "test automation", "bug", "manual testing", "software testing", "sdet"],
    relatedSkills: ["Selenium", "Cypress", "Test Automation", "API Testing", "Performance Testing", "JUnit", "TestNG"],
    careers: ["QA Engineer", "Test Automation Engineer", "SDET", "Quality Analyst", "Performance Engineer"],
    courses: [
      { title: "Selenium WebDriver Course", platform: "Udemy", url: "https://www.udemy.com/course/selenium-webdriver-with-java" },
      { title: "Software Testing Bootcamp", platform: "Udemy", url: "https://www.udemy.com/course/testerbootcamp" }
    ]
  },
  "IoT/Robotics": {
    keywords: ["iot", "internet of things", "robotics", "embedded", "arduino", "raspberry pi", "automation", "sensors", "hardware", "plc"],
    relatedSkills: ["Embedded Systems", "Arduino", "Raspberry Pi", "C/C++", "Sensors", "Electronics", "MQTT"],
    careers: ["IoT Developer", "Robotics Engineer", "Embedded Systems Engineer", "Automation Engineer"],
    courses: [
      { title: "IoT Specialization", platform: "Coursera", url: "https://www.coursera.org/specializations/iot" },
      { title: "Arduino Programming", platform: "Udemy", url: "https://www.udemy.com/course/arduino-sbs-getting-serious" }
    ]
  },
  "No-Code/Low-Code": {
    keywords: ["no-code", "low-code", "nocode", "zapier", "webflow", "bubble", "airtable", "notion", "automation", "make", "n8n"],
    relatedSkills: ["Zapier", "Webflow", "Bubble", "Airtable", "Process Automation", "Make", "Notion"],
    careers: ["No-Code Developer", "Automation Specialist", "Business Analyst", "Operations Manager"],
    courses: [
      { title: "No-Code Development", platform: "Udemy", url: "https://www.udemy.com/course/the-complete-no-code-course" },
      { title: "Bubble.io Course", platform: "Udemy", url: "https://www.udemy.com/course/bubble-no-code" }
    ]
  }
};

// ============ HELPER FUNCTIONS ============
function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim();
}

function detectCategory(skills: string[]): string {
  const normalizedSkills = skills.map(normalizeSkill).join(" ");

  for (const [category, data] of Object.entries(SKILL_CATEGORIES)) {
    for (const keyword of data.keywords) {
      if (normalizedSkills.includes(keyword)) {
        return category;
      }
    }
  }
  return "General";
}

function getCategoryData(category: string) {
  return SKILL_CATEGORIES[category] || null;
}

// ============ AI-POWERED SKILL RECOMMENDATIONS ============
export async function generateSkillRecommendations(
  currentSkills: string[],
  goal?: string,
  targetRole?: string
): Promise<SkillRecommendation[]> {
  const prompt = `You are a career advisor AI. Analyze these skills and recommend 5 complementary skills to learn.

CURRENT SKILLS: ${currentSkills.join(", ") || "None specified"}
CAREER GOAL: ${goal || "Career growth and higher salary"}
TARGET ROLE: ${targetRole || "Not specified"}

Respond with ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "id": "skill-id",
    "skill": "Skill Name",
    "relevance": 85,
    "demandTrend": "rising",
    "category": "Category Name",
    "reason": "Brief reason why this skill is valuable",
    "resources": [
      {"title": "Course Name", "platform": "Udemy", "url": "https://actual-course-url"}
    ]
  }
]

Requirements:
- relevance: 0-100 based on job market demand
- demandTrend: "rising", "stable", or "declining"
- Include 1-2 real learning resources with actual URLs
- Do NOT recommend skills they already have
- Focus on 2024-2025 trending skills`;

  try {
    const response = await callAI(prompt);
    if (response) {
      const cleaned = cleanJsonResponse(response);
      const recommendations: SkillRecommendation[] = JSON.parse(cleaned);
      return recommendations.slice(0, 5);
    }
  } catch (error) {
    console.log("[AI] Parse error, using fallback");
  }

  return getFallbackRecommendations(currentSkills);
}

function getFallbackRecommendations(currentSkills: string[]): SkillRecommendation[] {
  const category = detectCategory(currentSkills);
  const categoryData = getCategoryData(category);

  if (!categoryData) {
    return [
      { id: "python", skill: "Python", relevance: 95, demandTrend: "rising", category: "Programming", reason: "Most in-demand programming language for AI, data, and automation", resources: [{ title: "100 Days of Code Python", platform: "Udemy", url: "https://www.udemy.com/course/100-days-of-code" }] },
      { id: "data-analysis", skill: "Data Analysis", relevance: 90, demandTrend: "rising", category: "Data", reason: "Essential skill across all industries", resources: [{ title: "Google Data Analytics", platform: "Coursera", url: "https://www.coursera.org/professional-certificates/google-data-analytics" }] },
      { id: "ai-ml", skill: "AI/Machine Learning", relevance: 92, demandTrend: "rising", category: "AI/ML", reason: "Highest demand skill in 2024-2025", resources: [{ title: "Machine Learning Specialization", platform: "Coursera", url: "https://www.coursera.org/specializations/machine-learning-introduction" }] },
      { id: "cloud", skill: "Cloud Computing (AWS)", relevance: 88, demandTrend: "rising", category: "Cloud", reason: "Critical for modern software infrastructure", resources: [{ title: "AWS Solutions Architect", platform: "Udemy", url: "https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03" }] },
      { id: "communication", skill: "Communication Skills", relevance: 85, demandTrend: "stable", category: "Soft Skills", reason: "Essential for career advancement", resources: [{ title: "Communication Skills", platform: "Coursera", url: "https://www.coursera.org/learn/communication-skills" }] }
    ];
  }

  const normalizedCurrentSkills = currentSkills.map(normalizeSkill);
  const recommendations: SkillRecommendation[] = [];

  for (const skill of categoryData.relatedSkills) {
    if (!normalizedCurrentSkills.some(s => s.includes(skill.toLowerCase()))) {
      recommendations.push({
        id: skill.toLowerCase().replace(/\s+/g, '-'),
        skill,
        relevance: 85 + Math.floor(Math.random() * 10),
        demandTrend: "rising",
        category,
        reason: `High demand skill in ${category}. Complements your existing skills.`,
        resources: categoryData.courses.slice(0, 2)
      });
    }
    if (recommendations.length >= 5) break;
  }

  return recommendations;
}

// ============ AI-POWERED MARKET DEMAND ANALYSIS ============
export async function analyzeSkillsMarketDemand(skills: string[]): Promise<SkillInsight[]> {
  if (skills.length === 0) return [];

  const prompt = `Analyze the 2024-2025 job market demand for these skills: ${skills.join(", ")}

Respond with ONLY a valid JSON array (no markdown):
[
  {
    "skillName": "Skill Name",
    "marketDemand": "high",
    "demandTrend": "rising",
    "averageSalaryImpact": "+25-35%",
    "topIndustries": ["Tech", "Finance", "Healthcare"],
    "relatedSkills": ["Related Skill 1", "Related Skill 2"],
    "learningPath": "Recommended learning path description"
  }
]

Requirements:
- marketDemand: "high", "medium", or "low"
- demandTrend: "rising", "stable", or "declining"
- Include realistic salary impact percentages
- List top 3-4 industries hiring for this skill`;

  try {
    const response = await callAI(prompt);
    if (response) {
      const cleaned = cleanJsonResponse(response);
      return JSON.parse(cleaned);
    }
  } catch (error) {
    console.log("[AI] Parse error, using fallback");
  }

  // Fallback
  return skills.map(skill => {
    const category = detectCategory([skill]);
    const categoryData = getCategoryData(category);

    return {
      skillName: skill,
      marketDemand: "medium" as const,
      demandTrend: "stable" as const,
      averageSalaryImpact: "+15-25%",
      topIndustries: categoryData?.careers.slice(0, 3) || ["Technology", "Business", "Finance"],
      relatedSkills: categoryData?.relatedSkills.slice(0, 5) || ["Communication", "Problem Solving"],
      learningPath: categoryData?.courses[0]?.title || "Online courses recommended"
    };
  });
}

// ============ AI-POWERED CAREER PATH SUGGESTIONS ============
export async function suggestCareerPaths(
  currentSkills: string[],
  yearsOfExperience?: number,
  currentRole?: string
): Promise<CareerPathSuggestion[]> {
  const prompt = `You are a career advisor. Based on this profile, suggest 4 realistic career paths.

CURRENT SKILLS: ${currentSkills.join(", ") || "General skills"}
YEARS OF EXPERIENCE: ${yearsOfExperience || "Not specified"}
CURRENT ROLE: ${currentRole || "Not specified"}

Respond with ONLY a valid JSON array (no markdown):
[
  {
    "title": "Job Title",
    "matchScore": 85,
    "requiredSkills": ["Skill they have 1", "Skill they have 2"],
    "skillsToLearn": ["New skill 1", "New skill 2", "New skill 3"],
    "estimatedTimeToTransition": "3-6 months",
    "salaryRange": "$80,000 - $120,000",
    "description": "Brief role description",
    "courses": [
      {"title": "Course Name", "platform": "Udemy", "url": "https://actual-url"}
    ]
  }
]

Requirements:
- matchScore: 0-100 based on current skills match
- Include skills they already have in requiredSkills
- List 3-5 skills they need to learn
- Provide realistic salary ranges for 2024
- Include 1-2 real course recommendations with actual URLs
- Sort by matchScore (highest first)`;

  try {
    const response = await callAI(prompt);
    if (response) {
      const cleaned = cleanJsonResponse(response);
      return JSON.parse(cleaned);
    }
  } catch (error) {
    console.log("[AI] Parse error, using fallback");
  }

  return getFallbackCareerPaths(currentSkills);
}

function getFallbackCareerPaths(currentSkills: string[]): CareerPathSuggestion[] {
  const category = detectCategory(currentSkills);
  const categoryData = getCategoryData(category);

  if (!categoryData) {
    return [
      {
        title: "Software Developer",
        matchScore: 50,
        requiredSkills: currentSkills,
        skillsToLearn: ["Python", "JavaScript", "SQL", "Git"],
        estimatedTimeToTransition: "6-12 months",
        salaryRange: "$70,000 - $120,000",
        description: "Build software applications and systems",
        courses: [{ title: "Complete Web Development", platform: "Udemy", url: "https://www.udemy.com/course/the-complete-web-development-bootcamp" }]
      },
      {
        title: "Data Analyst",
        matchScore: 45,
        requiredSkills: currentSkills,
        skillsToLearn: ["SQL", "Python", "Excel", "Tableau"],
        estimatedTimeToTransition: "3-6 months",
        salaryRange: "$60,000 - $100,000",
        description: "Analyze data to help businesses make decisions",
        courses: [{ title: "Google Data Analytics", platform: "Coursera", url: "https://www.coursera.org/professional-certificates/google-data-analytics" }]
      }
    ];
  }

  return categoryData.careers.slice(0, 4).map((career, index) => ({
    title: career,
    matchScore: 80 - (index * 10),
    requiredSkills: currentSkills,
    skillsToLearn: categoryData.relatedSkills.slice(0, 4),
    estimatedTimeToTransition: index === 0 ? "3-6 months" : "6-12 months",
    salaryRange: "$70,000 - $150,000",
    description: `Build a career as a ${career}`,
    courses: categoryData.courses.slice(0, 2)
  }));
}

// ============ AI-POWERED SKILL GAP ANALYSIS ============
export async function analyzeSkillGap(currentSkills: string[], targetRole: string): Promise<SkillGapAnalysis> {
  const prompt = `You are a career advisor. Perform a comprehensive skill gap analysis.

CURRENT SKILLS: ${currentSkills.join(", ") || "None specified"}
TARGET ROLE: ${targetRole}

Respond with ONLY valid JSON (no markdown):
{
  "currentLevel": "Entry-level/Junior/Mid-level/Senior",
  "targetRole": "${targetRole}",
  "matchingSkills": ["Skills they have that match the role"],
  "missingSkills": ["Critical skills they need to learn"],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ],
  "suggestedCourses": [
    {"title": "Course Name", "platform": "Udemy", "url": "https://real-url", "skill": "Skill Name"}
  ],
  "roadmap": {
    "totalDuration": "4-6 months",
    "phases": [
      {
        "phase": 1,
        "title": "Phase Title",
        "duration": "4-6 weeks",
        "skills": ["Skill 1", "Skill 2"],
        "description": "What to learn in this phase",
        "projects": [
          {"name": "Project Name", "description": "Project description"}
        ],
        "courses": [
          {"title": "Course", "platform": "Platform", "url": "https://url", "skill": "Skill"}
        ],
        "milestones": ["Milestone 1", "Milestone 2"]
      }
    ],
    "weeklyHours": 15,
    "certifications": [
      {"name": "Certification Name", "provider": "Provider", "url": "https://url"}
    ],
    "finalGoal": "Career goal description"
  }
}

Requirements:
- Analyze what skills they have vs what's needed
- Provide realistic learning timeline
- Include 2-3 phases in the roadmap
- Each phase should have practical projects
- Include real course URLs from Udemy, Coursera, etc.`;

  try {
    const response = await callAI(prompt);
    if (response) {
      const cleaned = cleanJsonResponse(response);
      return JSON.parse(cleaned);
    }
  } catch (error) {
    console.log("[AI] Parse error, using fallback");
  }

  return getFallbackSkillGap(currentSkills, targetRole);
}

function getFallbackSkillGap(currentSkills: string[], targetRole: string): SkillGapAnalysis {
  const category = detectCategory(currentSkills.length > 0 ? currentSkills : [targetRole]);
  const categoryData = getCategoryData(category);

  if (!categoryData) {
    return {
      currentLevel: currentSkills.length > 3 ? "Entry-level" : "Beginner",
      targetRole,
      matchingSkills: currentSkills,
      missingSkills: ["Technical Skills", "Domain Knowledge", "Industry Experience"],
      recommendations: [
        `Research the specific requirements for ${targetRole} in job postings`,
        "Build a portfolio of relevant projects",
        "Network with professionals in the field",
        "Consider relevant certifications"
      ],
      suggestedCourses: []
    };
  }

  const normalizedSkills = currentSkills.map(normalizeSkill);
  const matchingSkills = categoryData.relatedSkills.filter(s =>
    normalizedSkills.some(us => us.includes(s.toLowerCase()))
  );
  const missingSkills = categoryData.relatedSkills.filter(s =>
    !normalizedSkills.some(us => us.includes(s.toLowerCase()))
  );

  return {
    currentLevel: matchingSkills.length > 3 ? "Intermediate" : matchingSkills.length > 0 ? "Entry-level" : "Beginner",
    targetRole: categoryData.careers[0] || targetRole,
    matchingSkills,
    missingSkills: missingSkills.slice(0, 6),
    recommendations: [
      `Focus on learning ${missingSkills.slice(0, 3).join(", ")}`,
      `Start with "${categoryData.courses[0]?.title}" on ${categoryData.courses[0]?.platform}`,
      "Build 2-3 portfolio projects showcasing your skills",
      "Consider getting certified in your focus area"
    ],
    suggestedCourses: categoryData.courses.map(c => ({ ...c, skill: missingSkills[0] || category })),
    roadmap: {
      totalDuration: "4-6 months",
      phases: [
        {
          phase: 1,
          title: "Foundation Skills",
          duration: "4-6 weeks",
          skills: missingSkills.slice(0, 3),
          description: "Learn the core skills required for the role",
          projects: [{ name: "Starter Project", description: "Build a basic project to practice skills" }],
          courses: categoryData.courses.slice(0, 2).map(c => ({ ...c, skill: missingSkills[0] || category })),
          milestones: ["Complete first course", "Build first project", "Understand fundamentals"]
        },
        {
          phase: 2,
          title: "Advanced Skills & Portfolio",
          duration: "6-8 weeks",
          skills: missingSkills.slice(3, 6),
          description: "Build advanced skills and create portfolio projects",
          projects: [{ name: "Portfolio Project", description: "Create a comprehensive project for your portfolio" }],
          courses: categoryData.courses.slice(0, 1).map(c => ({ ...c, skill: missingSkills[3] || category })),
          milestones: ["Complete portfolio project", "Apply for jobs", "Get certified"]
        }
      ],
      weeklyHours: 15,
      certifications: [{ name: `${category} Certification`, provider: "Various", url: categoryData.courses[0]?.url || "" }],
      finalGoal: `Become a proficient ${categoryData.careers[0]} with expertise in ${categoryData.relatedSkills.slice(0, 3).join(", ")}`
    }
  };
}

export function isGeminiAvailable(): boolean {
  initializeClients();
  return !!(genAI || groqClient);
}
