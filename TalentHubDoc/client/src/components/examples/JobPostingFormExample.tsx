import { JobPostingForm } from "../JobPostingForm";

export default function JobPostingFormExample() {
  return (
    <JobPostingForm
      onSubmit={(data) => console.log("Job posted:", data)}
      onGenerateDescription={() => console.log("Generating AI description...")}
    />
  );
}
