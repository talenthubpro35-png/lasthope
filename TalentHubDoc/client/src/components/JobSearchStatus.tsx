import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface JobSearchStatusProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const statusConfig = {
  available: {
    label: "Available",
    description: "Actively looking for opportunities",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    badgeVariant: "default" as const,
  },
  selected: {
    label: "Selected",
    description: "Accepted a job offer",
    icon: CheckCircle2,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    badgeVariant: "secondary" as const,
  },
  not_available: {
    label: "Not Available",
    description: "Not looking for opportunities",
    icon: XCircle,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    badgeVariant: "outline" as const,
  },
};

export function JobSearchStatus({ value, onChange, disabled }: JobSearchStatusProps) {
  const currentStatus = statusConfig[value as keyof typeof statusConfig] || statusConfig.available;
  const Icon = currentStatus.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Job Search Status
        </CardTitle>
        <CardDescription>
          Let recruiters know your current availability status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([key, config]) => {
                const StatusIcon = config.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4" />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <span className="font-medium">{currentStatus.label}</span>
            <Badge variant={currentStatus.badgeVariant} className="ml-auto">
              Current Status
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentStatus.description}
          </p>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Available:</strong> You're actively looking for new opportunities</p>
          <p><strong>Selected:</strong> You've accepted an offer and are no longer job hunting</p>
          <p><strong>Not Available:</strong> You're not currently looking for opportunities</p>
        </div>
      </CardContent>
    </Card>
  );
}
