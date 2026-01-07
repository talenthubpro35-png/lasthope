/**
 * Intelligent Fallback Response System
 * Handles common questions without OpenAI using pattern matching and context awareness
 */

interface UserContext {
  role: "candidate" | "recruiter" | "admin";
  userId: string;
  username: string;
  profileCompletionPercent?: number;
  skillsCount?: number;
  appliedJobsCount?: number;
  hasResume?: boolean;
  activeJobsCount?: number;
  totalApplicationsCount?: number;
  applicationStatuses?: {
    applied: number;
    shortlisted: number;
    interview: number;
    rejected: number;
    offered: number;
  };
}

interface QuestionPattern {
  keywords: string[];
  response: (context: UserContext) => string;
  roles?: ("candidate" | "recruiter" | "admin")[];
}

// Common question patterns organized by topic
const QUESTION_PATTERNS: QuestionPattern[] = [
  // === JOB APPLICATION (Candidate) ===
  {
    keywords: ["how", "apply", "job"],
    roles: ["candidate"],
    response: () => `To apply for jobs on TalentHub Pro:
1. Go to the **Job Search** page
2. Browse available jobs or use filters (skills, location, salary)
3. Click on a job card to see full details
4. Click the **"Apply Now"** button
5. Your profile is automatically submitted!

💡 Tip: Complete your profile and add skills to increase your chances of getting shortlisted.`,
  },
  {
    keywords: ["where", "find", "job", "search"],
    roles: ["candidate"],
    response: () => `You can find jobs in the **Job Search** page:
• Use filters to narrow down by skills, location, salary range, and job type
• Browse all available positions
• Click on any job card to see full details and requirements
• Apply with one click!

The AI will also show you a match score based on your skills.`,
  },
  {
    keywords: ["withdraw", "cancel", "application"],
    roles: ["candidate"],
    response: () => `You can withdraw an application, but only if it's in **"Applied"** status:
1. Go to your Dashboard
2. Find the application in the Applications section
3. Click "Withdraw" button

⚠️ Note: You cannot withdraw if the recruiter has already updated the status (shortlisted, interview, etc.).`,
  },

  // === PROFILE & RESUME (Candidate) ===
  {
    keywords: ["upload", "resume", "cv"],
    roles: ["candidate"],
    response: (context) => `To upload your resume:
1. Go to your **Profile** page (click your name)
2. Scroll to the Resume Upload section
3. Click "Choose File" and select your PDF or DOCX file
4. Our AI will automatically extract information and fill your profile!

${!context.hasResume ? "📌 You haven't uploaded a resume yet - this will greatly improve your profile!" : "✅ You already have a resume uploaded!"}`,
  },
  {
    keywords: ["improve", "profile", "complete"],
    roles: ["candidate"],
    response: (context) => {
      const completion = context.profileCompletionPercent || 0;
      const suggestions: string[] = [];

      if (completion < 80) suggestions.push("Complete your profile to 80%+ for better visibility");
      if (!context.hasResume) suggestions.push("Upload your resume for AI parsing");
      if ((context.skillsCount || 0) < 5) suggestions.push("Add more skills (aim for at least 5-10)");

      return `Your profile is **${completion}% complete**. To improve it:

${suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

✨ A complete profile with relevant skills gets shortlisted 3x more often!`;
    },
  },
  {
    keywords: ["add", "skill", "skills"],
    roles: ["candidate"],
    response: (context) => `To add skills to your profile:
1. Go to your **Profile** page
2. Find the Skills section
3. Type skill names and add them
4. Save your changes

${(context.skillsCount || 0) < 5 ? "💡 Tip: Add 5-10 relevant skills to improve your job matches!" : `Great! You have ${context.skillsCount} skills added.`}

Skills are used by our AI to match you with relevant jobs.`,
  },

  // === APPLICATION TRACKING (Candidate) ===
  {
    keywords: ["track", "application", "status"],
    roles: ["candidate"],
    response: (context) => {
      const count = context.appliedJobsCount || 0;
      const statuses = context.applicationStatuses;

      let statusBreakdown = "";
      if (statuses) {
        statusBreakdown = `\n\n**Your Applications:**
• Applied: ${statuses.applied}
• Shortlisted: ${statuses.shortlisted} 🎯
• Interview: ${statuses.interview} 💼
• Offered: ${statuses.offered} 🎉
• Rejected: ${statuses.rejected}`;
      }

      return `To track your applications:
1. Go to your **Dashboard**
2. View the Applications section
3. See real-time status updates

${count > 0 ? `You have ${count} total application(s).${statusBreakdown}` : "You haven't applied to any jobs yet. Start browsing and apply!"}

**Status meanings:**
• **Applied**: Submitted, waiting for review
• **Shortlisted**: Recruiter is interested! 🎉
• **Interview**: You're invited for an interview
• **Offered**: Job offer received!
• **Rejected**: Not selected this time`;
    },
  },
  {
    keywords: ["shortlisted", "mean", "status"],
    roles: ["candidate"],
    response: () => `**Application Status Meanings:**

• **Applied** - Your application is submitted and waiting for review
• **Shortlisted** - Great news! The recruiter is interested in you 🎉
• **Interview** - You've been invited for an interview 💼
• **Offered** - You received a job offer! 🎊
• **Rejected** - Not selected for this position

When you're shortlisted, the recruiter will typically contact you soon for next steps!`,
  },
  {
    keywords: ["not", "getting", "shortlisted", "rejected"],
    roles: ["candidate"],
    response: (context) => {
      const tips: string[] = [
        "Complete your profile to 100%",
        "Add more relevant skills that match job requirements",
        "Upload an updated resume with clear experience details",
        "Apply to jobs that closely match your skill set",
        "Use the Interview Prep feature to practice",
      ];

      if ((context.profileCompletionPercent || 0) < 80) {
        tips.unshift(`⚠️ Your profile is only ${context.profileCompletionPercent}% complete - complete it first!`);
      }

      return `Here's how to increase your chances of getting shortlisted:

${tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}

💡 Remember: Our AI matches your skills with job requirements, so focus on relevant skills!`;
    },
  },

  // === INTERVIEW PREP ===
  {
    keywords: ["interview", "preparation", "prep", "practice"],
    response: () => `To use the Interview Prep feature:
1. Go to the **Interview Prep** page
2. Enter the job title and key skills
3. Get AI-generated practice questions!

You'll receive:
• **Technical Questions** - Role-specific technical questions
• **Behavioral Questions** - Soft skills and experience
• **Situational Questions** - Problem-solving scenarios

💡 Practice answering these out loud to prepare effectively!`,
  },
  {
    keywords: ["example", "answer", "interview", "question"],
    response: () => `For interview questions, here's a good approach:

**For Technical Questions:**
• Explain your thought process clearly
• Use specific examples from past experience
• Show problem-solving skills

**For Behavioral Questions (STAR method):**
• **S**ituation - Describe the context
• **T**ask - Explain what needed to be done
• **A**ction - Detail what you did
• **R**esult - Share the outcome

💡 Use the Interview Prep page to generate questions specific to your target role!`,
  },

  // === SKILLS & MATCHING ===
  {
    keywords: ["ai", "match", "matching", "work", "score"],
    response: () => `**AI Matching on TalentHub Pro:**

Our AI compares your skills with job requirements to calculate a match score (0-100%):

• **80-100%**: Excellent match - You have most/all required skills ⭐
• **60-79%**: Good match - You meet many requirements
• **40-59%**: Partial match - Some relevant skills
• **Below 40%**: Low match - Consider building more skills first

💡 The more relevant skills you add to your profile, the better your matches!

Both candidates and recruiters see these AI match scores.`,
  },
  {
    keywords: ["skill", "recommendation", "learn", "trending"],
    response: () => `To get skill recommendations:
1. Complete your profile with current skills
2. Our AI analyzes your skill set
3. You'll see personalized recommendations based on:
   - Current industry trends
   - Your career goals
   - Skills that improve your job matches

Focus on learning in-demand skills to boost your opportunities! 📈`,
  },

  // === JOB POSTING (Recruiter) ===
  {
    keywords: ["post", "job", "create"],
    roles: ["recruiter"],
    response: () => `To post a new job:
1. Go to your **Recruiter Dashboard**
2. Click **"Post New Job"** button
3. Fill in the details:
   - Job title
   - Description (be detailed!)
   - Required skills (comma-separated)
   - Location
   - Salary range
   - Job type (full-time/part-time/contract/remote)
4. Click **"Post Job"**

Your job goes live immediately and candidates can start applying! 🎯`,
  },
  {
    keywords: ["edit", "delete", "job", "posting"],
    roles: ["recruiter"],
    response: () => `To manage your job postings:

**Edit a Job:**
1. Go to your Dashboard
2. Find the job in your jobs list
3. Click "Edit" button
4. Update details and save

**Delete a Job:**
1. Find the job in your list
2. Click "Delete" button
3. Confirm deletion

⚠️ Note: You can only edit/delete jobs that YOU posted.`,
  },

  // === CANDIDATE SCREENING (Recruiter) ===
  {
    keywords: ["find", "candidate", "best", "screen"],
    roles: ["recruiter"],
    response: () => `To find the best candidates:

1. **View Applications** - Go to your Dashboard and click on a job
2. **Check Match Scores** - AI shows skill compatibility (0-100%)
3. **Review Profiles** - Look at experience, skills, and resumes
4. **Filter & Sort** - Use filters to narrow down candidates
5. **Shortlist** - Update status to "shortlisted" for top candidates

💡 Candidates with 80%+ match scores are excellent fits!`,
  },
  {
    keywords: ["shortlist", "candidate", "status", "manage"],
    roles: ["recruiter"],
    response: () => `To manage candidate applications:

1. Go to your Dashboard
2. Click on a job to view applications
3. Update application status:
   - **Applied** → **Viewed** (you've reviewed it)
   - **Viewed** → **Shortlisted** (interested!)
   - **Shortlisted** → **Interview** (inviting to interview)
   - **Interview** → **Offered** or **Rejected**

Candidates see status updates in real-time, so keep them updated! 📧`,
  },
  {
    keywords: ["application", "review", "received"],
    roles: ["recruiter"],
    response: (context) => {
      const count = context.totalApplicationsCount || 0;
      return `${count > 0 ? `You've received **${count} total application(s)**!` : "You haven't received any applications yet."}

To review applications:
1. Go to your **Dashboard**
2. Click on any job posting
3. View list of candidates who applied
4. See their:
   - AI match score
   - Profile details
   - Skills and experience
   - Resume (if uploaded)

Use the match score to quickly identify the best candidates! ⭐`;
    },
  },

  // === USER MANAGEMENT (Admin) ===
  {
    keywords: ["manage", "user", "users"],
    roles: ["admin"],
    response: () => `To manage users as an admin:
1. Go to the **Admin Dashboard**
2. Click on "User Management" section
3. View all users (candidates, recruiters, admins)
4. You can:
   - View user details
   - Edit user information
   - Change user roles
   - Delete users (except your own account)

⚠️ Be careful with user management - changes affect real accounts!`,
  },
  {
    keywords: ["delete", "user", "account"],
    roles: ["admin"],
    response: () => `Yes, admins can delete user accounts:
1. Go to User Management
2. Find the user
3. Click "Delete" button
4. Confirm deletion

⚠️ **Important:**
- You CANNOT delete your own account
- Deletion is permanent and cannot be undone
- All user data will be removed

Use this carefully!`,
  },
  {
    keywords: ["statistics", "stats", "analytics", "monitor"],
    roles: ["admin"],
    response: (context) => `**Platform Statistics:**

${context.totalUsers ? `
• Total Users: ${context.totalUsers}
• Total Jobs: ${context.totalApplications || 0}
• Total Applications: ${context.totalApplications || 0}
` : ""}

To view detailed analytics:
1. Go to **Admin Dashboard**
2. View the statistics cards at the top
3. Monitor:
   - User growth
   - Active jobs
   - Application trends
   - Platform activity

You have full visibility into all platform data.`,
  },

  // === GENERAL PLATFORM QUESTIONS ===
  {
    keywords: ["what", "talenthub", "platform", "feature"],
    response: () => `**TalentHub Pro** is an AI-powered recruitment platform with:

✨ **For Candidates:**
• Job search with smart filters
• AI-powered resume parsing
• Application tracking
• Interview preparation
• Skill recommendations
• AI match scores

✨ **For Recruiters:**
• Easy job posting
• AI candidate matching
• Application management
• Interview question generation

🤖 **AI Features:**
• Smart skill matching
• Resume auto-extraction
• Interview question generation
• Personalized recommendations`,
  },
  {
    keywords: ["get", "start", "begin", "help"],
    response: (context) => {
      if (context.role === "candidate") {
        return `**Getting Started as a Candidate:**
1. Complete your profile (add bio, location, headline)
2. Upload your resume for AI parsing
3. Add your skills (at least 5-10)
4. Browse jobs in Job Search page
5. Apply to positions that match your skills
6. Track your applications in Dashboard

💡 Complete your profile first for best results!`;
      } else if (context.role === "recruiter") {
        return `**Getting Started as a Recruiter:**
1. Go to your Dashboard
2. Click "Post New Job"
3. Fill in job details thoroughly
4. Wait for candidates to apply
5. Review applications and match scores
6. Shortlist and interview top candidates

💡 Detailed job descriptions attract better candidates!`;
      } else {
        return `**Getting Started as an Admin:**
1. Access the Admin Dashboard
2. View platform statistics
3. Manage users (view, edit, delete)
4. Monitor platform activity
5. Ensure smooth operations

You have full access to all platform features.`;
      }
    },
  },
  {
    keywords: ["how", "work", "use"],
    response: (context) => {
      if (context.role === "candidate") {
        return `**How TalentHub Pro Works for You:**
1. Create & complete your profile
2. Upload resume (AI extracts info automatically)
3. Browse and apply for jobs
4. Our AI matches your skills with job requirements
5. Recruiters see your profile with match scores
6. Get shortlisted and invited to interviews!

The more complete your profile, the better your chances. 🎯`;
      } else if (context.role === "recruiter") {
        return `**How TalentHub Pro Works for Recruiters:**
1. Post jobs with required skills and details
2. Candidates apply for your positions
3. AI calculates match scores based on skills
4. Review candidates sorted by relevance
5. Shortlist top candidates
6. Manage interviews and offers

Our AI helps you find the best talent faster! 🚀`;
      } else {
        return `**Admin Overview:**
You have full administrative access to:
• View all users and their data
• Monitor all jobs and applications
• Access platform-wide statistics
• Manage user accounts
• Ensure platform health

Use your dashboard to monitor and manage the platform effectively.`;
      }
    },
  },

  // === ACCOUNT & SETTINGS ===
  {
    keywords: ["password", "change", "reset", "account"],
    response: () => `For account and password management:
• Go to your Profile/Settings page
• Look for account settings
• Update your password or email

⚠️ If you're locked out, please contact support for assistance.`,
  },
];

/**
 * Find the best matching response for a user's question
 */
export function generateFallbackResponse(
  userMessage: string,
  userContext: UserContext
): string {
  const lowerMessage = userMessage.toLowerCase();
  const role = userContext.role;

  // Find matching patterns
  let bestMatch: QuestionPattern | null = null;
  let highestMatchScore = 0;

  for (const pattern of QUESTION_PATTERNS) {
    // Check role restriction
    if (pattern.roles && !pattern.roles.includes(role)) {
      continue;
    }

    // Calculate match score (how many keywords match)
    const matchScore = pattern.keywords.filter(keyword =>
      lowerMessage.includes(keyword)
    ).length;

    // Require at least 2 keyword matches for specificity
    if (matchScore >= 2 && matchScore > highestMatchScore) {
      highestMatchScore = matchScore;
      bestMatch = pattern;
    }
  }

  // If we found a good match, use it
  if (bestMatch) {
    return bestMatch.response(userContext);
  }

  // Fallback to role-specific generic response
  if (role === "candidate") {
    return `I can help you with:
• Applying for jobs and tracking applications
• Improving your profile and uploading resume
• Interview preparation and tips
• Understanding AI matching and skills
• General platform navigation

What would you like to know more about?`;
  } else if (role === "recruiter") {
    return `I can help you with:
• Posting and managing job listings
• Reviewing and screening candidates
• Understanding AI match scores
• Managing application statuses
• Using recruiter features

What would you like to know more about?`;
  } else {
    return `I can help you with:
• User management and administration
• Platform statistics and monitoring
• System features and settings
• General platform oversight

What would you like to know more about?`;
  }
}
