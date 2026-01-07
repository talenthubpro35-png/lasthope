import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatCard } from "@/components/StatCard";
import { JobCard } from "@/components/JobCard";
import { ApplicationTracker } from "@/components/ApplicationTracker";
import { ApplicationStatusBadge } from "@/components/ApplicationStatusBadge";
import { SkillRecommendations } from "@/components/SkillRecommendations";
import { ChatBot } from "@/components/ChatBot";
import { JobSearchStatusSection } from "@/components/JobSearchStatusSection";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { candidates, applications, jobs, ai } from "@/lib/api";
import { Bell, Briefcase, Eye, Target, TrendingUp, AlertCircle, Inbox, User, Calendar, Clock, CheckCircle, Building2, Sparkles, Zap, ExternalLink, Linkedin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SkillBadge } from "@/components/SkillBadge";

export function CandidateDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCoverLetterDialog, setShowCoverLetterDialog] = useState(false);
  const [showJobDetailsDialog, setShowJobDetailsDialog] = useState(false);
  const [showApplicationDetailsDialog, setShowApplicationDetailsDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [selectedJobForApply, setSelectedJobForApply] = useState<any>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any>(null);
  const [selectedApplicationForDetails, setSelectedApplicationForDetails] = useState<any>(null);
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch candidate profile
  const { data: candidateProfile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ["/api/candidates/me"],
    retry: false,
  });

  // Fetch applications
  const { data: myApplications, isLoading: isLoadingApplications, error: applicationsError } = useQuery<any[]>({
    queryKey: ["/api/applications/me"],
    retry: false,
  });

  // Fetch available jobs
  const { data: availableJobs, isLoading: isLoadingJobs, error: jobsError } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    retry: false,
  });

  // Fetch contact requests from recruiters
  const { data: contactRequests, isLoading: isLoadingContactRequests } = useQuery<any[]>({
    queryKey: ["/api/contact-requests/candidate"],
    retry: false,
  });

  // Respond to contact request mutation
  const respondToContactMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const response = await fetch(`/api/contact-requests/${requestId}/respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to respond to contact request");
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-requests/candidate"] });
      toast({
        title: status === "approved" ? "Access Granted!" : "Request Declined",
        description: status === "approved"
          ? "The recruiter can now view your full profile."
          : "The recruiter will not be able to view your profile.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to respond to contact request.",
        variant: "destructive",
      });
    },
  });

  // Fetch skill recommendations if candidate has skills
  const { data: recommendations } = useQuery({
    queryKey: ["/api/recommendations/skills"],
    enabled: !!candidateProfile?.skills?.length,
    retry: false,
    queryFn: async () => {
      const response = await ai.getSkillRecommendations(
        candidateProfile?.skills || [],
        "career growth"
      );
      return response;
    },
  });

  // Calculate statistics from real data
  const stats = useMemo(() => {
    const applicationsList = myApplications || [];
    const totalApplications = applicationsList.length;
    const shortlistedCount = applicationsList.filter(
      (app: any) => app.status === "shortlisted" || app.status === "interview"
    ).length;
    const rejectedCount = applicationsList.filter(
      (app: any) => app.status === "rejected"
    ).length;

    // Calculate average match score
    const avgMatchScore = applicationsList.length > 0
      ? Math.round(
          applicationsList.reduce((sum: number, app: any) => sum + (app.matchScore || 0), 0) /
            applicationsList.length
        )
      : 0;

    return [
      {
        title: "Applications",
        value: totalApplications,
        icon: Briefcase,
        trend: totalApplications > 0 ? { value: shortlistedCount, isPositive: true } : undefined,
      },
      {
        title: "Shortlisted",
        value: shortlistedCount,
        icon: Target,
      },
      {
        title: "Match Score",
        value: avgMatchScore > 0 ? `${avgMatchScore}%` : "N/A",
        icon: TrendingUp,
      },
      {
        title: "Rejected",
        value: rejectedCount,
        icon: Eye,
      },
    ];
  }, [myApplications]);

  // Fetch user's saved jobs
  const { data: savedJobsData } = useQuery<any>({
    queryKey: ["/api/saved-jobs/me"],
    retry: false,
  });

  // Submit application mutation
  const applyMutation = useMutation({
    mutationFn: (data: { jobId: string; candidateId: string; coverLetter?: string }) =>
      applications.create(data.jobId, data.candidateId, data.coverLetter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications/me"] });
      setShowCoverLetterDialog(false);
      setCoverLetter("");
      setSelectedJobForApply(null);
      toast({
        title: "Success!",
        description: "Your application has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save job mutation
  const saveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch("/api/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save job");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/me"] });
      toast({
        title: "Success!",
        description: "Job saved for later.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save job.",
        variant: "destructive",
      });
    },
  });

  // Unsave job mutation
  const unsaveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/saved-jobs/${jobId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to unsave job");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/me"] });
      toast({
        title: "Success!",
        description: "Job removed from saved jobs.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unsave job.",
        variant: "destructive",
      });
    },
  });

  // Update job search status mutation
  const updateJobSearchStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch("/api/candidates/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobSearchStatus: status }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/me"] });
      toast({
        title: "Status Updated!",
        description: "Your job search status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status.",
        variant: "destructive",
      });
    },
  });

  // Check if profile is complete
  const isProfileComplete = !!(
    candidateProfile &&
    candidateProfile.firstName &&
    candidateProfile.skills &&
    candidateProfile.skills.length > 0
  );

  // Check if user has already applied to a job
  const hasApplied = (jobId: string) => {
    if (!myApplications) return false;
    return myApplications.some((app: any) => app.jobId === jobId);
  };

  // Check if job is saved
  const isSaved = (jobId: string) => {
    if (!savedJobsData?.savedJobs) return false;
    return savedJobsData.savedJobs.some((saved: any) => saved.jobId === jobId);
  };

  // Quick Apply handler
  const handleQuickApply = (jobId: string) => {
    if (!isProfileComplete) {
      toast({
        title: "Incomplete Profile",
        description: "Please complete your profile before applying to jobs.",
        variant: "destructive",
      });
      return;
    }

    if (hasApplied(jobId)) {
      toast({
        title: "Already Applied",
        description: "You have already applied to this job.",
      });
      return;
    }

    if (candidateProfile) {
      applyMutation.mutate({
        jobId,
        candidateId: candidateProfile.id,
      });
    }
  };

  // Apply with Resume handler
  const handleApplyWithResume = (job: any) => {
    if (!isProfileComplete) {
      toast({
        title: "Incomplete Profile",
        description: "Please complete your profile before applying to jobs.",
        variant: "destructive",
      });
      return;
    }

    if (hasApplied(job.id)) {
      toast({
        title: "Already Applied",
        description: "You have already applied to this job.",
      });
      return;
    }

    setSelectedJobForApply(job);
    setShowCoverLetterDialog(true);
  };

  // Apply with LinkedIn handler
  const handleApplyWithLinkedIn = (linkedinUrl: string) => {
    if (linkedinUrl) {
      window.open(linkedinUrl, "_blank");
      toast({
        title: "Redirecting to LinkedIn",
        description: "Opening LinkedIn job posting in a new tab.",
      });
    }
  };

  // Save/Unsave job handler
  const handleSaveJob = (jobId: string) => {
    if (isSaved(jobId)) {
      unsaveJobMutation.mutate(jobId);
    } else {
      saveJobMutation.mutate(jobId);
    }
  };

  // View job details
  const handleViewDetails = (job: any) => {
    setSelectedJobForDetails(job);
    setShowJobDetailsDialog(true);
  };

  // Submit application
  const handleSubmitApplication = () => {
    if (!selectedJobForApply || !candidateProfile) return;

    applyMutation.mutate({
      jobId: selectedJobForApply.id,
      candidateId: candidateProfile.id,
      coverLetter: coverLetter.trim() || undefined,
    });
  };

  const handleViewApplicationDetails = (applicationId: string) => {
    const application = myApplications?.find((app: any) => app.id === applicationId);
    if (application) {
      setSelectedApplicationForDetails(application);
      setShowApplicationDetailsDialog(true);
    }
  };

  // Format jobs for display with match scores and search filtering
  const formattedJobs = useMemo(() => {
    if (!availableJobs || !candidateProfile) return [];

    // Filter jobs by search query
    let filteredJobs = availableJobs;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredJobs = availableJobs.filter((job: any) => {
        const title = (job.title || "").toLowerCase();
        const company = (job.company || "").toLowerCase();
        const location = (job.location || "").toLowerCase();
        const skills = (job.requiredSkills || []).join(" ").toLowerCase();
        return (
          title.includes(query) ||
          company.includes(query) ||
          location.includes(query) ||
          skills.includes(query)
        );
      });
    }

    return filteredJobs.map((job: any) => {
      // Calculate match score based on skills
      const candidateSkills = new Set(
        (candidateProfile.skills || []).map((s: string) => s.toLowerCase())
      );
      const jobSkills = job.requiredSkills || [];
      const matchedSkills = jobSkills.filter((s: string) =>
        candidateSkills.has(s.toLowerCase())
      );
      const matchScore = jobSkills.length > 0
        ? Math.round((matchedSkills.length / jobSkills.length) * 100)
        : 0;

      return {
        id: job.id,
        title: job.title,
        company: job.company || "Company",
        location: job.location || "Remote",
        salary: job.salary_min && job.salary_max
          ? `$${job.salary_min / 1000}k - $${job.salary_max / 1000}k`
          : "Competitive",
        type: job.jobType || "Full-time",
        skills: jobSkills,
        matchScore,
        postedDate: new Date(job.createdAt).toLocaleDateString(),
        externalUrl: job.externalUrl,
        linkedinUrl: job.linkedinUrl,
      };
    });
  }, [availableJobs, candidateProfile, searchQuery]);

  // Format applications for display
  const formattedApplications = useMemo(() => {
    if (!myApplications) return [];

    return myApplications.map((app: any) => ({
      id: app.id,
      jobTitle: app.jobTitle || "Job",
      company: app.company || "Company",
      appliedDate: new Date(app.appliedAt).toLocaleDateString(),
      status: app.status,
    }));
  }, [myApplications]);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const isLoading = isLoadingProfile || isLoadingApplications || isLoadingJobs;
  const hasError = profileError || applicationsError || jobsError;

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          userRole="candidate"
          userName={user?.username || "User"}
          onLogout={logout}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b p-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="hidden md:block flex-1 max-w-md">
                <SearchBar
                  placeholder="Search jobs, companies..."
                  onSearch={setSearchQuery}
                  showFilters={false}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    Welcome back, {user?.username || "User"}!
                  </h1>
                  <p className="text-muted-foreground">
                    Here's what's happening with your job search.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/candidate/profile")}
                  variant="outline"
                  size="sm"
                >
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>

              {/* Error State */}
              {hasError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Unable to load some data. Please try refreshing the page.
                  </AlertDescription>
                </Alert>
              )}

              {/* Stats Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoadingApplications ? (
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

              {/* Contact Requests Notifications */}
              {contactRequests && contactRequests.filter((r: any) => r.status === "pending").length > 0 && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Recruiter Contact Requests</CardTitle>
                      <Badge variant="secondary" className="ml-auto">
                        {contactRequests.filter((r: any) => r.status === "pending").length} pending
                      </Badge>
                    </div>
                    <CardDescription>
                      Recruiters want to view your full profile. Approve to let them see your details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {contactRequests
                      .filter((r: any) => r.status === "pending")
                      .map((request: any) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 bg-background rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">{request.recruiterName}</p>
                            {request.jobTitle && (
                              <p className="text-sm text-muted-foreground">
                                For: {request.jobTitle}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                respondToContactMutation.mutate({
                                  requestId: request.id,
                                  status: "approved",
                                })
                              }
                              disabled={respondToContactMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                respondToContactMutation.mutate({
                                  requestId: request.id,
                                  status: "rejected",
                                })
                              }
                              disabled={respondToContactMutation.isPending}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Recommended Jobs Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Recommended Jobs</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid="button-view-all-jobs"
                        onClick={() => navigate("/candidate/jobs")}
                      >
                        View All
                      </Button>
                    </div>

                    {isLoadingJobs ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(2)].map((_, i) => (
                          <Card key={i}>
                            <CardHeader>
                              <Skeleton className="h-6 w-3/4" />
                              <Skeleton className="h-4 w-1/2 mt-2" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-2/3" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : formattedJobs.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                          <CardTitle className="text-lg mb-2">No Jobs Available</CardTitle>
                          <CardDescription>
                            Check back later for new opportunities
                          </CardDescription>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formattedJobs.slice(0, 2).map((job) => (
                          <JobCard
                            key={job.id}
                            {...job}
                            onQuickApply={() => handleQuickApply(job.id)}
                            onApplyWithLinkedIn={job.linkedinUrl ? () => handleApplyWithLinkedIn(job.linkedinUrl) : undefined}
                            onApplyWithResume={() => handleApplyWithResume(job)}
                            onSaveJob={() => handleSaveJob(job.id)}
                            onViewDetails={() => handleViewDetails(job)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Application Tracker Section */}
                  {isLoadingApplications ? (
                    <Card>
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : formattedApplications.length === 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Application Tracker</CardTitle>
                        <CardDescription>Track your job applications</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                        <CardTitle className="text-lg mb-2">No Applications Yet</CardTitle>
                        <CardDescription className="text-center">
                          Start applying to jobs to track your progress here
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ) : (
                    <ApplicationTracker
                      applications={formattedApplications}
                      onViewApplication={handleViewApplicationDetails}
                      onWithdraw={(id) => console.log("Withdrawing", id)}
                    />
                  )}
                </div>

                {/* Skill Recommendations Section */}
                <div className="space-y-6">
                  {/* Job Search Status */}
                  {isLoadingProfile ? (
                    <Card>
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-24 w-full mt-4" />
                      </CardContent>
                    </Card>
                  ) : (
                    <JobSearchStatusSection
                      currentStatus={candidateProfile?.jobSearchStatus || "available"}
                      onStatusChange={(status) => updateJobSearchStatusMutation.mutate(status)}
                      isUpdating={updateJobSearchStatusMutation.isPending}
                    />
                  )}

                  {/* Availability Status Card */}
                  {isLoadingProfile ? (
                    <Card>
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-16 w-full" />
                      </CardContent>
                    </Card>
                  ) : candidateProfile?.availability ? (() => {
                    try {
                      const availData = candidateProfile.availability.startsWith('{')
                        ? JSON.parse(candidateProfile.availability)
                        : null;

                      if (availData) {
                        return (
                          <Card
                            className="border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
                            onClick={() => navigate("/candidate/profile")}
                          >
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="h-5 w-5 text-primary" />
                                Availability Status
                              </CardTitle>
                              <CardDescription>Your current work preferences</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">
                                  Available {availData.startDate.replace(/-/g, ' ')}
                                </span>
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Preferences</p>
                                <div className="flex flex-wrap gap-1">
                                  {availData.preferences?.fullTime && <Badge variant="secondary" className="text-xs">Full-time</Badge>}
                                  {availData.preferences?.partTime && <Badge variant="secondary" className="text-xs">Part-time</Badge>}
                                  {availData.preferences?.contract && <Badge variant="secondary" className="text-xs">Contract</Badge>}
                                  {availData.preferences?.remote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                                  {availData.preferences?.hybrid && <Badge variant="outline" className="text-xs">Hybrid</Badge>}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {availData.weeklyHours}h/week
                                </span>
                                <span>{availData.timezone}</span>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => navigate("/candidate/profile")}
                              >
                                Update Availability
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      }
                    } catch (e) {
                      return null;
                    }
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Calendar className="h-5 w-5" />
                            Set Your Availability
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            Let recruiters know when you're available to start
                          </p>
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate("/candidate/profile")}
                          >
                            Add Availability
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })() : null}

                  {isLoadingProfile ? (
                    <Card>
                      <CardHeader>
                        <Skeleton className="h-6 w-48" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    <SkillRecommendations
                      recommendations={recommendations?.recommendations || []}
                      basedOn={recommendations?.basedOn || "career growth"}
                    />
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <ChatBot />

      {/* Cover Letter Dialog */}
      <Dialog open={showCoverLetterDialog} onOpenChange={setShowCoverLetterDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Apply to {selectedJobForApply?.title}</DialogTitle>
            <DialogDescription>
              Add a cover letter to strengthen your application (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cover-letter">Cover Letter</Label>
              <Textarea
                id="cover-letter"
                placeholder="Explain why you're a great fit for this position..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {coverLetter.length} / 500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCoverLetterDialog(false);
                setCoverLetter("");
                setSelectedJobForApply(null);
              }}
              disabled={applyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitApplication}
              disabled={applyMutation.isPending || coverLetter.length > 500}
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Job Details Dialog */}
      <Dialog open={showJobDetailsDialog} onOpenChange={setShowJobDetailsDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedJobForDetails?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {selectedJobForDetails?.company}
            </DialogDescription>
          </DialogHeader>
          {selectedJobForDetails && (
            <div className="space-y-6 py-4">
              {/* Job Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedJobForDetails.location}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Job Type</p>
                  <Badge variant="outline">{selectedJobForDetails.type}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Salary Range</p>
                  <p className="font-medium">{selectedJobForDetails.salary}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Posted</p>
                  <p className="font-medium">{selectedJobForDetails.postedDate}</p>
                </div>
              </div>

              {/* Match Score */}
              {selectedJobForDetails.matchScore && (
                <div className="rounded-lg bg-primary/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Your Match Score</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Based on your skills and experience
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-3xl font-bold text-primary">
                      <Sparkles className="h-6 w-6" />
                      {selectedJobForDetails.matchScore}%
                    </div>
                  </div>
                </div>
              )}

              {/* Required Skills */}
              <div className="space-y-3">
                <h3 className="font-semibold">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJobForDetails.skills.map((skill: string) => (
                    <SkillBadge key={skill} skill={skill} />
                  ))}
                </div>
              </div>

              {/* External Links */}
              {(selectedJobForDetails.externalUrl || selectedJobForDetails.linkedinUrl) && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Apply Externally</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobForDetails.externalUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedJobForDetails.externalUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Company Website
                      </Button>
                    )}
                    {selectedJobForDetails.linkedinUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedJobForDetails.linkedinUrl, '_blank')}
                      >
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowJobDetailsDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowJobDetailsDialog(false);
                if (selectedJobForDetails) {
                  handleQuickApply(selectedJobForDetails.id);
                }
              }}
            >
              <Zap className="mr-2 h-4 w-4" />
              Apply Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Details Dialog */}
      <Dialog open={showApplicationDetailsDialog} onOpenChange={setShowApplicationDetailsDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedApplicationForDetails?.jobTitle || "Application Details"}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {selectedApplicationForDetails?.company || "Company"}
            </DialogDescription>
          </DialogHeader>
          {selectedApplicationForDetails && (
            <div className="space-y-6 py-4">
              {/* Application Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <ApplicationStatusBadge status={selectedApplicationForDetails.status} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Applied On</p>
                  <p className="font-medium">
                    {selectedApplicationForDetails.appliedAt
                      ? new Date(selectedApplicationForDetails.appliedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : "Recently"}
                  </p>
                </div>
                {selectedApplicationForDetails.updatedAt &&
                 selectedApplicationForDetails.updatedAt !== selectedApplicationForDetails.appliedAt && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">
                        {new Date(selectedApplicationForDetails.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Application ID */}
              <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Application ID</p>
                <code className="text-xs font-mono">{selectedApplicationForDetails.id}</code>
              </div>

              {/* Cover Letter */}
              {selectedApplicationForDetails.coverLetter && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Cover Letter
                  </h3>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedApplicationForDetails.coverLetter}
                    </p>
                  </div>
                </div>
              )}

              {/* Match Score if available */}
              {selectedApplicationForDetails.matchScore !== undefined && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Match Score
                  </h3>
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold text-primary">
                        {selectedApplicationForDetails.matchScore}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This score represents how well your profile matches the job requirements
                    </p>
                  </div>
                </div>
              )}

              {/* Application Timeline */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Application Timeline
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <div className="w-px h-full bg-border" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium">Applied</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedApplicationForDetails.appliedAt
                          ? new Date(selectedApplicationForDetails.appliedAt).toLocaleString()
                          : "N/A"}
                      </p>
                      {selectedApplicationForDetails.coverLetter && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Submitted with cover letter
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedApplicationForDetails.status !== "applied" && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            selectedApplicationForDetails.status === "rejected"
                              ? "bg-destructive"
                              : "bg-primary"
                          }`}
                        />
                        <div className="w-px h-full bg-border" />
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium capitalize">
                          {selectedApplicationForDetails.status?.replace("_", " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedApplicationForDetails.updatedAt
                            ? new Date(selectedApplicationForDetails.updatedAt).toLocaleString()
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
                      <div className="mt-2">
                        <ApplicationStatusBadge status={selectedApplicationForDetails.status} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApplicationDetailsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
