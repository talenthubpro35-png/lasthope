import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

interface JobSearchStatusSectionProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  isUpdating?: boolean;
}

const statusConfig = {
  available: {
    label: "Available",
    description: "You're actively looking for new opportunities",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
  },
  selected: {
    label: "Selected",
    description: "You've accepted a job offer",
    icon: CheckCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  not_available: {
    label: "Not Available",
    description: "You're not currently looking for opportunities",
    icon: XCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-950",
    borderColor: "border-gray-200 dark:border-gray-800",
  },
};

export function JobSearchStatusSection({ currentStatus, onStatusChange, isUpdating }: JobSearchStatusSectionProps) {
  const currentConfig = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.available;
  const CurrentIcon = currentConfig.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Job Search Status
        </CardTitle>
        <CardDescription>
          Let recruiters know your current availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status Display */}
        <div className={`rounded-lg border-2 ${currentConfig.borderColor} ${currentConfig.bgColor} p-4`}>
          <div className="flex items-center gap-3">
            <CurrentIcon className={`h-6 w-6 ${currentConfig.color}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{currentConfig.label}</p>
                <Badge variant="secondary" className="text-xs">Current</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentConfig.description}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Status Update Section */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Update Your Status</Label>
          <p className="text-sm text-muted-foreground">
            Choose your current job search status to help recruiters understand your availability
          </p>
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant={currentStatus === "available" ? "default" : "outline"}
              onClick={() => onStatusChange("available")}
              disabled={isUpdating}
              className="w-full justify-start h-auto py-3"
            >
              <CheckCircle className="mr-3 h-5 w-5 shrink-0" />
              <div className="text-left flex-1">
                <div className="font-semibold">Available</div>
                <div className="text-xs font-normal opacity-80">Actively looking for opportunities</div>
              </div>
              {isUpdating && currentStatus !== "available" && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
            </Button>

            <Button
              variant={currentStatus === "selected" ? "default" : "outline"}
              onClick={() => onStatusChange("selected")}
              disabled={isUpdating}
              className="w-full justify-start h-auto py-3"
            >
              <CheckCircle className="mr-3 h-5 w-5 shrink-0" />
              <div className="text-left flex-1">
                <div className="font-semibold">Selected</div>
                <div className="text-xs font-normal opacity-80">Accepted a job offer</div>
              </div>
              {isUpdating && currentStatus !== "selected" && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
            </Button>

            <Button
              variant={currentStatus === "not_available" ? "default" : "outline"}
              onClick={() => onStatusChange("not_available")}
              disabled={isUpdating}
              className="w-full justify-start h-auto py-3"
            >
              <XCircle className="mr-3 h-5 w-5 shrink-0" />
              <div className="text-left flex-1">
                <div className="font-semibold">Not Available</div>
                <div className="text-xs font-normal opacity-80">Not currently looking</div>
              </div>
              {isUpdating && currentStatus !== "not_available" && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
            </Button>
          </div>
        </div>

        {/* Info Section */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
          <p className="font-medium">Why update your status?</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>Available:</strong> Recruiters will actively reach out with opportunities</li>
            <li>• <strong>Selected:</strong> Signals you're no longer in the job market</li>
            <li>• <strong>Not Available:</strong> Temporarily pauses recruiter outreach</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
