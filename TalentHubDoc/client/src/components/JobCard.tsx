import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "./SkillBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, MapPin, DollarSign, Clock, Sparkles, ChevronDown, Zap, Linkedin, FileText, ExternalLink, Bookmark } from "lucide-react";

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: "Full-time" | "Part-time" | "Contract" | "Remote";
  skills: string[];
  matchScore?: number;
  postedDate: string;
  externalUrl?: string;
  linkedinUrl?: string;
  onApply?: () => void;
  onQuickApply?: () => void;
  onApplyWithLinkedIn?: () => void;
  onApplyWithResume?: () => void;
  onSaveJob?: () => void;
  onViewDetails?: () => void;
}

export function JobCard({
  id,
  title,
  company,
  location,
  salary,
  type,
  skills,
  matchScore,
  postedDate,
  externalUrl,
  linkedinUrl,
  onApply,
  onQuickApply,
  onApplyWithLinkedIn,
  onApplyWithResume,
  onSaveJob,
  onViewDetails,
}: JobCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-job-${id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg leading-tight" data-testid={`text-job-title-${id}`}>
            {title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{company}</span>
          </div>
        </div>
        {matchScore && (
          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-sm font-medium text-primary">{matchScore}%</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span>{salary}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{postedDate}</span>
          </div>
        </div>
        <Badge variant="outline">{type}</Badge>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex-1" data-testid={`button-apply-${id}`}>
              <Zap className="h-4 w-4 mr-2" />
              Apply Now
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={onQuickApply || onApply}>
              <Zap className="h-4 w-4 mr-2" />
              Quick Apply
            </DropdownMenuItem>
            {linkedinUrl && (
              <DropdownMenuItem onClick={onApplyWithLinkedIn}>
                <Linkedin className="h-4 w-4 mr-2" />
                Apply with LinkedIn
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onApplyWithResume || onApply}>
              <FileText className="h-4 w-4 mr-2" />
              Apply with Resume
            </DropdownMenuItem>
            {externalUrl && (
              <DropdownMenuItem
                onClick={() => window.open(externalUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apply on Company Site
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSaveJob}>
              <Bookmark className="h-4 w-4 mr-2" />
              Save for Later
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={onViewDetails} data-testid={`button-view-${id}`}>
          Details
        </Button>
      </CardFooter>
    </Card>
  );
}
