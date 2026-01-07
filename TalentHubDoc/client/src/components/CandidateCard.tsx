import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkillBadge } from "./SkillBadge";
import { MapPin, Briefcase, Calendar, Sparkles, CheckCircle2, XCircle } from "lucide-react";

type ApplicationStatus = "applied" | "reviewed" | "shortlisted" | "rejected";
type JobSearchStatus = "available" | "selected" | "not_available";

interface CandidateCardProps {
  id: string;
  name: string;
  title: string;
  location: string;
  experience: string;
  skills: string[];
  avatarUrl?: string;
  availability: string;
  jobSearchStatus?: JobSearchStatus;
  matchScore?: number;
  status?: ApplicationStatus;
  onViewProfile?: () => void;
  onShortlist?: () => void;
  onMessage?: () => void;
}

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  applied: { label: "Applied", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  reviewed: { label: "Reviewed", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  shortlisted: { label: "Shortlisted", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

const jobSearchStatusConfig: Record<JobSearchStatus, { label: string; className: string; icon: any }> = {
  available: { label: "Available", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle2 },
  selected: { label: "Selected", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: CheckCircle2 },
  not_available: { label: "Not Available", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", icon: XCircle },
};

export function CandidateCard({
  id,
  name,
  title,
  location,
  experience,
  skills,
  avatarUrl,
  availability,
  jobSearchStatus,
  matchScore,
  status,
  onViewProfile,
  onShortlist,
  onMessage,
}: CandidateCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="hover-elevate" data-testid={`card-candidate-${id}`}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-lg" data-testid={`text-candidate-name-${id}`}>
              {name}
            </h3>
            {matchScore && (
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">{matchScore}%</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            <span>{experience}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{availability}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status && (
            <Badge className={statusConfig[status].className}>
              {statusConfig[status].label}
            </Badge>
          )}
          {jobSearchStatus && (
            <Badge className={jobSearchStatusConfig[jobSearchStatus].className}>
              {jobSearchStatusConfig[jobSearchStatus].label}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.slice(0, 4).map((skill) => (
            <SkillBadge key={skill} skill={skill} />
          ))}
          {skills.length > 4 && (
            <Badge variant="secondary">+{skills.length - 4} more</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button className="flex-1" onClick={onViewProfile} data-testid={`button-view-profile-${id}`}>
          View Profile
        </Button>
        <Button variant="outline" onClick={onShortlist} data-testid={`button-shortlist-${id}`}>
          Shortlist
        </Button>
      </CardFooter>
    </Card>
  );
}
