import { config } from "dotenv";
import { db, initializeDatabase } from "../server/db";
import { jobs, users } from "../shared/schema";
import { eq } from "drizzle-orm";

// Load environment variables
config();

async function seedJobs() {
  try {
    // Initialize database connection
    initializeDatabase();

    if (!db) {
      throw new Error("Database not available. Make sure DATABASE_URL is set in your environment.");
    }

    console.log("🌱 Seeding jobs...");

    const database = db; // TypeScript assertion that db is not null

    // Get or create a recruiter user
    let recruiter = await database
      .select()
      .from(users)
      .where(eq(users.role, "recruiter"))
      .limit(1);

    let recruiterId: string;
    if (recruiter.length === 0) {
      console.log("No recruiter found, creating one...");
      const newRecruiter = await database
        .insert(users)
        .values({
          username: "recruiter_test",
          password: "hashed_password_here", // In production, use proper hashing
          email: "recruiter@test.com",
          role: "recruiter",
        })
        .returning();
      recruiterId = newRecruiter[0].id;
    } else {
      recruiterId = recruiter[0].id;
    }

    // Sample jobs with different types and locations
    const sampleJobs = [
      {
        recruiterId,
        title: "Senior Full Stack Developer",
        description: "We are looking for an experienced full-stack developer to join our team. You will work on cutting-edge web applications using React, Node.js, and PostgreSQL.",
        requiredSkills: ["React", "Node.js", "TypeScript", "PostgreSQL", "REST APIs"],
        location: "Remote",
        salary_min: 120000,
        salary_max: 180000,
        jobType: "full-time",
        isActive: true,
      },
      {
        recruiterId,
        title: "Frontend Developer (Part-time)",
        description: "Part-time position for a frontend developer. Work 20 hours per week building beautiful user interfaces with React and Tailwind CSS.",
        requiredSkills: ["React", "JavaScript", "Tailwind CSS", "HTML", "CSS"],
        location: "Remote",
        salary_min: 50000,
        salary_max: 70000,
        jobType: "part-time",
        isActive: true,
      },
      {
        recruiterId,
        title: "DevOps Engineer (Contract)",
        description: "6-month contract position for a DevOps engineer. Experience with AWS, Docker, and Kubernetes required.",
        requiredSkills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux"],
        location: "Hybrid - San Francisco",
        salary_min: 100000,
        salary_max: 150000,
        jobType: "contract",
        isActive: true,
      },
      {
        recruiterId,
        title: "UI/UX Designer",
        description: "Create amazing user experiences for our products. Proficiency in Figma and understanding of modern design principles required.",
        requiredSkills: ["Figma", "UI Design", "UX Design", "Prototyping", "User Research"],
        location: "Remote",
        salary_min: 80000,
        salary_max: 120000,
        jobType: "full-time",
        isActive: true,
      },
      {
        recruiterId,
        title: "Backend Engineer",
        description: "Build scalable backend services using Python and FastAPI. Experience with microservices architecture is a plus.",
        requiredSkills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Microservices"],
        location: "Hybrid - New York",
        salary_min: 110000,
        salary_max: 160000,
        jobType: "full-time",
        isActive: true,
      },
      {
        recruiterId,
        title: "Data Scientist (Remote)",
        description: "Analyze complex datasets and build machine learning models. Experience with Python, pandas, and scikit-learn required.",
        requiredSkills: ["Python", "Machine Learning", "Pandas", "SQL", "Data Visualization"],
        location: "Remote",
        salary_min: 130000,
        salary_max: 180000,
        jobType: "full-time",
        isActive: true,
      },
      {
        recruiterId,
        title: "Mobile Developer (Contract)",
        description: "3-month contract to build a cross-platform mobile app using React Native.",
        requiredSkills: ["React Native", "JavaScript", "Mobile Development", "iOS", "Android"],
        location: "Remote",
        salary_min: 90000,
        salary_max: 130000,
        jobType: "contract",
        isActive: true,
      },
      {
        recruiterId,
        title: "QA Engineer (Part-time)",
        description: "Part-time QA engineer to write automated tests and ensure code quality.",
        requiredSkills: ["Testing", "Selenium", "Jest", "Automated Testing", "QA"],
        location: "Remote",
        salary_min: 40000,
        salary_max: 60000,
        jobType: "part-time",
        isActive: true,
      },
      {
        recruiterId,
        title: "Product Manager",
        description: "Lead product development from conception to launch. Work with cross-functional teams to deliver amazing products.",
        requiredSkills: ["Product Management", "Agile", "User Stories", "Roadmapping", "Stakeholder Management"],
        location: "Hybrid - Seattle",
        salary_min: 140000,
        salary_max: 190000,
        jobType: "full-time",
        isActive: true,
      },
      {
        recruiterId,
        title: "Technical Writer (Contract)",
        description: "6-month contract to create comprehensive documentation for our API and developer tools.",
        requiredSkills: ["Technical Writing", "Documentation", "API Documentation", "Markdown", "Git"],
        location: "Remote",
        salary_min: 70000,
        salary_max: 95000,
        jobType: "contract",
        isActive: true,
      },
    ];

    // Insert jobs
    for (const job of sampleJobs) {
      await database.insert(jobs).values(job);
      console.log(`✅ Created job: ${job.title}`);
    }

    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding jobs:", error);
    process.exit(1);
  }
}

seedJobs();
