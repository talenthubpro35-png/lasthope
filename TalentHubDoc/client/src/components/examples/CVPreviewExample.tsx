import { CVPreview } from "../CVPreview";

// todo: remove mock functionality
const mockCVData = {
  name: "Sarah Johnson",
  title: "Senior Full Stack Developer",
  email: "sarah.johnson@email.com",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA",
  website: "sarahjohnson.dev",
  linkedin: "linkedin.com/in/sarahjohnson",
  summary: "Experienced Full Stack Developer with 6+ years of expertise in building scalable web applications. Passionate about clean code, user experience, and mentoring junior developers. Proven track record of delivering high-impact projects in agile environments.",
  skills: ["React", "TypeScript", "Node.js", "Python", "PostgreSQL", "AWS", "Docker", "GraphQL", "Redis", "CI/CD"],
  experience: [
    {
      title: "Senior Full Stack Developer",
      company: "TechCorp Inc.",
      duration: "2021 - Present",
      description: [
        "Led development of a microservices architecture serving 1M+ daily users",
        "Mentored a team of 5 junior developers, improving team velocity by 40%",
        "Implemented CI/CD pipelines reducing deployment time by 60%",
      ],
    },
    {
      title: "Full Stack Developer",
      company: "StartupXYZ",
      duration: "2018 - 2021",
      description: [
        "Built and maintained React-based SPA with 50+ components",
        "Designed RESTful APIs handling 10K+ requests per minute",
        "Collaborated with UX team to improve user satisfaction by 25%",
      ],
    },
  ],
  education: [
    {
      degree: "M.S. Computer Science",
      institution: "Stanford University",
      year: "2018",
    },
    {
      degree: "B.S. Computer Science",
      institution: "UC Berkeley",
      year: "2016",
    },
  ],
};

export default function CVPreviewExample() {
  return (
    <CVPreview
      data={mockCVData}
      onDownload={() => console.log("Downloading CV...")}
    />
  );
}
