import { CandidateCard } from "../CandidateCard";

export default function CandidateCardExample() {
  return (
    <CandidateCard
      id="candidate-1"
      name="Sarah Johnson"
      title="Full Stack Developer"
      location="New York, NY"
      experience="5 years"
      skills={["React", "Node.js", "Python", "AWS", "PostgreSQL"]}
      availability="Immediately"
      matchScore={87}
      status="shortlisted"
      onViewProfile={() => console.log("Viewing profile")}
      onShortlist={() => console.log("Shortlisting")}
    />
  );
}
