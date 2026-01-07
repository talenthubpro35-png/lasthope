import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatCard } from "@/components/StatCard";
import { CandidateCard } from "@/components/CandidateCard";
import { SearchBar } from "@/components/SearchBar";
import { ChatBot } from "@/components/ChatBot";
import { JobPostingForm } from "@/components/JobPostingForm";
import { JobManagement } from "@/components/JobManagement";
import { AIMatchScore } from "@/components/AIMatchScore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { jobs, ai } from "@/lib/api";
import { Bell, Briefcase, Users, FileCheck, Clock, Eye, MoreHorizontal, PlusCircle, AlertCircle, Inbox, Filter, Mail, Phone, MapPin, Calendar, Download, GraduationCap, Award, CheckCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RecruiterDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showJobForm, setShowJobForm] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [selectedJobForMatching, setSelectedJobForMatching] = useState<string>("");
  const [showHighMatchesOnly, setShowHighMatchesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"match" | "recent">("match");
  const [candidateMatchScores, setCandidateMatchScores] = useState<Record<string, any>>({});
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [showAllApplications, setShowAllApplications] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showEditJob, setShowEditJob] = useState(false);
  const [showJobApplicants, setShowJobApplicants] = useState(false);
  const [selectedCandidateForProfile, setSelectedCandidateForProfile] = useState<any>(null);
  const [showCandidateProfile, setShowCandidateProfile] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recruiter's jobs (backend auto-filters by recruiter ID from session)
  const { data: myJobs, isLoading: isLoadingJobs, error: jobsError } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    retry: false,
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: (jobData: any) => jobs.create(jobData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setShowJobForm(false);
      toast({
        title: "Success!",
        description: "Job posting created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job posting. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle job form submission with validation
  const handleJobFormSubmit = (formData: any) => {
    // Validation
    if (!formData.title?.trim()) {
      toast({
        title: "Validation Error",
        description: "Job title is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description?.trim()) {
      toast({
        title: "Validation Error",
        description: "Job description is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.location?.trim()) {
      toast({
        title: "Validation Error",
        description: "Location is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.type) {
      toast({
        title: "Validation Error",
        description: "Employment type is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.skills.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one required skill must be added.",
        variant: "destructive",
      });
      return;
    }

    // Map form data to API format
    const jobData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      jobType: formData.type,
      requiredSkills: formData.skills,
      mustHaveSkills: formData.mustHaveSkills || [],
      salary_min: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
      salary_max: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
    };

    // Validate salary range if provided
    if (jobData.salary_min && jobData.salary_max && jobData.salary_min > jobData.salary_max) {
      toast({
        title: "Validation Error",
        description: "Minimum salary cannot be greater than maximum salary.",
        variant: "destructive",
      });
      return;
    }

    createJobMutation.mutate(jobData);
  };

  // Fetch applications for all recruiter's jobs - always fetch fresh data
  const { data: allApplications, isLoading: isLoadingApplications } = useQuery<any[]>({
    queryKey: ["/api/jobs", "applications"],
    enabled: !!myJobs && myJobs.length > 0,
    retry: false,
    staleTime: 0, // Always consider data stale
    refetchOnMount: "always", // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    queryFn: async () => {
      if (!myJobs || myJobs.length === 0) return [];

      // Fetch applications for each job and combine
      const applicationPromises = myJobs.map(job =>
        jobs.getApplications(job.id).catch(() => [])
      );
      const applicationsArrays = await Promise.all(applicationPromises);
      return applicationsArrays.flat();
    },
  });

  // Fetch all candidates for matching - always fetch fresh data
  const { data: allCandidates, isLoading: isLoadingCandidates } = useQuery<any[]>({
    queryKey: ["/api/candidates"],
    retry: false,
    staleTime: 0, // Data is always considered stale, will refetch
    refetchOnMount: "always", // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    queryFn: async () => {
      const res = await fetch("/api/candidates", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch candidates");
      return res.json();
    },
  });

  // Fetch candidate details for review - always fetch fresh data
  const { data: selectedCandidateDetails, isLoading: isLoadingCandidateDetails } = useQuery({
    queryKey: ["/api/candidates", selectedApplication?.candidateId],
    enabled: !!selectedApplication?.candidateId,
    retry: false,
    staleTime: 0, // Always consider data stale
    refetchOnMount: "always", // Always refetch fresh candidate data
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${selectedApplication.candidateId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch candidate details");
      return response.json();
    },
  });

  // Update application status mutation
  const updateApplicationStatusMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: string }) => {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update application status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", "applications"] });
      setShowReviewDialog(false);
      setSelectedApplication(null);
      toast({
        title: "Success!",
        description: "Application status updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update application status.",
        variant: "destructive",
      });
    },
  });

  // Update candidate job search status mutation
  const updateCandidateStatusMutation = useMutation({
    mutationFn: async ({ candidateId, jobSearchStatus }: { candidateId: string; jobSearchStatus: string }) => {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobSearchStatus }),
      });
      if (!response.ok) throw new Error("Failed to update candidate status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", selectedApplication?.candidateId] });
      toast({
        title: "Success!",
        description: "Candidate availability status updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update candidate status.",
        variant: "destructive",
      });
    },
  });

  // Fetch recruiter's contact requests to check approval status
  const { data: myContactRequests } = useQuery<any[]>({
    queryKey: ["/api/contact-requests/recruiter"],
    queryFn: async () => {
      const res = await fetch("/api/contact-requests/recruiter", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Helper to check if recruiter has approved access to a candidate
  const hasApprovedAccess = (candidateId: string) => {
    if (!myContactRequests) return false;
    const request = myContactRequests.find((r: any) => r.candidateId === candidateId);
    return request?.status === "approved";
  };

  // Helper to get contact request status for a candidate
  const getContactRequestStatus = (candidateId: string) => {
    if (!myContactRequests) return null;
    const request = myContactRequests.find((r: any) => r.candidateId === candidateId);
    return request?.status || null;
  };

  // Send contact request mutation
  const sendContactRequestMutation = useMutation({
    mutationFn: async ({ candidateId, jobId }: { candidateId: string; jobId?: string }) => {
      const response = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ candidateId, jobId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to send contact request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-requests/recruiter"] });
      toast({
        title: "Contact Request Sent!",
        description: "The candidate will be notified. You can view their full profile once they approve.",
      });
    },
    onError: (error: any) => {
      toast({
        title: error.message === "Contact request already sent" ? "Already Requested" : "Error",
        description: error.message || "Failed to send contact request.",
        variant: error.message === "Contact request already sent" ? "default" : "destructive",
      });
    },
  });

  // Calculate match scores when job is selected
  useEffect(() => {
    if (!selectedJobForMatching || !allCandidates) return;

    const calculateScores = async () => {
      const scores: Record<string, any> = {};

      for (const candidate of allCandidates) {
        try {
          const res = await fetch("/api/match/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              candidateId: candidate.id,
              jobId: selectedJobForMatching,
            }),
          });

          if (res.ok) {
            const matchData = await res.json();
            scores[candidate.id] = matchData;
          }
        } catch (err) {
          console.error("Match score error:", err);
        }
      }

      setCandidateMatchScores(scores);
    };

    calculateScores();
  }, [selectedJobForMatching, allCandidates]);

  // Handler functions for View All and Review buttons
  const handleViewAllJobs = () => {
    setShowAllJobs(true);
  };

  const handleViewAllApplications = () => {
    setShowAllApplications(true);
  };

  const handleReviewApplication = (application: any) => {
    setSelectedApplication(application);
    setShowReviewDialog(true);
  };

  const handleUpdateApplicationStatus = (status: string) => {
    if (selectedApplication) {
      updateApplicationStatusMutation.mutate({
        applicationId: selectedApplication.id,
        status,
      });
    }
  };

  const handleUpdateCandidateStatus = (jobSearchStatus: string) => {
    if (selectedApplication && selectedCandidateDetails) {
      updateCandidateStatusMutation.mutate({
        candidateId: selectedCandidateDetails.id,
        jobSearchStatus,
      });
    }
  };

  // Handler functions for job actions
  const handleViewJobDetails = (job: any) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const handleEditJob = (job: any) => {
    setSelectedJob(job);
    setShowAllJobs(false);
    setShowEditJob(true);
  };

  const handleViewJobApplicants = (job: any) => {
    setSelectedJob(job);
    setShowJobApplicants(true);
  };

  const handleCloseJob = async (job: any) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...job, isActive: false }),
      });

      if (!response.ok) throw new Error("Failed to close job");

      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Success!",
        description: "Job has been closed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to close job.",
        variant: "destructive",
      });
    }
  };

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const jobsList = myJobs || [];
    const applicationsList = allApplications || [];

    const activeJobsCount = jobsList.filter((job: any) => job.isActive).length;
    const totalApplications = applicationsList.length;
    const shortlistedCount = applicationsList.filter(
      (app: any) => app.status === "shortlisted" || app.status === "interview"
    ).length;

    // Calculate average time to hire (simplified - based on created vs updated dates)
    const hiredApps = applicationsList.filter((app: any) => app.status === "offered");
    const avgDays = hiredApps.length > 0
      ? Math.round(
          hiredApps.reduce((sum: number, app: any) => {
            const applied = new Date(app.appliedAt);
            const updated = new Date(app.updatedAt);
            const days = Math.floor((updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / hiredApps.length
        )
      : 0;

    return [
      {
        title: "Active Jobs",
        value: activeJobsCount,
        icon: Briefcase,
      },
      {
        title: "Total Applications",
        value: totalApplications,
        icon: FileCheck,
        trend: shortlistedCount > 0 ? { value: shortlistedCount, isPositive: true } : undefined,
      },
      {
        title: "Shortlisted",
        value: shortlistedCount,
        icon: Users,
      },
      {
        title: "Avg. Time to Hire",
        value: avgDays > 0 ? `${avgDays} days` : "N/A",
        icon: Clock,
      },
    ];
  }, [myJobs, allApplications]);

  // Helper function to get time ago
  const getTimeAgo = useCallback((date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  // Generate notifications from recent applications
  const notifications = useMemo(() => {
    if (!allApplications || !myJobs) return [];

    const recentApps = [...(allApplications || [])]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10); // Get last 10 applications

    return recentApps.map((app: any) => {
      const job = myJobs.find((j: any) => j.id === app.jobId);
      const timeAgo = getTimeAgo(new Date(app.createdAt));

      return {
        id: app.id,
        type: app.status === "pending" ? "new_application" : "status_change",
        title: app.status === "pending"
          ? "New Application Received"
          : `Application ${app.status}`,
        message: `Candidate applied for ${job?.title || "a job"}`,
        time: timeAgo,
        jobTitle: job?.title || "Unknown Job",
        status: app.status,
        application: app,
        isNew: app.status === "pending",
      };
    });
  }, [allApplications, myJobs, getTimeAgo]);

  // Count unread notifications (new applications)
  const unreadCount = useMemo(() => {
    return notifications.filter((n: any) => n.isNew).length;
  }, [notifications]);

  // Format jobs with application counts
  const formattedJobs = useMemo(() => {
    if (!myJobs) return [];

    return myJobs.map((job: any) => {
      const jobApplications = (allApplications || []).filter(
        (app: any) => app.jobId === job.id
      );

      return {
        id: job.id,
        title: job.title,
        applications: jobApplications.length,
        status: job.isActive ? "active" : "paused",
        posted: new Date(job.createdAt).toLocaleDateString(),
      };
    });
  }, [myJobs, allApplications]);

  // Get recent applications with candidate info
  const recentApplications = useMemo(() => {
    if (!allApplications || !myJobs) return [];

    return allApplications
      .sort((a: any, b: any) =>
        new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      )
      .slice(0, 5)
      .map((app: any) => {
        const job = myJobs.find((j: any) => j.id === app.jobId);
        return {
          ...app,
          jobTitle: job?.title || "Unknown Job",
        };
      });
  }, [allApplications, myJobs]);

  // Filter and sort candidates based on match scores
  const filteredAndSortedCandidates = useMemo(() => {
    if (!allCandidates || !selectedJobForMatching) return [];

    let candidates = [...allCandidates];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      candidates = candidates.filter((c: any) => {
        const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
        const skills = (c.skills || []).join(" ").toLowerCase();
        return fullName.includes(query) || skills.includes(query);
      });
    }

    // Add match scores to candidates
    candidates = candidates.map((c: any) => ({
      ...c,
      matchScore: candidateMatchScores[c.id]?.score || 0,
      matchData: candidateMatchScores[c.id] || null,
    }));

    // Filter high matches only
    if (showHighMatchesOnly) {
      candidates = candidates.filter((c: any) => c.matchScore >= 80);
    }

    // Sort by match score or recent
    if (sortBy === "match") {
      candidates.sort((a: any, b: any) => b.matchScore - a.matchScore);
    } else {
      candidates.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return candidates;
  }, [allCandidates, selectedJobForMatching, candidateMatchScores, searchQuery, showHighMatchesOnly, sortBy]);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const isLoading = isLoadingJobs || isLoadingApplications;
  const hasError = jobsError;

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          userRole="recruiter"
          userName={user?.username || "Recruiter"}
          onLogout={logout}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b p-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden md:block flex-1 max-w-md">
                <SearchBar
                  placeholder="Search candidates, skills..."
                  onSearch={setSearchQuery}
                  showFilters={false}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-notifications" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="end">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {unreadCount} new
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notification: any) => (
                          <button
                            key={notification.id}
                            onClick={() => {
                              handleReviewApplication(notification.application);
                            }}
                            className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`h-2 w-2 rounded-full mt-2 ${notification.isNew ? 'bg-destructive' : 'bg-transparent'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium text-sm">{notification.title}</p>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {notification.time}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {notification.jobTitle}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {notification.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        className="w-full text-sm"
                        onClick={() => setShowAllApplications(true)}
                      >
                        View All Applications
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Recruiter Dashboard</h1>
                  <p className="text-muted-foreground">Manage your job postings and candidates.</p>
                </div>
                <Button
                  className="gap-2"
                  data-testid="button-post-new-job"
                  onClick={() => setShowJobForm(true)}
                >
                  <PlusCircle className="h-4 w-4" />
                  Post New Job
                </Button>
              </div>

              {/* Error State */}
              {hasError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Unable to load job data. Please try refreshing the page.
                  </AlertDescription>
                </Alert>
              )}

              {/* Stats Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoadingJobs ? (
                  <>
                    {[...Array(4)].map((_, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-8 w-16" />
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  stats.map((stat) => <StatCard key={stat.title} {...stat} />)
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Jobs Section */}
                <Card className="lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-lg">Active Jobs</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleViewAllJobs}
                      data-testid="button-view-all-postings"
                    >
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingJobs ? (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </>
                    ) : formattedJobs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="font-medium">No Jobs Posted</p>
                        <p className="text-sm text-muted-foreground">
                          Click "Post New Job" to get started
                        </p>
                      </div>
                    ) : (
                      formattedJobs.map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between gap-4 rounded-lg border p-4 hover-elevate"
                          data-testid={`card-job-posting-${job.id}`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-medium truncate">{job.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{job.applications} applicants</span>
                              <Badge
                                variant={job.status === "active" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {job.status}
                              </Badge>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewJobDetails(job)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditJob(job)}>
                                Edit Job
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewJobApplicants(job)}>
                                View Applicants
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleCloseJob(job)}
                              >
                                Close Job
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                  {/* Recent Applications Section */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                      <CardTitle className="text-lg">Recent Applications</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleViewAllApplications}
                      >
                        View All
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {isLoadingApplications ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                              </div>
                              <Skeleton className="h-8 w-20" />
                            </div>
                          ))}
                        </div>
                      ) : recentApplications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
                          <CardTitle className="text-lg mb-2">No Applications Yet</CardTitle>
                          <CardDescription>
                            Applications will appear here once candidates start applying
                          </CardDescription>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {recentApplications.map((app: any) => (
                            <div
                              key={app.id}
                              className="flex items-center justify-between gap-4 p-4 border rounded-lg hover-elevate"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                                  C
                                </div>
                                <div>
                                  <p className="font-medium">Candidate</p>
                                  <p className="text-sm text-muted-foreground">
                                    Applied for {app.jobTitle}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    app.status === "shortlisted" || app.status === "interview"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                                      : app.status === "viewed"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                                  }
                                >
                                  {app.status}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewApplication(app)}
                                >
                                  Review
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Job Management Section */}
              <JobManagement
                jobs={myJobs || []}
                applications={allApplications || []}
                isLoading={isLoadingJobs}
                onViewApplications={(jobId) => {
                  const job = myJobs?.find((j: any) => j.id === jobId);
                  const jobApplications = (allApplications || []).filter(
                    (app: any) => app.jobId === jobId
                  );
                  toast({
                    title: job?.title || "Job Applications",
                    description: `${jobApplications.length} total applications`,
                  });
                }}
              />

              {/* My Contact Requests Section */}
              {myContactRequests && myContactRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          My Contact Requests
                        </CardTitle>
                        <CardDescription>
                          Candidates you've requested to contact
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {myContactRequests.filter((r: any) => r.status === "pending").length} Pending
                        </Badge>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                          {myContactRequests.filter((r: any) => r.status === "approved").length} Approved
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {myContactRequests.map((request: any) => {
                        const candidate = allCandidates?.find((c: any) => c.id === request.candidateId);
                        if (!candidate) return null;
                        return (
                          <div
                            key={request.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                {(candidate.firstName?.[0] || "C").toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {candidate.firstName} {candidate.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {candidate.headline || "No headline"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Requested: {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge
                                className={
                                  request.status === "approved"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                                    : request.status === "rejected"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200"
                                }
                              >
                                {request.status === "approved" ? "Approved" : request.status === "rejected" ? "Declined" : "Pending"}
                              </Badge>
                              {request.status === "approved" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCandidateForProfile(candidate);
                                    setShowCandidateProfile(true);
                                  }}
                                >
                                  View Profile
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Candidate Search with AI Match Scoring */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>AI-Powered Candidate Matching</CardTitle>
                      <CardDescription>
                        Find the best candidates for your jobs using AI match scoring
                      </CardDescription>
                    </div>
                    <Filter className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Job Selection and Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="job-select">Select Job</Label>
                      <Select
                        value={selectedJobForMatching}
                        onValueChange={setSelectedJobForMatching}
                      >
                        <SelectTrigger id="job-select">
                          <SelectValue placeholder="Choose a job to match candidates" />
                        </SelectTrigger>
                        <SelectContent>
                          {(myJobs || []).filter((j: any) => j.isActive).map((job: any) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Label htmlFor="sort-by">Sort By</Label>
                      <Select
                        value={sortBy}
                        onValueChange={(v) => setSortBy(v as "match" | "recent")}
                      >
                        <SelectTrigger id="sort-by">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="match">Match Score (High to Low)</SelectItem>
                          <SelectItem value="recent">Most Recent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="high-matches"
                          checked={showHighMatchesOnly}
                          onCheckedChange={setShowHighMatchesOnly}
                        />
                        <Label htmlFor="high-matches" className="text-sm">
                          Show only 80%+ matches
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Candidates List */}
                  {!selectedJobForMatching ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Select a job to view matched candidates
                      </p>
                    </div>
                  ) : isLoadingCandidates ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-4 p-4 border rounded-lg">
                          <Skeleton className="h-16 w-16 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                          <Skeleton className="h-20 w-48" />
                        </div>
                      ))}
                    </div>
                  ) : filteredAndSortedCandidates.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {showHighMatchesOnly
                          ? "No candidates with 80%+ match found"
                          : "No candidates found"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredAndSortedCandidates.map((candidate: any) => (
                        <div
                          key={candidate.id}
                          className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 border rounded-lg hover-elevate"
                        >
                          {/* Candidate Info */}
                          <div className="lg:col-span-2">
                            <div className="flex items-start gap-4">
                              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl">
                                {(candidate.firstName?.[0] || "C").toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">
                                  {candidate.firstName} {candidate.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {candidate.headline || "No headline"}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {(candidate.skills || []).slice(0, 5).map((skill: string) => (
                                    <Badge key={skill} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                  {(candidate.skills || []).length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{(candidate.skills || []).length - 5} more
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-4 mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedCandidateForProfile(candidate);
                                      setShowCandidateProfile(true);
                                    }}
                                  >
                                    View Profile
                                  </Button>
                                  {(() => {
                                    const status = getContactRequestStatus(candidate.id);
                                    if (status === "approved") {
                                      return (
                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                                          Access Approved
                                        </Badge>
                                      );
                                    }
                                    if (status === "rejected") {
                                      return (
                                        <Badge variant="destructive">
                                          Request Declined
                                        </Badge>
                                      );
                                    }
                                    return (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          sendContactRequestMutation.mutate({
                                            candidateId: candidate.id,
                                            jobId: selectedJobForMatching || undefined,
                                          });
                                        }}
                                        disabled={sendContactRequestMutation.isPending || status === "pending"}
                                      >
                                        {status === "pending" ? "Request Pending" : sendContactRequestMutation.isPending ? "Sending..." : "Contact Request"}
                                      </Button>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Match Score */}
                          <div className="lg:col-span-1">
                            {candidate.matchData ? (
                              <AIMatchScore
                                score={candidate.matchData.score}
                                matchedSkills={candidate.matchData.matchedSkills}
                                jobTitle={
                                  myJobs?.find((j: any) => j.id === selectedJobForMatching)
                                    ?.title || "Job"
                                }
                                breakdown={candidate.matchData.breakdown}
                              />
                            ) : (
                              <Card>
                                <CardContent className="pt-6">
                                  <Skeleton className="h-20 w-full" />
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
      <ChatBot />

      {/* Job Posting Form Dialog */}
      <Dialog open={showJobForm} onOpenChange={setShowJobForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a New Job</DialogTitle>
            <DialogDescription>
              Fill out the details below to create a new job posting.
            </DialogDescription>
          </DialogHeader>
          <JobPostingForm
            onSubmit={handleJobFormSubmit}
            onGenerateDescription={() => {
              toast({
                title: "AI Generation",
                description: "AI description generation coming soon!",
              });
            }}
            isGenerating={isGeneratingDescription}
          />
        </DialogContent>
      </Dialog>

      {/* View All Jobs Dialog */}
      <Dialog open={showAllJobs} onOpenChange={setShowAllJobs}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Active Jobs</DialogTitle>
            <DialogDescription>
              View and manage all your job postings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {isLoadingJobs ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </>
            ) : formattedJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="font-medium">No Jobs Posted</p>
                <p className="text-sm text-muted-foreground">
                  Click "Post New Job" to get started
                </p>
              </div>
            ) : (
              formattedJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4 hover-elevate"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="font-medium">{job.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{job.applications} applicants</span>
                      <Badge
                        variant={job.status === "active" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewJobDetails(job)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditJob(job)}>
                        Edit Job
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewJobApplicants(job)}>
                        View Applicants
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleCloseJob(job)}
                      >
                        Close Job
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View All Applications Dialog */}
      <Dialog open={showAllApplications} onOpenChange={setShowAllApplications}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Recent Applications</DialogTitle>
            <DialogDescription>
              Review and manage all applications to your job postings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {isLoadingApplications ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </>
            ) : recentApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="font-medium mb-2">No Applications Yet</p>
                <p className="text-sm text-muted-foreground">
                  Applications will appear here once candidates start applying
                </p>
              </div>
            ) : (
              recentApplications.map((app: any) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg hover-elevate"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                      C
                    </div>
                    <div>
                      <p className="font-medium">Candidate</p>
                      <p className="text-sm text-muted-foreground">
                        Applied for {app.jobTitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        app.status === "shortlisted" || app.status === "interview"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                          : app.status === "viewed"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                      }
                    >
                      {app.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReviewApplication(app)}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Application Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Complete candidate profile and application details
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6 mt-4">
              {isLoadingCandidateDetails ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : selectedCandidateDetails ? (
                <>
                  {/* Candidate Header */}
                  <div className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-2xl">
                        {selectedCandidateDetails.firstName?.[0] || 'C'}
                        {selectedCandidateDetails.lastName?.[0] || ''}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">
                          {selectedCandidateDetails.firstName} {selectedCandidateDetails.lastName}
                        </h3>
                        <p className="text-muted-foreground">
                          {selectedCandidateDetails.headline || "No headline"}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {selectedCandidateDetails.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{selectedCandidateDetails.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Applied {new Date(selectedApplication.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <Badge className="text-sm">
                          {selectedApplication.status}
                        </Badge>
                      </div>
                      {selectedCandidateDetails.jobSearchStatus && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Availability</p>
                          <Badge
                            className={
                              selectedCandidateDetails.jobSearchStatus === "available"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : selectedCandidateDetails.jobSearchStatus === "selected"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }
                          >
                            {selectedCandidateDetails.jobSearchStatus === "available"
                              ? "Available"
                              : selectedCandidateDetails.jobSearchStatus === "selected"
                              ? "Selected"
                              : "Not Available"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabs for Different Sections */}
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="experience">Experience</TabsTrigger>
                      <TabsTrigger value="education">Education</TabsTrigger>
                      <TabsTrigger value="resume">Resume</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4 mt-4">
                      {/* Bio */}
                      {selectedCandidateDetails.bio && (
                        <div>
                          <Label className="text-sm font-semibold">Professional Summary</Label>
                          <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted/30 rounded-md">
                            {selectedCandidateDetails.bio}
                          </p>
                        </div>
                      )}

                      {/* Skills */}
                      {selectedCandidateDetails.skills && selectedCandidateDetails.skills.length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Skills
                          </Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedCandidateDetails.skills.map((skill: string) => (
                              <Badge key={skill} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Availability */}
                      {selectedCandidateDetails.availability && (
                        <div>
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Availability
                          </Label>
                          <div className="mt-2 p-3 bg-muted/30 rounded-md">
                            {(() => {
                              try {
                                const avail = JSON.parse(selectedCandidateDetails.availability);
                                return (
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Start Date</p>
                                      <p className="font-medium capitalize">{avail.startDate}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Weekly Hours</p>
                                      <p className="font-medium">{avail.weeklyHours} hours</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Work Type</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {avail.preferences?.fullTime && <Badge variant="outline" className="text-xs">Full-time</Badge>}
                                        {avail.preferences?.partTime && <Badge variant="outline" className="text-xs">Part-time</Badge>}
                                        {avail.preferences?.contract && <Badge variant="outline" className="text-xs">Contract</Badge>}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Location Type</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {avail.preferences?.remote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                                        {avail.preferences?.hybrid && <Badge variant="outline" className="text-xs">Hybrid</Badge>}
                                        {avail.preferences?.onsite && <Badge variant="outline" className="text-xs">On-site</Badge>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } catch {
                                return <p className="text-sm">{selectedCandidateDetails.availability}</p>;
                              }
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Expected Salary */}
                      {selectedCandidateDetails.expectedSalary && (
                        <div>
                          <Label className="text-sm font-semibold">Expected Salary</Label>
                          <p className="text-sm font-medium mt-1">
                            {selectedCandidateDetails.expectedSalary}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Experience Tab */}
                    <TabsContent value="experience" className="space-y-4 mt-4">
                      {(() => {
                        try {
                          const experiences = selectedCandidateDetails.experienceDetails
                            ? JSON.parse(selectedCandidateDetails.experienceDetails)
                            : [];

                          if (experiences.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground">
                                <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>No work experience added</p>
                              </div>
                            );
                          }

                          return experiences.map((exp: any, index: number) => (
                            <Card key={index}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <h4 className="font-semibold">{exp.title}</h4>
                                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                                    <p className="text-xs text-muted-foreground">{exp.duration}</p>
                                  </div>
                                </div>
                                {exp.description && (
                                  <p className="text-sm text-muted-foreground mt-3">
                                    {exp.description}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ));
                        } catch {
                          return <p className="text-sm text-muted-foreground">Unable to load experience details</p>;
                        }
                      })()}
                    </TabsContent>

                    {/* Education Tab */}
                    <TabsContent value="education" className="space-y-4 mt-4">
                      {(() => {
                        try {
                          const education = selectedCandidateDetails.educationDetails
                            ? JSON.parse(selectedCandidateDetails.educationDetails)
                            : [];

                          if (education.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground">
                                <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>No education details added</p>
                              </div>
                            );
                          }

                          return education.map((edu: any, index: number) => (
                            <Card key={index}>
                              <CardContent className="pt-4">
                                <div className="space-y-1">
                                  <h4 className="font-semibold">{edu.degree}</h4>
                                  {edu.field && <p className="text-sm text-muted-foreground">{edu.field}</p>}
                                  <p className="text-sm">{edu.institution}</p>
                                  {edu.year && <p className="text-xs text-muted-foreground">{edu.year}</p>}
                                </div>
                              </CardContent>
                            </Card>
                          ));
                        } catch {
                          return <p className="text-sm text-muted-foreground">Unable to load education details</p>;
                        }
                      })()}
                    </TabsContent>

                    {/* Resume Tab */}
                    <TabsContent value="resume" className="space-y-4 mt-4">
                      {selectedCandidateDetails.resume_url ? (
                        <div className="text-center py-8">
                          <FileCheck className="h-16 w-16 mx-auto mb-4 text-primary" />
                          <h4 className="font-semibold mb-2">Resume Available</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Download the candidate's resume to view their full credentials
                          </p>
                          <Button asChild>
                            <a href={selectedCandidateDetails.resume_url} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              Download Resume
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileCheck className="h-16 w-16 mx-auto mb-4 opacity-20" />
                          <p>No resume uploaded</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <Separator />

                  {/* Candidate Availability Status Update Section */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Update Candidate Availability</Label>
                    <p className="text-sm text-muted-foreground">
                      Mark candidate as selected if they've accepted an offer
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant={selectedCandidateDetails?.jobSearchStatus === "available" ? "default" : "outline"}
                        onClick={() => handleUpdateCandidateStatus("available")}
                        disabled={updateCandidateStatusMutation.isPending}
                        className="w-full"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Available
                      </Button>
                      <Button
                        variant={selectedCandidateDetails?.jobSearchStatus === "selected" ? "default" : "outline"}
                        onClick={() => handleUpdateCandidateStatus("selected")}
                        disabled={updateCandidateStatusMutation.isPending}
                        className="w-full"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Selected
                      </Button>
                      <Button
                        variant={selectedCandidateDetails?.jobSearchStatus === "not_available" ? "outline" : "outline"}
                        onClick={() => handleUpdateCandidateStatus("not_available")}
                        disabled={updateCandidateStatusMutation.isPending}
                        className="w-full"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Not Available
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Status Update Section */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Update Application Status</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={selectedApplication.status === "pending" ? "default" : "outline"}
                        onClick={() => handleUpdateApplicationStatus("pending")}
                        disabled={updateApplicationStatusMutation.isPending}
                        className="w-full"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Pending
                      </Button>
                      <Button
                        variant={selectedApplication.status === "reviewed" ? "default" : "outline"}
                        onClick={() => handleUpdateApplicationStatus("reviewed")}
                        disabled={updateApplicationStatusMutation.isPending}
                        className="w-full"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Reviewed
                      </Button>
                      <Button
                        variant={selectedApplication.status === "shortlisted" ? "default" : "outline"}
                        onClick={() => handleUpdateApplicationStatus("shortlisted")}
                        disabled={updateApplicationStatusMutation.isPending}
                        className="w-full"
                      >
                        <FileCheck className="mr-2 h-4 w-4" />
                        Shortlisted
                      </Button>
                      <Button
                        variant={selectedApplication.status === "rejected" ? "destructive" : "outline"}
                        onClick={() => handleUpdateApplicationStatus("rejected")}
                        disabled={updateApplicationStatusMutation.isPending}
                        className="w-full"
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Rejected
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowReviewDialog(false)}
                      className="flex-1"
                      disabled={updateApplicationStatusMutation.isPending}
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Unable to load candidate details</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Job Details Dialog */}
      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>Complete information about this job posting</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-6 mt-4">
              {/* Job Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedJob.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={selectedJob.isActive ? "default" : "secondary"}>
                        {selectedJob.isActive ? "Active" : "Closed"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {selectedJob.jobType || "Full-time"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedJob.location}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Applications</p>
                    <p className="font-medium flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {formattedJobs.find((j: any) => j.id === selectedJob.id)?.applications || 0} applicants
                    </p>
                  </div>
                  {selectedJob.salary_min && selectedJob.salary_max && (
                    <div>
                      <p className="text-sm text-muted-foreground">Salary Range</p>
                      <p className="font-medium">
                        ${selectedJob.salary_min.toLocaleString()} - ${selectedJob.salary_max.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Posted On</p>
                    <p className="font-medium">
                      {new Date(selectedJob.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Job Description */}
              <div>
                <Label className="text-base font-semibold">Description</Label>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                  {selectedJob.description}
                </p>
              </div>

              {/* Requirements */}
              {selectedJob.requirements && (
                <div>
                  <Label className="text-base font-semibold">Requirements</Label>
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                    {selectedJob.requirements}
                  </p>
                </div>
              )}

              {/* Required Skills */}
              {selectedJob.requiredSkills && selectedJob.requiredSkills.length > 0 && (
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Required Skills
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedJob.requiredSkills.map((skill: string) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setShowJobDetails(false);
                    handleEditJob(selectedJob);
                  }}
                  className="flex-1"
                >
                  Edit Job
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowJobDetails(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={showEditJob} onOpenChange={setShowEditJob}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Posting</DialogTitle>
            <DialogDescription>
              Update the details of your job posting
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <JobPostingForm
              initialData={{
                ...selectedJob,
                skills: selectedJob.requiredSkills || [],
                mustHaveSkills: selectedJob.mustHaveSkills || [],
                type: selectedJob.jobType || "",
                salaryMin: selectedJob.salary_min?.toString() || "",
                salaryMax: selectedJob.salary_max?.toString() || "",
              }}
              onSubmit={(formData) => {
                // Update job
                const jobData = {
                  ...selectedJob,
                  title: formData.title,
                  description: formData.description,
                  requirements: formData.requirements,
                  location: formData.location,
                  jobType: formData.type,
                  requiredSkills: formData.skills,
                  mustHaveSkills: formData.mustHaveSkills || [],
                  salary_min: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
                  salary_max: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
                };

                fetch(`/api/jobs/${selectedJob.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify(jobData),
                })
                  .then((res) => {
                    if (!res.ok) throw new Error("Failed to update job");
                    return res.json();
                  })
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
                    setShowEditJob(false);
                    setSelectedJob(null);
                    toast({
                      title: "Success!",
                      description: "Job posting updated successfully.",
                    });
                  })
                  .catch((error) => {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to update job posting.",
                      variant: "destructive",
                    });
                  });
              }}
              onGenerateDescription={() => {
                toast({
                  title: "AI Generation",
                  description: "AI description generation coming soon!",
                });
              }}
              isGenerating={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Job Applicants Dialog */}
      <Dialog open={showJobApplicants} onOpenChange={setShowJobApplicants}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Applicants</DialogTitle>
            <DialogDescription>
              {selectedJob && `All applicants for ${selectedJob.title}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {(() => {
              if (!selectedJob) return null;

              const jobApplications = (allApplications || []).filter(
                (app: any) => app.jobId === selectedJob.id
              );

              if (jobApplications.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="font-medium mb-2">No Applications Yet</p>
                    <p className="text-sm">
                      Applications for this job will appear here
                    </p>
                  </div>
                );
              }

              return jobApplications.map((app: any) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg hover-elevate"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                      C
                    </div>
                    <div>
                      <p className="font-medium">Candidate</p>
                      <p className="text-sm text-muted-foreground">
                        Applied on {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        app.status === "shortlisted" || app.status === "interview"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                          : app.status === "viewed"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                      }
                    >
                      {app.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowJobApplicants(false);
                        handleReviewApplication(app);
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Candidate Profile Dialog */}
      <Dialog open={showCandidateProfile} onOpenChange={setShowCandidateProfile}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Candidate Profile</DialogTitle>
            <DialogDescription>
              Complete candidate information
            </DialogDescription>
          </DialogHeader>
          {selectedCandidateForProfile && (
            <div className="space-y-6 mt-4">
              {/* Candidate Header */}
              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-3xl">
                  {hasApprovedAccess(selectedCandidateForProfile.id)
                    ? (selectedCandidateForProfile.firstName?.[0] || "C").toUpperCase()
                    : "?"
                  }
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold">
                    {hasApprovedAccess(selectedCandidateForProfile.id)
                      ? `${selectedCandidateForProfile.firstName} ${selectedCandidateForProfile.lastName}`
                      : "Hidden (Request Contact to View)"
                    }
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    {selectedCandidateForProfile.headline || "No headline"}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {selectedCandidateForProfile.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{selectedCandidateForProfile.location}</span>
                      </div>
                    )}
                    {selectedCandidateForProfile.experience && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{selectedCandidateForProfile.experience} years experience</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information - Only shown when access is approved */}
              {hasApprovedAccess(selectedCandidateForProfile.id) ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-800 dark:text-green-200">
                    <CheckCircle className="h-4 w-4" />
                    Contact Information (Access Approved)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCandidateForProfile.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${selectedCandidateForProfile.email}`} className="text-primary hover:underline">
                          {selectedCandidateForProfile.email}
                        </a>
                      </div>
                    )}
                    {selectedCandidateForProfile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedCandidateForProfile.phone}`} className="text-primary hover:underline">
                          {selectedCandidateForProfile.phone}
                        </a>
                      </div>
                    )}
                    {!selectedCandidateForProfile.email && !selectedCandidateForProfile.phone && (
                      <p className="text-muted-foreground">No contact information provided by candidate</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="h-4 w-4" />
                    Contact Information Hidden
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Send a contact request to view candidate's name, email, and phone number.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      sendContactRequestMutation.mutate({
                        candidateId: selectedCandidateForProfile.id,
                        jobId: selectedJobForMatching || undefined,
                      });
                    }}
                    disabled={sendContactRequestMutation.isPending || getContactRequestStatus(selectedCandidateForProfile.id) === "pending"}
                  >
                    {getContactRequestStatus(selectedCandidateForProfile.id) === "pending"
                      ? "Request Pending"
                      : sendContactRequestMutation.isPending
                      ? "Sending..."
                      : "Send Contact Request"
                    }
                  </Button>
                </div>
              )}

              {/* Bio */}
              {selectedCandidateForProfile.bio && (
                <div>
                  <h4 className="font-semibold mb-2">About</h4>
                  <p className="text-muted-foreground p-3 bg-muted/30 rounded-md">
                    {selectedCandidateForProfile.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              {selectedCandidateForProfile.skills && selectedCandidateForProfile.skills.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidateForProfile.skills.map((skill: string) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {selectedCandidateForProfile.experienceDetails && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Work Experience
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      try {
                        const experiences = JSON.parse(selectedCandidateForProfile.experienceDetails);
                        return experiences.map((exp: any, index: number) => (
                          <div key={index} className="p-3 bg-muted/30 rounded-md">
                            <p className="font-medium">{exp.title}</p>
                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                            <p className="text-xs text-muted-foreground">{exp.duration}</p>
                            {exp.description && (
                              <p className="text-sm mt-2">{exp.description}</p>
                            )}
                          </div>
                        ));
                      } catch {
                        return <p className="text-muted-foreground">No experience details</p>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Education */}
              {selectedCandidateForProfile.educationDetails && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      try {
                        const education = JSON.parse(selectedCandidateForProfile.educationDetails);
                        return education.map((edu: any, index: number) => (
                          <div key={index} className="p-3 bg-muted/30 rounded-md">
                            <p className="font-medium">{edu.degree}</p>
                            {edu.field && <p className="text-sm">{edu.field}</p>}
                            <p className="text-sm text-muted-foreground">{edu.institution}</p>
                            {edu.year && <p className="text-xs text-muted-foreground">{edu.year}</p>}
                          </div>
                        ));
                      } catch {
                        return <p className="text-muted-foreground">No education details</p>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Resume Download */}
              {selectedCandidateForProfile.resume_url && (
                <div>
                  <h4 className="font-semibold mb-2">Resume</h4>
                  <Button asChild variant="outline">
                    <a href={selectedCandidateForProfile.resume_url} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download Resume
                    </a>
                  </Button>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setShowCandidateProfile(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
