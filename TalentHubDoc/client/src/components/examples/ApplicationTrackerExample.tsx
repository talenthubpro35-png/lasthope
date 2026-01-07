import { ApplicationTracker } from "../ApplicationTracker";

// todo: remove mock functionality
const mockApplications = [
  {
    id: "1",
    jobTitle: "Senior Frontend Developer",
    company: "TechCorp Inc.",
    appliedDate: "Nov 28, 2024",
    status: "shortlisted" as const,
  },
  {
    id: "2",
    jobTitle: "Full Stack Engineer",
    company: "StartupXYZ",
    appliedDate: "Nov 25, 2024",
    status: "reviewed" as const,
  },
  {
    id: "3",
    jobTitle: "React Developer",
    company: "InnovateLabs",
    appliedDate: "Nov 20, 2024",
    status: "applied" as const,
  },
  {
    id: "4",
    jobTitle: "Software Engineer",
    company: "BigTech Co.",
    appliedDate: "Nov 15, 2024",
    status: "rejected" as const,
  },
];

export default function ApplicationTrackerExample() {
  return (
    <ApplicationTracker
      applications={mockApplications}
      onViewApplication={(id) => console.log("Viewing application:", id)}
      onWithdraw={(id) => console.log("Withdrawing application:", id)}
    />
  );
}
