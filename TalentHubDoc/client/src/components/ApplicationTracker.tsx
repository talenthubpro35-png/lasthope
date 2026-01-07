import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { applications } from "@/lib/api";
import {
  Building2,
  Calendar,
  Eye,
  MoreHorizontal,
  Filter,
  X,
  Clock,
  Inbox,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ApplicationStatus = "applied" | "viewed" | "shortlisted" | "interview" | "rejected" | "offered";

const statusOptions: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "All Applications" },
  { value: "applied", label: "Applied" },
  { value: "viewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview", label: "Interview" },
  { value: "offered", label: "Offered" },
  { value: "rejected", label: "Rejected" },
];

interface ApplicationTrackerProps {
  /** Optional: If provided, component acts as controlled. If not, fetches its own data */
  applications?: any[];
  onViewApplication?: (id: string) => void;
  onWithdraw?: (id: string) => void;
  /** If true, component will fetch its own data */
  standalone?: boolean;
}

export function ApplicationTracker({
  applications: externalApplications,
  onViewApplication,
  onWithdraw,
  standalone = false,
}: ApplicationTrackerProps) {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch applications only if standalone mode or no external data provided
  const {
    data: fetchedApplications,
    isLoading,
    error,
  } = useQuery<any[]>({
    queryKey: ["/api/applications/me"],
    enabled: standalone || !externalApplications,
    retry: false,
  });

  // Withdraw application mutation
  const withdrawMutation = useMutation({
    mutationFn: (appId: string) => applications.withdraw(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/me"] });
      setWithdrawDialogOpen(false);
      setSelectedAppId(null);
      toast({
        title: "Application Withdrawn",
        description: "Your application has been withdrawn successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw application.",
        variant: "destructive",
      });
    },
  });

  // Use external applications if provided, otherwise use fetched data
  const applicationsList = externalApplications || fetchedApplications || [];

  // Filter applications by status
  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") return applicationsList;
    return applicationsList.filter((app: any) => app.status === statusFilter);
  }, [applicationsList, statusFilter]);

  const handleWithdrawClick = (appId: string) => {
    setSelectedAppId(appId);
    setWithdrawDialogOpen(true);
  };

  const handleConfirmWithdraw = () => {
    if (selectedAppId) {
      withdrawMutation.mutate(selectedAppId);
    }
  };

  const handleViewTimeline = (app: any) => {
    setSelectedApp(app);
    setTimelineDialogOpen(true);
  };

  // Check if application can be withdrawn (only if status is "applied")
  const canWithdraw = (status: string) => {
    return status === "applied";
  };

  // Get active filter count
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  if (isLoading && (standalone || !externalApplications)) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error && (standalone || !externalApplications)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load applications. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">My Applications</CardTitle>
              <CardDescription>
                {filteredApplications.length} {statusFilter !== "all" ? statusFilter : ""}{" "}
                application{filteredApplications.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="h-9 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">
                {statusFilter === "all"
                  ? "No Applications Yet"
                  : `No ${statusFilter} Applications`}
              </CardTitle>
              <CardDescription>
                {statusFilter === "all"
                  ? "Start applying to jobs to track your applications here"
                  : "Try changing the filter to see other applications"}
              </CardDescription>
            </div>
          ) : (
            filteredApplications.map((app: any) => (
              <div
                key={app.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-4 hover-elevate transition-all"
                data-testid={`card-application-${app.id}`}
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-medium truncate"
                      data-testid={`text-application-title-${app.id}`}
                    >
                      {app.jobTitle || "Job Title"}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{app.company || "Company"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>
                        {app.appliedAt
                          ? new Date(app.appliedAt).toLocaleDateString()
                          : "Recently"}
                      </span>
                    </div>
                    {app.updatedAt && app.updatedAt !== app.appliedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="text-xs">
                          Updated {new Date(app.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ApplicationStatusBadge status={app.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-app-menu-${app.id}`}
                        disabled={withdrawMutation.isPending}
                      >
                        {withdrawMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          onViewApplication ? onViewApplication(app.id) : handleViewTimeline(app)
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewTimeline(app)}>
                        <Clock className="h-4 w-4 mr-2" />
                        View Timeline
                      </DropdownMenuItem>
                      {canWithdraw(app.status) && (
                        <DropdownMenuItem
                          onClick={() =>
                            onWithdraw ? onWithdraw(app.id) : handleWithdrawClick(app.id)
                          }
                          className="text-destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Withdraw Application
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw this application? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWithdrawDialogOpen(false)}
              disabled={withdrawMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmWithdraw}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                "Withdraw Application"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Application Timeline</DialogTitle>
            <DialogDescription>
              {selectedApp?.jobTitle} at {selectedApp?.company}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Timeline visualization */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <div className="w-px h-full bg-border" />
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-medium">Applied</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedApp?.appliedAt
                      ? new Date(selectedApp.appliedAt).toLocaleString()
                      : "N/A"}
                  </p>
                  {selectedApp?.coverLetter && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Submitted with cover letter
                    </p>
                  )}
                </div>
              </div>

              {selectedApp?.status !== "applied" && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        selectedApp?.status === "rejected" ? "bg-destructive" : "bg-primary"
                      }`}
                    />
                    <div className="w-px h-full bg-border" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium capitalize">
                      {selectedApp?.status?.replace("_", " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedApp?.updatedAt
                        ? new Date(selectedApp.updatedAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-muted" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-muted-foreground">Current Status</p>
                  <ApplicationStatusBadge status={selectedApp?.status} />
                </div>
              </div>
            </div>

            {selectedApp?.coverLetter && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Cover Letter</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedApp.coverLetter}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimelineDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
