import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchBar } from "@/components/SearchBar";
import { JobCard } from "@/components/JobCard";
import { AIMatchScore } from "@/components/AIMatchScore";
import { ChatBot } from "@/components/ChatBot";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, SlidersHorizontal, X, CheckCircle, AlertCircle, Loader2, Sparkles, Target, Building2, ExternalLink, Linkedin, Zap } from "lucide-react";
import { jobs, candidates, applications, ai } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { SkillBadge } from "@/components/SkillBadge";

type SkillMatch = { skill: string; matched: boolean };

const jobTypes = ["full-time", "part-time", "contract", "remote"];

interface Job {
  id: string;
  title: string;
  description: string;
  location?: string;
  requiredSkills?: string[];
  salary_min?: number;
  salary_max?: number;
  jobType?: string;
  externalUrl?: string;
  linkedinUrl?: string;
  isActive?: boolean;
  recruiterId?: string;
}

interface CandidateProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  experience?: number;
  headline?: string;
  availability?: string | null;
}

interface AvailabilityPreferences {
  startDate: string;
  preferences: {
    fullTime: boolean;
    partTime: boolean;
    contract: boolean;
    remote: boolean;
    hybrid: boolean;
    onsite: boolean;
  };
  weeklyHours: string;
  timezone: string;
}

export function JobSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetailsDialog, setShowJobDetailsDialog] = useState(false);
  const [matchScore, setMatchScore] = useState<number>(0);
  const [matchedSkills, setMatchedSkills] = useState<SkillMatch[]>([]);
  const [filters, setFilters] = useState({
    jobTypes: [] as string[],
    salaryRange: [50, 200],
    location: "",
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showCoverLetterDialog, setShowCoverLetterDialog] = useState(false);
  const [showResumeUploadDialog, setShowResumeUploadDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applyMode, setApplyMode] = useState<"quick" | "linkedin" | "resume">("quick");

  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse candidate availability preferences
  const parseAvailability = (availabilityStr?: string | null): AvailabilityPreferences | null => {
    if (!availabilityStr) return null;
    try {
      if (availabilityStr.startsWith('{')) {
        return JSON.parse(availabilityStr);
      }
    } catch (e) {
      console.error("Failed to parse availability:", e);
    }
    return null;
  };

  // Calculate preference match score for a job
  const calculatePreferenceMatch = (
    job: Job,
    preferences: AvailabilityPreferences | null
  ): { score: number; matches: string[] } => {
    if (!preferences) return { score: 0, matches: [] };

    const matches: string[] = [];
    let matchCount = 0;
    let totalChecks = 0;

    // Check job type preference
    const jobTypeNormalized = (job.jobType || "full-time").toLowerCase();
    if (preferences.preferences.fullTime && jobTypeNormalized === "full-time") {
      matchCount++;
      matches.push("Job Type: Full-time");
    }
    if (preferences.preferences.partTime && jobTypeNormalized === "part-time") {
      matchCount++;
      matches.push("Job Type: Part-time");
    }
    if (preferences.preferences.contract && jobTypeNormalized === "contract") {
      matchCount++;
      matches.push("Job Type: Contract");
    }
    totalChecks++;

    // Check location preference
    const jobLocationNormalized = (job.location || "").toLowerCase();
    if (preferences.preferences.remote && jobLocationNormalized.includes("remote")) {
      matchCount++;
      matches.push("Location: Remote");
    }
    if (preferences.preferences.hybrid && jobLocationNormalized.includes("hybrid")) {
      matchCount++;
      matches.push("Location: Hybrid");
    }
    if (preferences.preferences.onsite && !jobLocationNormalized.includes("remote") && !jobLocationNormalized.includes("hybrid")) {
      matchCount++;
      matches.push("Location: On-site");
    }
    totalChecks++;

    const score = totalChecks > 0 ? Math.round((matchCount / totalChecks) * 100) : 0;
    return { score, matches };
  };

  // Fetch jobs from API
  const { data: jobsList, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    retry: false,
  });

  // Fetch candidate profile for skill matching
  const { data: candidateProfile } = useQuery<CandidateProfile | null>({
    queryKey: ["/api/candidates/me"],
    retry: false,
    queryFn: async (): Promise<CandidateProfile | null> => {
      try {
        const profile = await candidates.getMe();
        return profile as CandidateProfile | null;
      } catch {
        return null;
      }
    },
  });

  // Fetch user's applications to check which jobs they've applied to
  const { data: myApplications } = useQuery<any[]>({
    queryKey: ["/api/applications/me"],
    retry: false,
  });

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
      setShowResumeUploadDialog(false);
      setCoverLetter("");
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

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Check if profile is complete
  const isProfileComplete = !!(
    candidateProfile &&
    candidateProfile.firstName &&
    candidateProfile.skills &&
    candidateProfile.skills.length > 0
  );

  // Check if user has already applied to selected job
  const hasApplied = (jobId: string) => {
    if (!myApplications) return false;
    return myApplications.some((app: any) => app.jobId === jobId);
  };

  // Check if job is saved
  const isSaved = (jobId: string) => {
    if (!savedJobsData?.savedJobs) return false;
    return savedJobsData.savedJobs.some((saved: any) => saved.jobId === jobId);
  };

  // Quick Apply handler - direct application with saved profile
  const handleQuickApply = (jobId: string) => {
    const job = filteredJobs.find((j: any) => j.id === jobId);
    if (!job) return;

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

    // Quick apply - submit immediately without cover letter
    if (candidateProfile) {
      applyMutation.mutate({
        jobId,
        candidateId: candidateProfile.id,
      });
    }
  };

  // Apply with Resume handler - shows resume upload dialog
  const handleApplyWithResume = (jobId: string) => {
    const job = filteredJobs.find((j: any) => j.id === jobId);
    if (!job) return;

    if (hasApplied(jobId)) {
      toast({
        title: "Already Applied",
        description: "You have already applied to this job.",
      });
      return;
    }

    setSelectedJob(job);
    setApplyMode("resume");
    setShowCoverLetterDialog(true);
  };

  // Apply with LinkedIn handler - redirects to LinkedIn URL
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

  // Submit application
  const handleSubmitApplication = () => {
    if (!selectedJob || !candidateProfile) return;

    applyMutation.mutate({
      jobId: selectedJob.id,
      candidateId: candidateProfile.id,
      coverLetter: coverLetter.trim() || undefined,
    });
  };

  // Set first job as selected when jobs load
  useEffect(() => {
    if (Array.isArray(jobsList) && jobsList.length > 0 && !selectedJob) {
      setSelectedJob(jobsList[0]);
    }
  }, [jobsList, selectedJob]);

  // Calculate match score when job is selected
  useEffect(() => {
    if (selectedJob && candidateProfile?.skills) {
      ai.matchScore(candidateProfile.skills, selectedJob.requiredSkills || [])
        .then((result: any) => {
          setMatchScore(result.score);
          setMatchedSkills(result.matchedSkills || []);
        })
        .catch(() => {
          setMatchScore(0);
          setMatchedSkills([]);
        });
    }
  }, [selectedJob, candidateProfile]);

  const toggleFilter = (category: string, value: string) => {
    const key = category as keyof typeof filters;
    if (Array.isArray(filters[key])) {
      const arr = filters[key] as string[];
      if (arr.includes(value)) {
        setFilters({ ...filters, [key]: arr.filter((v) => v !== value) });
        setActiveFilters(activeFilters.filter((f) => f !== value));
      } else {
        setFilters({ ...filters, [key]: [...arr, value] });
        setActiveFilters([...activeFilters, value]);
      }
    }
  };

  const clearFilters = () => {
    setFilters({
      jobTypes: [],
      salaryRange: [50, 200],
      location: "",
    });
    setActiveFilters([]);
  };

  // Parse candidate availability preferences
  const availabilityPreferences = parseAvailability(candidateProfile?.availability);

  // Filter and sort jobs based on criteria and preferences
  const filteredJobs = (Array.isArray(jobsList) ? jobsList : [])
    .filter((job: Job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesJobType =
        filters.jobTypes.length === 0 ||
        filters.jobTypes.includes(job.jobType?.toLowerCase() || "");

      const matchesSalary =
        !job.salary_min ||
        !job.salary_max ||
        (job.salary_min / 1000 >= filters.salaryRange[0] &&
          job.salary_max / 1000 <= filters.salaryRange[1]);

      const matchesLocation =
        !filters.location ||
        job.location?.toLowerCase().includes(filters.location.toLowerCase());

      return matchesSearch && matchesJobType && matchesSalary && matchesLocation;
    })
    .map((job: Job) => {
      // Calculate preference match for each job
      const preferenceMatch = calculatePreferenceMatch(job, availabilityPreferences);
      return {
        ...job,
        preferenceScore: preferenceMatch.score,
        preferenceMatches: preferenceMatch.matches,
      };
    })
    .sort((a, b) => {
      // Sort by preference score (higher first), then by title
      if (b.preferenceScore !== a.preferenceScore) {
        return b.preferenceScore - a.preferenceScore;
      }
      return a.title.localeCompare(b.title);
    });


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
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-hidden">
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4">
              <div className="lg:col-span-2 xl:col-span-2 border-r overflow-auto p-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <SearchBar
                        placeholder="Search jobs by title, company, or skill..."
                        onSearch={setSearchQuery}
                        showFilters={false}
                      />
                    </div>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="gap-2" data-testid="button-filters">
                          <SlidersHorizontal className="h-4 w-4" />
                          Filters
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Filter Jobs</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-6 mt-6">
                          <div className="space-y-3">
                            <Label>Job Type</Label>
                            {jobTypes.map((type) => (
                              <div key={type} className="flex items-center gap-2">
                                <Checkbox
                                  id={type}
                                  checked={filters.jobTypes.includes(type)}
                                  onCheckedChange={() => toggleFilter("jobTypes", type)}
                                />
                                <Label htmlFor={type} className="font-normal">{type}</Label>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-3">
                            <Label>Salary Range (${filters.salaryRange[0]}k - ${filters.salaryRange[1]}k)</Label>
                            <Slider
                              value={filters.salaryRange}
                              onValueChange={(value) => setFilters({ ...filters, salaryRange: value })}
                              min={0}
                              max={300}
                              step={10}
                            />
                          </div>

                          <div className="space-y-3">
                            <Label>Location</Label>
                            <Select
                              value={filters.location}
                              onValueChange={(value) => setFilters({ ...filters, location: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Any location" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Any location</SelectItem>
                                <SelectItem value="remote">Remote</SelectItem>
                                <SelectItem value="san francisco">San Francisco</SelectItem>
                                <SelectItem value="new york">New York</SelectItem>
                                <SelectItem value="seattle">Seattle</SelectItem>
                                <SelectItem value="austin">Austin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button onClick={clearFilters} variant="outline" className="w-full">
                            Clear All Filters
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>

                  {activeFilters.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {activeFilters.map((filter) => (
                        <Badge key={filter} variant="secondary" className="gap-1">
                          {filter}
                          <button
                            onClick={() => {
                              setActiveFilters(activeFilters.filter((f) => f !== filter));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    {jobsLoading ? "Loading jobs..." : `${filteredJobs.length} jobs found`}
                  </div>

                  {/* Preference Info Alert */}
                  {availabilityPreferences && filteredJobs.length > 0 && (
                    <Alert className="border-primary/50 bg-primary/5">
                      <Target className="h-4 w-4 text-primary" />
                      <AlertDescription>
                        Jobs are sorted by how well they match your preferences (
                        {[
                          availabilityPreferences.preferences.fullTime && "Full-time",
                          availabilityPreferences.preferences.partTime && "Part-time",
                          availabilityPreferences.preferences.contract && "Contract",
                          availabilityPreferences.preferences.remote && "Remote",
                          availabilityPreferences.preferences.hybrid && "Hybrid",
                          availabilityPreferences.preferences.onsite && "On-site",
                        ].filter(Boolean).join(", ")})
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    {jobsLoading ? (
                      Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton key={i} className="h-24 w-full" />
                        ))
                    ) : filteredJobs.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-center text-muted-foreground">
                            No jobs found matching your criteria
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredJobs.map((job: any) => (
                        <div
                          key={job.id}
                          className={`cursor-pointer rounded-lg transition-colors relative ${
                            selectedJob?.id === job.id ? "ring-2 ring-primary" : ""
                          }`}
                          onClick={() => setSelectedJob(job)}
                        >
                          {/* Perfect Match Badge */}
                          {job.preferenceScore === 100 && (
                            <Badge
                              className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-purple-500 to-pink-500 gap-1 shadow-lg"
                            >
                              <Sparkles className="h-3 w-3" />
                              Perfect Match
                            </Badge>
                          )}
                          {job.preferenceScore >= 50 && job.preferenceScore < 100 && (
                            <Badge
                              variant="secondary"
                              className="absolute -top-2 -right-2 z-10 gap-1 bg-primary/10 text-primary border-primary/20"
                            >
                              <Target className="h-3 w-3" />
                              Great Match
                            </Badge>
                          )}

                          <JobCard
                            id={job.id}
                            title={job.title}
                            company={job.recruiterId || "Company"}
                            location={job.location || "Not specified"}
                            salary={
                              job.salary_min && job.salary_max
                                ? `$${job.salary_min / 1000}k - $${job.salary_max / 1000}k`
                                : "Not specified"
                            }
                            type={(job.jobType || "full-time") as "Full-time" | "Part-time" | "Contract" | "Remote"}
                            skills={job.requiredSkills || []}
                            matchScore={selectedJob?.id === job.id ? matchScore : 0}
                            postedDate="Recently"
                            externalUrl={job.externalUrl}
                            linkedinUrl={job.linkedinUrl}
                            onQuickApply={() => handleQuickApply(job.id)}
                            onApplyWithLinkedIn={job.linkedinUrl ? () => handleApplyWithLinkedIn(job.linkedinUrl) : undefined}
                            onApplyWithResume={() => handleApplyWithResume(job.id)}
                            onSaveJob={() => handleSaveJob(job.id)}
                            onViewDetails={() => {
                              setSelectedJob(job);
                              setShowJobDetailsDialog(true);
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-1 xl:col-span-2 overflow-auto p-6 bg-muted/20">
                {selectedJob ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-xl">{selectedJob.title}</CardTitle>
                            <p className="text-muted-foreground">{selectedJob.recruiterId || "Company"}</p>
                          </div>
                          <Badge variant="secondary" className="capitalize">{selectedJob.jobType || "full-time"}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Preference Match Section */}
                        {(() => {
                          const selectedJobWithPrefs = filteredJobs.find((j: any) => j.id === selectedJob.id);
                          if (selectedJobWithPrefs && selectedJobWithPrefs.preferenceScore > 0) {
                            return (
                              <Alert className="border-primary/50 bg-primary/5">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <AlertDescription>
                                  <div className="font-semibold mb-1">
                                    {selectedJobWithPrefs.preferenceScore}% Preference Match
                                  </div>
                                  {selectedJobWithPrefs.preferenceMatches.length > 0 && (
                                    <div className="text-xs space-y-1 mt-2">
                                      {selectedJobWithPrefs.preferenceMatches.map((match: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3 text-green-600" />
                                          {match}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </AlertDescription>
                              </Alert>
                            );
                          }
                          return null;
                        })()}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Location</span>
                            <p className="font-medium">{selectedJob.location || "Not specified"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Salary</span>
                            <p className="font-medium">
                              {selectedJob.salary_min && selectedJob.salary_max
                                ? `$${selectedJob.salary_min / 1000}k - $${selectedJob.salary_max / 1000}k`
                                : "Not specified"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Job Type</span>
                            <p className="font-medium capitalize">{selectedJob.jobType || "full-time"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Skills Match</span>
                            <p className="font-medium text-primary">{matchScore}%</p>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Required Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {(selectedJob.requiredSkills || []).map((skill) => (
                              <Badge key={skill} variant="secondary">{skill}</Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Job Description</h3>
                          <p className="text-sm text-muted-foreground line-clamp-6">
                            {selectedJob.description} 
                            and a passion for building great products.
                          </p>
                        </div>

                        {/* Profile completion warning */}
                        {!isProfileComplete && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Please complete your profile before applying to jobs.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            data-testid="button-apply-now"
                            onClick={() => {
                              if (!isProfileComplete) {
                                toast({
                                  title: "Incomplete Profile",
                                  description: "Please complete your profile before applying to jobs.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              if (hasApplied(selectedJob.id)) {
                                toast({
                                  title: "Already Applied",
                                  description: "You have already applied to this job.",
                                });
                                return;
                              }
                              setShowCoverLetterDialog(true);
                            }}
                            disabled={
                              !isProfileComplete ||
                              hasApplied(selectedJob.id) ||
                              applyMutation.isPending
                            }
                          >
                            {applyMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Applying...
                              </>
                            ) : hasApplied(selectedJob.id) ? (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Applied
                              </>
                            ) : (
                              "Apply Now"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            data-testid="button-save-job"
                            onClick={() => handleSaveJob(selectedJob.id)}
                          >
                            {isSaved(selectedJob.id) ? "Saved" : "Save Job"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <AIMatchScore
                      score={matchScore}
                      jobTitle={selectedJob.title}
                      matchedSkills={matchedSkills}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Select a job to view details</p>
                  </div>
                )}
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
            <DialogTitle>Apply to {selectedJob?.title}</DialogTitle>
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
            <DialogTitle className="text-2xl">{selectedJob?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {selectedJob?.recruiterId || "Company"}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-6 py-4">
              {/* Job Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedJob.location}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Job Type</p>
                  <Badge variant="outline" className="capitalize">{selectedJob.jobType}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Salary Range</p>
                  <p className="font-medium">
                    {selectedJob.salary_min && selectedJob.salary_max
                      ? `$${selectedJob.salary_min / 1000}k - $${selectedJob.salary_max / 1000}k`
                      : "Not specified"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Posted</p>
                  <p className="font-medium">Recently</p>
                </div>
              </div>

              {/* Match Score */}
              {matchScore > 0 && (
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
                      {matchScore}%
                    </div>
                  </div>
                </div>
              )}

              {/* Job Description */}
              {selectedJob.description && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Job Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
                </div>
              )}

              {/* Required Skills */}
              {selectedJob.requiredSkills && selectedJob.requiredSkills.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.requiredSkills.map((skill: string) => (
                      <SkillBadge key={skill} skill={skill} />
                    ))}
                  </div>
                </div>
              )}

              {/* External Links */}
              {(selectedJob.externalUrl || selectedJob.linkedinUrl) && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Apply Externally</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.externalUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedJob.externalUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Company Website
                      </Button>
                    )}
                    {selectedJob.linkedinUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedJob.linkedinUrl, '_blank')}
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
                if (selectedJob) {
                  handleQuickApply(selectedJob.id);
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
