import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { applications } from "@/lib/api";
import { SkillBadge } from "@/components/SkillBadge";
import { Bell, Bookmark, Inbox, AlertCircle, Loader2, Sparkles, Building2, Zap, ExternalLink, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SavedJobsPage() {
  const [showCoverLetterDialog, setShowCoverLetterDialog] = useState(false);
  const [showJobDetailsDialog, setShowJobDetailsDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [selectedJobForApply, setSelectedJobForApply] = useState<any>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any>(null);
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch candidate profile
  const { data: candidateProfile } = useQuery({
    queryKey: ["/api/candidates/me"],
    retry: false,
  });

  // Fetch saved jobs
  const { data: savedJobsData, isLoading, error } = useQuery<any>({
    queryKey: ["/api/saved-jobs/me"],
    retry: false,
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

  // Check if user has already applied
  const { data: myApplications } = useQuery<any[]>({
    queryKey: ["/api/applications/me"],
    retry: false,
  });

  const hasApplied = (jobId: string) => {
    if (!myApplications) return false;
    return myApplications.some((app: any) => app.jobId === jobId);
  };

  const handleQuickApply = (jobId: string) => {
    if (!candidateProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile before applying.",
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

    applyMutation.mutate({
      jobId,
      candidateId: candidateProfile.id,
    });
  };

  const handleApplyWithResume = (job: any) => {
    if (!candidateProfile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile before applying.",
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

  const handleSubmitApplication = () => {
    if (!selectedJobForApply || !candidateProfile) return;

    applyMutation.mutate({
      jobId: selectedJobForApply.id,
      candidateId: candidateProfile.id,
      coverLetter: coverLetter.trim() || undefined,
    });
  };

  const handleViewDetails = (job: any) => {
    setSelectedJobForDetails(job);
    setShowJobDetailsDialog(true);
  };

  const handleUnsaveJob = (jobId: string) => {
    unsaveJobMutation.mutate(jobId);
  };

  const savedJobs = savedJobsData?.savedJobs || [];

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

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
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                <h1 className="text-xl font-semibold">Saved Jobs</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Your Saved Jobs</h2>
                  <p className="text-muted-foreground">
                    {isLoading ? "Loading..." : `${savedJobs.length} saved ${savedJobs.length === 1 ? 'job' : 'jobs'}`}
                  </p>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load saved jobs. Please try refreshing the page.
                  </AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
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
              ) : savedJobs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Bookmark className="h-16 w-16 text-muted-foreground mb-4" />
                    <CardTitle className="text-xl mb-2">No Saved Jobs</CardTitle>
                    <CardDescription className="text-center mb-4">
                      You haven't saved any jobs yet. Browse jobs and save the ones you're interested in!
                    </CardDescription>
                    <Button onClick={() => navigate("/candidate/jobs")}>
                      Browse Jobs
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedJobs.map((savedJob: any) => {
                    const job = savedJob.job;
                    if (!job) return null;

                    // Calculate match score
                    const candidateSkills = new Set(
                      (candidateProfile?.skills || []).map((s: string) => s.toLowerCase())
                    );
                    const jobSkills = job.requiredSkills || [];
                    const matchedSkills = jobSkills.filter((s: string) =>
                      candidateSkills.has(s.toLowerCase())
                    );
                    const matchScore = jobSkills.length > 0
                      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
                      : 0;

                    return (
                      <JobCard
                        key={job.id}
                        id={job.id}
                        title={job.title}
                        company="Company"
                        location={job.location || "Remote"}
                        salary={
                          job.salary_min && job.salary_max
                            ? `$${job.salary_min / 1000}k - $${job.salary_max / 1000}k`
                            : "Competitive"
                        }
                        type={job.jobType || "Full-time"}
                        skills={jobSkills}
                        matchScore={matchScore}
                        postedDate={new Date(savedJob.savedAt).toLocaleDateString()}
                        externalUrl={job.externalUrl}
                        linkedinUrl={job.linkedinUrl}
                        onQuickApply={() => handleQuickApply(job.id)}
                        onApplyWithResume={() => handleApplyWithResume(job)}
                        onSaveJob={() => handleUnsaveJob(job.id)}
                        onViewDetails={() => handleViewDetails(job)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

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
              Company
            </DialogDescription>
          </DialogHeader>
          {selectedJobForDetails && (
            <div className="space-y-6 py-4">
              {/* Job Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedJobForDetails.location || "Remote"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Job Type</p>
                  <Badge variant="outline">{selectedJobForDetails.jobType || "Full-time"}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Salary Range</p>
                  <p className="font-medium">
                    {selectedJobForDetails.salary_min && selectedJobForDetails.salary_max
                      ? `$${selectedJobForDetails.salary_min / 1000}k - $${selectedJobForDetails.salary_max / 1000}k`
                      : "Competitive"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Saved</p>
                  <p className="font-medium">
                    {savedJobs.find((sj: any) => sj.jobId === selectedJobForDetails.id)
                      ? new Date(savedJobs.find((sj: any) => sj.jobId === selectedJobForDetails.id).savedAt).toLocaleDateString()
                      : "Recently"}
                  </p>
                </div>
              </div>

              {/* Job Description */}
              {selectedJobForDetails.description && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Job Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedJobForDetails.description}</p>
                </div>
              )}

              {/* Required Skills */}
              {selectedJobForDetails.requiredSkills && selectedJobForDetails.requiredSkills.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobForDetails.requiredSkills.map((skill: string) => (
                      <SkillBadge key={skill} skill={skill} />
                    ))}
                  </div>
                </div>
              )}

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
    </SidebarProvider>
  );
}
