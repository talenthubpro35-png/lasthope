import { JobCard } from "../JobCard";

export default function JobCardExample() {
  return (
    <JobCard
      id="job-1"
      title="Senior Frontend Developer"
      company="TechCorp Inc."
      location="San Francisco, CA"
      salary="$120k - $160k"
      type="Full-time"
      skills={["React", "TypeScript", "Node.js", "GraphQL", "AWS"]}
      matchScore={92}
      postedDate="2 days ago"
      onApply={() => console.log("Applied to job")}
      onViewDetails={() => console.log("Viewing details")}
    />
  );
}
