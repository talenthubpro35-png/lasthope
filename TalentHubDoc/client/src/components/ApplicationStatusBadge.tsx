import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Eye, FileCheck, Video } from "lucide-react";

type ApplicationStatus = "applied" | "viewed" | "shortlisted" | "interview" | "rejected" | "offered";

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

const statusConfig: Record<ApplicationStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  applied: {
    label: "Applied",
    icon: Clock,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  },
  viewed: {
    label: "Reviewed",
    icon: Eye,
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
  },
  shortlisted: {
    label: "Shortlisted",
    icon: FileCheck,
    className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  },
  interview: {
    label: "Interview",
    icon: Video,
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  },
  offered: {
    label: "Offered",
    icon: CheckCircle,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  },
};

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={`gap-1 ${config.className}`} data-testid={`badge-status-${status}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
