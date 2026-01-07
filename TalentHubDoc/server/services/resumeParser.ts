import mammoth from "mammoth";
import fs from "fs/promises";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { createRequire } from "module";

// Use CommonJS require for pdf-parse (CommonJS module compatibility)
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year?: string;
    field?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    credentialId?: string;
  }>;
  projects?: Array<{
    title: string;
    description?: string;
    technologies?: string[];
    date?: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
  volunteer?: Array<{
    role: string;
    organization: string;
    duration: string;
    description?: string;
  }>;
  awards?: Array<{
    title: string;
    issuer: string;
    date: string;
    description?: string;
  }>;
  publications?: Array<{
    title: string;
    publisher: string;
    date: string;
    description?: string;
  }>;
  courses?: Array<{
    name: string;
    institution: string;
    date: string;
  }>;
  yearsOfExperience?: number;
}

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error("[resumeParser] Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error("[resumeParser] Error extracting text from DOCX:", error);
    throw new Error("Failed to extract text from DOCX");
  }
}

/**
 * Main function to extract text from resume based on file type
 */
export async function extractTextFromResume(
  filePath: string,
  fileType: string
): Promise<string> {
  const mimeType = fileType.toLowerCase();

  if (mimeType.includes("pdf")) {
    return extractTextFromPDF(filePath);
  } else if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword")
  ) {
    return extractTextFromDOCX(filePath);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Parse resume text using AI (Groq, Gemini, or OpenAI) to extract structured data
 */
export async function parseResumeWithAI(
  resumeText: string
): Promise<ParsedResumeData> {
  // Initialize AI clients at runtime (after dotenv loads)
  // Priority: Groq (FREE, 14.4K/day) → Gemini (FREE, limited) → OpenAI (paid) → regex

  // Try Groq first (FREE and FAST!)
  if (process.env.GROQ_API_KEY) {
    console.log("[resumeParser] Trying Groq AI (FREE - 14,400 requests/day)");
    try {
      const result = await parseWithGroq(resumeText, process.env.GROQ_API_KEY);
      if (Object.keys(result).length > 0) {
        return result;
      }
    } catch (error) {
      console.warn("[resumeParser] Groq failed, trying next option...");
    }
  }

  // Try Gemini (FREE but has quota limits)
  if (process.env.GEMINI_API_KEY) {
    console.log("[resumeParser] Trying Gemini AI (FREE)");
    try {
      const result = await parseWithGemini(resumeText, process.env.GEMINI_API_KEY);
      if (Object.keys(result).length > 0) {
        return result;
      }
    } catch (error) {
      console.warn("[resumeParser] Gemini failed, trying next option...");
    }
  }

  // Try OpenAI (paid)
  if (process.env.OPENAI_API_KEY) {
    console.log("[resumeParser] Trying OpenAI");
    try {
      const result = await parseWithOpenAI(resumeText, process.env.OPENAI_API_KEY);
      if (Object.keys(result).length > 0) {
        return result;
      }
    } catch (error) {
      console.warn("[resumeParser] OpenAI failed, using regex fallback...");
    }
  }

  // Fallback to FREE regex-based parser (no API required)
  console.log("[resumeParser] Using enhanced regex-based parser (no API required)");
  return parseWithRegex(resumeText);
}

/**
 * FREE regex-based parser (no API required)
 * Extracts basic information using pattern matching
 */
function parseWithRegex(resumeText: string): ParsedResumeData {
  const result: ParsedResumeData = {};

  // Extract email
  const emailMatch = resumeText.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Extract phone (various formats)
  const phoneMatch = resumeText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0];
  }

  // Extract name (usually first line or near top)
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    // First non-empty line is usually the name
    const firstLine = lines[0];
    if (firstLine.length < 50 && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+/.test(firstLine)) {
      result.name = firstLine;
    }
  }

  // Extract location (look for City, State or City, Country patterns)
  const locationMatch = resumeText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2,}|[A-Z][a-z]+)/);
  if (locationMatch) {
    result.location = `${locationMatch[1]}, ${locationMatch[2]}`;
  }

  // Extract skills (look for "Skills:" section)
  const skillsSection = resumeText.match(/Skills?:?\s*\n?([\s\S]*?)(?:\n\n|Experience|Education|$)/i);
  if (skillsSection) {
    const skillsText = skillsSection[1];
    // Extract comma-separated or bulleted skills
    const skills = skillsText
      .split(/[,\n•·-]/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && s.length < 30)
      .slice(0, 15); // Limit to 15 skills
    if (skills.length > 0) {
      result.skills = skills;
    }
  }

  // Extract experience (look for "Experience:" section)
  const experienceSection = resumeText.match(/Experience:?\s*\n?([\s\S]*?)(?:\n\n(?:Education|Skills)|$)/i);
  if (experienceSection) {
    const expText = experienceSection[1];
    const experience: Array<{
      title: string;
      company: string;
      duration: string;
      description?: string;
    }> = [];

    // Look for job title patterns
    const jobMatches = expText.matchAll(/([A-Z][a-zA-Z\s]+?)(?:\s+at\s+|\s+[-–]\s+)([A-Z][a-zA-Z\s&,.]+?)(?:\s+|\n)(\d{4}(?:\s*[-–]\s*(?:\d{4}|Present))?)/g);
    for (const match of jobMatches) {
      experience.push({
        title: match[1].trim(),
        company: match[2].trim(),
        duration: match[3].trim(),
      });
    }

    if (experience.length > 0) {
      result.experience = experience.slice(0, 5); // Limit to 5 experiences
    }
  }

  // Extract education (look for "Education:" section)
  const educationSection = resumeText.match(/Education:?\s*\n?([\s\S]*?)(?:\n\n(?:Experience|Skills)|$)/i);
  if (educationSection) {
    const eduText = educationSection[1];
    const education: Array<{
      degree: string;
      institution: string;
      year?: string;
      field?: string;
    }> = [];

    // Look for degree patterns
    const degreeMatches = eduText.matchAll(/(Bachelor|Master|PhD|Associate|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?)[^\n]*?(?:\s+in\s+([A-Z][a-zA-Z\s]+?))?(?:\s+[-–]\s+)?([A-Z][a-zA-Z\s&,.]+?)(?:\s+|\n)(\d{4})?/gi);
    for (const match of degreeMatches) {
      education.push({
        degree: match[1].trim(),
        institution: match[3].trim(),
        year: match[4] || undefined,
        field: match[2]?.trim() || undefined,
      });
    }

    if (education.length > 0) {
      result.education = education.slice(0, 3); // Limit to 3 education entries
    }
  }

  // Extract certifications
  const certsSection = resumeText.match(/(?:Certifications?|Licenses?)[:：]?\s*\n([\s\S]*?)(?:\n\n|Projects?|Languages?|Volunteer|Awards?|Publications?|Courses?|$)/i);
  if (certsSection) {
    const certifications: Array<{name: string; issuer: string; date: string}> = [];
    const certLines = certsSection[1].split('\n').filter(l => l.trim().length > 0);

    for (let i = 0; i < certLines.length && i < 5; i++) {
      const line = certLines[i].trim();
      // Try to extract cert name, issuer, and date
      const certMatch = line.match(/([^-•·\n]{3,50})(?:\s+[-–]\s+|\s+,\s+|\s+by\s+|\s+from\s+)?([^,\n]{3,40})(?:,\s*)?(\d{4})?/i);
      if (certMatch) {
        certifications.push({
          name: certMatch[1].trim(),
          issuer: certMatch[2].trim(),
          date: certMatch[3] || new Date().getFullYear().toString()
        });
      }
    }
    if (certifications.length > 0) {
      result.certifications = certifications;
    }
  }

  // Extract projects
  const projectsSection = resumeText.match(/Projects?[:：]?\s*\n([\s\S]*?)(?:\n\n|Languages?|Volunteer|Awards?|Publications?|Courses?|$)/i);
  if (projectsSection) {
    const projects: Array<{title: string; description?: string; technologies?: string[]}> = [];
    const projectLines = projectsSection[1].split(/\n\n+/);

    for (let i = 0; i < projectLines.length && i < 5; i++) {
      const block = projectLines[i].trim();
      const lines = block.split('\n').map(l => l.trim());
      if (lines.length > 0) {
        const title = lines[0].replace(/^[-•·]\s*/, '');
        const description = lines.slice(1).join(' ').substring(0, 200);
        projects.push({
          title: title,
          description: description || undefined,
          technologies: [] // Regex can't easily extract this
        });
      }
    }
    if (projects.length > 0) {
      result.projects = projects;
    }
  }

  // Extract languages
  const languagesSection = resumeText.match(/Languages?[:：]?\s*\n([\s\S]*?)(?:\n\n|Volunteer|Awards?|Publications?|Courses?|$)/i);
  if (languagesSection) {
    const languages: Array<{language: string; proficiency: string}> = [];
    const langLines = languagesSection[1].split(/[,\n•·-]/).filter(l => l.trim().length > 0);

    for (let i = 0; i < langLines.length && i < 10; i++) {
      const line = langLines[i].trim();
      // Try to extract language and proficiency
      const langMatch = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[-–:]?\s*(Native|Fluent|Professional|Intermediate|Basic|Conversational)?/i);
      if (langMatch) {
        languages.push({
          language: langMatch[1].trim(),
          proficiency: langMatch[2]?.trim() || 'Professional'
        });
      }
    }
    if (languages.length > 0) {
      result.languages = languages;
    }
  }

  // Extract volunteer experience
  const volunteerSection = resumeText.match(/(?:Volunteer|Community\s+Service)[:：]?\s*\n([\s\S]*?)(?:\n\n|Awards?|Publications?|Courses?|$)/i);
  if (volunteerSection) {
    const volunteer: Array<{role: string; organization: string; duration: string}> = [];
    const volLines = volunteerSection[1].split(/\n\n+/);

    for (let i = 0; i < volLines.length && i < 3; i++) {
      const block = volLines[i].trim();
      const roleMatch = block.match(/([^-•·\n]{3,50})\s+(?:at|,)\s+([^,\n]{3,40})(?:,\s*)?(\d{4}(?:\s*[-–]\s*(?:\d{4}|Present))?)?/i);
      if (roleMatch) {
        volunteer.push({
          role: roleMatch[1].trim(),
          organization: roleMatch[2].trim(),
          duration: roleMatch[3] || 'Past'
        });
      }
    }
    if (volunteer.length > 0) {
      result.volunteer = volunteer;
    }
  }

  // Extract awards
  const awardsSection = resumeText.match(/(?:Awards?|Honors?)[:：]?\s*\n([\s\S]*?)(?:\n\n|Publications?|Courses?|$)/i);
  if (awardsSection) {
    const awards: Array<{title: string; issuer: string; date: string}> = [];
    const awardLines = awardsSection[1].split('\n').filter(l => l.trim().length > 0);

    for (let i = 0; i < awardLines.length && i < 5; i++) {
      const line = awardLines[i].trim();
      const awardMatch = line.match(/([^-•·,\n]{3,50})(?:,\s*)?([^,\n]{3,40})?(?:,\s*)?(\d{4})?/i);
      if (awardMatch) {
        awards.push({
          title: awardMatch[1].trim(),
          issuer: awardMatch[2]?.trim() || 'Organization',
          date: awardMatch[3] || new Date().getFullYear().toString()
        });
      }
    }
    if (awards.length > 0) {
      result.awards = awards;
    }
  }

  // Extract publications
  const publicationsSection = resumeText.match(/Publications?[:：]?\s*\n([\s\S]*?)(?:\n\n|Courses?|$)/i);
  if (publicationsSection) {
    const publications: Array<{title: string; publisher: string; date: string}> = [];
    const pubLines = publicationsSection[1].split('\n').filter(l => l.trim().length > 0);

    for (let i = 0; i < pubLines.length && i < 5; i++) {
      const line = pubLines[i].trim();
      const pubMatch = line.match(/([^-•·,\n]{5,80})(?:,\s*)?([^,\n]{3,40})?(?:,\s*)?(\d{4})?/i);
      if (pubMatch) {
        publications.push({
          title: pubMatch[1].trim(),
          publisher: pubMatch[2]?.trim() || 'Publisher',
          date: pubMatch[3] || new Date().getFullYear().toString()
        });
      }
    }
    if (publications.length > 0) {
      result.publications = publications;
    }
  }

  // Extract courses
  const coursesSection = resumeText.match(/(?:Courses?|Training|Professional\s+Development)[:：]?\s*\n([\s\S]*?)(?:\n\n|$)/i);
  if (coursesSection) {
    const courses: Array<{name: string; institution: string; date: string}> = [];
    const courseLines = coursesSection[1].split('\n').filter(l => l.trim().length > 0);

    for (let i = 0; i < courseLines.length && i < 5; i++) {
      const line = courseLines[i].trim();
      const courseMatch = line.match(/([^-•·,\n]{3,60})(?:,\s*|\s+[-–]\s+)?([^,\n]{3,40})?(?:,\s*)?(\d{4})?/i);
      if (courseMatch) {
        courses.push({
          name: courseMatch[1].trim(),
          institution: courseMatch[2]?.trim() || 'Online',
          date: courseMatch[3] || new Date().getFullYear().toString()
        });
      }
    }
    if (courses.length > 0) {
      result.courses = courses;
    }
  }

  // Calculate years of experience from experience entries
  if (result.experience && result.experience.length > 0) {
    let totalYears = 0;
    for (const exp of result.experience) {
      const yearMatch = exp.duration.match(/(\d{4})\s*[-–]\s*(?:(\d{4})|Present)/i);
      if (yearMatch) {
        const startYear = parseInt(yearMatch[1]);
        const endYear = yearMatch[2] ? parseInt(yearMatch[2]) : new Date().getFullYear();
        totalYears += endYear - startYear;
      }
    }
    if (totalYears > 0) {
      result.yearsOfExperience = totalYears;
    }
  }

  // Generate a simple bio from available information
  if (result.name || result.skills || result.experience) {
    const bioparts: string[] = [];
    if (result.name) {
      bioparts.push(result.name);
    }
    if (result.experience && result.experience.length > 0) {
      bioparts.push(`with experience as ${result.experience[0].title}`);
    }
    if (result.skills && result.skills.length > 0) {
      bioparts.push(`Skilled in ${result.skills.slice(0, 3).join(', ')}`);
    }
    if (bioparts.length > 0) {
      result.bio = bioparts.join(' ') + '.';
    }
  }

  console.log("[resumeParser] Regex parser extracted fields:", Object.keys(result).join(', '));
  return result;
}

/**
 * Parse resume using Groq (FREE - 14,400 requests/day, fastest)
 */
async function parseWithGroq(resumeText: string, apiKey: string): Promise<ParsedResumeData> {
  try {
    const groq = new Groq({ apiKey });

    const prompt = `You are a resume parsing expert. Extract the following information from the resume text below and return ONLY a valid JSON object with no markdown formatting, no code blocks, and no additional text.

Required JSON structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "City, Country",
  "bio": "2-3 sentence professional summary based on the resume",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Present",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "year": "2020",
      "field": "Field of Study"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "2023",
      "credentialId": "ABC123"
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": "Brief description",
      "technologies": ["Tech1", "Tech2"],
      "date": "2023"
    }
  ],
  "languages": [
    {
      "language": "English",
      "proficiency": "Native/Fluent/Professional/Intermediate/Basic"
    }
  ],
  "volunteer": [
    {
      "role": "Volunteer Role",
      "organization": "Organization Name",
      "duration": "2020 - 2022",
      "description": "Brief description"
    }
  ],
  "awards": [
    {
      "title": "Award Title",
      "issuer": "Issuing Organization",
      "date": "2023",
      "description": "Brief description"
    }
  ],
  "publications": [
    {
      "title": "Publication Title",
      "publisher": "Publisher Name",
      "date": "2023",
      "description": "Brief description"
    }
  ],
  "courses": [
    {
      "name": "Course Name",
      "institution": "Institution Name",
      "date": "2023"
    }
  ],
  "yearsOfExperience": 5
}

Instructions:
- Extract ALL available information from the resume
- Look for sections like: Certifications, Projects, Languages, Volunteer, Awards, Publications, Courses
- If a field is not found, omit it from the JSON
- For bio, create a professional 2-3 sentence summary
- For yearsOfExperience, calculate total years based on work history
- Return ONLY the JSON object, no other text
- Do not use markdown code blocks

Resume text:
${resumeText}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a resume parsing assistant. Extract structured data from resumes and return ONLY valid JSON with no formatting."
        },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || "{}";

    // Remove markdown code blocks if present
    let cleanedText = responseText;
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const parsedData: ParsedResumeData = JSON.parse(cleanedText);

    console.log("[resumeParser] Successfully parsed resume data with Groq (FREE)");
    return parsedData;
  } catch (error) {
    console.error("[resumeParser] Error parsing resume with Groq:", error);
    return {};
  }
}

/**
 * Parse resume using Google Gemini (FREE)
 */
async function parseWithGemini(resumeText: string, apiKey: string): Promise<ParsedResumeData> {
  try {
    const gemini = new GoogleGenerativeAI(apiKey);
    const model = gemini.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `You are a resume parsing expert. Extract the following information from the resume text below and return ONLY a valid JSON object with no markdown formatting, no code blocks, and no additional text.

Required JSON structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "City, Country",
  "bio": "2-3 sentence professional summary based on the resume",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Present",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "year": "2020",
      "field": "Field of Study"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "2023",
      "credentialId": "ABC123"
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": "Brief description",
      "technologies": ["Tech1", "Tech2"],
      "date": "2023"
    }
  ],
  "languages": [
    {
      "language": "English",
      "proficiency": "Native/Fluent/Professional/Intermediate/Basic"
    }
  ],
  "volunteer": [
    {
      "role": "Volunteer Role",
      "organization": "Organization Name",
      "duration": "2020 - 2022",
      "description": "Brief description"
    }
  ],
  "awards": [
    {
      "title": "Award Title",
      "issuer": "Issuing Organization",
      "date": "2023",
      "description": "Brief description"
    }
  ],
  "publications": [
    {
      "title": "Publication Title",
      "publisher": "Publisher Name",
      "date": "2023",
      "description": "Brief description"
    }
  ],
  "courses": [
    {
      "name": "Course Name",
      "institution": "Institution Name",
      "date": "2023"
    }
  ],
  "yearsOfExperience": 5
}

Instructions:
- Extract ALL available information from the resume
- Look for sections like: Certifications, Projects, Languages, Volunteer, Awards, Publications, Courses
- If a field is not found, omit it from the JSON
- For bio, create a professional 2-3 sentence summary
- For yearsOfExperience, calculate total years based on work history
- Return ONLY the JSON object, no other text
- Do not use markdown code blocks

Resume text:
${resumeText}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Remove markdown code blocks if present
    let cleanedText = responseText;
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const parsedData: ParsedResumeData = JSON.parse(cleanedText);

    console.log("[resumeParser] Successfully parsed resume data with Gemini (FREE)");
    return parsedData;
  } catch (error) {
    console.error("[resumeParser] Error parsing resume with Gemini:", error);
    return {};
  }
}

/**
 * Parse resume using OpenAI (paid)
 */
async function parseWithOpenAI(resumeText: string, apiKey: string): Promise<ParsedResumeData> {
  try {
    const openai = new OpenAI({ apiKey });
    const prompt = `You are a resume parsing expert. Extract the following information from the resume text below and return ONLY a valid JSON object with no markdown formatting, no code blocks, and no additional text.

Required JSON structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "City, Country",
  "bio": "2-3 sentence professional summary based on the resume",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Present",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University Name",
      "year": "2020",
      "field": "Field of Study"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "2023",
      "credentialId": "ABC123"
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": "Brief description",
      "technologies": ["Tech1", "Tech2"],
      "date": "2023"
    }
  ],
  "languages": [
    {
      "language": "English",
      "proficiency": "Native/Fluent/Professional/Intermediate/Basic"
    }
  ],
  "volunteer": [
    {
      "role": "Volunteer Role",
      "organization": "Organization Name",
      "duration": "2020 - 2022",
      "description": "Brief description"
    }
  ],
  "awards": [
    {
      "title": "Award Title",
      "issuer": "Issuing Organization",
      "date": "2023",
      "description": "Brief description"
    }
  ],
  "publications": [
    {
      "title": "Publication Title",
      "publisher": "Publisher Name",
      "date": "2023",
      "description": "Brief description"
    }
  ],
  "courses": [
    {
      "name": "Course Name",
      "institution": "Institution Name",
      "date": "2023"
    }
  ],
  "yearsOfExperience": 5
}

Instructions:
- Extract ALL available information from the resume
- Look for sections like: Certifications, Projects, Languages, Volunteer, Awards, Publications, Courses
- If a field is not found, omit it from the JSON
- For bio, create a professional 2-3 sentence summary
- For yearsOfExperience, calculate total years based on work history
- Return ONLY the JSON object, no other text
- Do not use markdown code blocks

Resume text:
${resumeText}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a resume parsing assistant. You extract structured data from resumes and return ONLY valid JSON with no formatting.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || "{}";

    // Remove markdown code blocks if present
    let cleanedText = responseText;
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const parsedData: ParsedResumeData = JSON.parse(cleanedText);

    console.log("[resumeParser] Successfully parsed resume data with OpenAI");
    return parsedData;
  } catch (error) {
    console.error("[resumeParser] Error parsing resume with OpenAI:", error);
    return {};
  }
}

/**
 * Complete resume processing pipeline
 */
export async function processResume(
  filePath: string,
  fileType: string
): Promise<ParsedResumeData> {
  try {
    console.log("[resumeParser] Starting resume processing...");

    // Step 1: Extract text
    const resumeText = await extractTextFromResume(filePath, fileType);
    console.log("[resumeParser] Extracted text length:", resumeText.length);

    // Step 2: Parse with AI
    const parsedData = await parseResumeWithAI(resumeText);
    console.log("[resumeParser] Parsing complete");

    return parsedData;
  } catch (error) {
    console.error("[resumeParser] Error processing resume:", error);
    throw error;
  }
}
