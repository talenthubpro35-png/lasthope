import { ApplicationStatusBadge } from "../ApplicationStatusBadge";

export default function ApplicationStatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2">
      <ApplicationStatusBadge status="applied" />
      <ApplicationStatusBadge status="reviewed" />
      <ApplicationStatusBadge status="shortlisted" />
      <ApplicationStatusBadge status="rejected" />
      <ApplicationStatusBadge status="hired" />
    </div>
  );
}
