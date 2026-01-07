import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { JobPostingForm } from "@/components/JobPostingForm";
import { CandidateApplicationsView } from "@/components/CandidateApplicationsView";
import { useToast } from "@/hooks/use-toast";
import { jobs } from "@/lib/api";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  Inbox,
  Loader2,
  Users,
  BarChart,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  jobType: string;
  requiredSkills: string[];
  salary_min?: number;
  salary_max?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface JobManagementProps {
  jobs: Job[];
  applications: any[];
  isLoading?: boolean;
  onViewApplications?: (jobId: string) => void;
}

export function JobManagement({
  jobs: jobsList,
  applications,
  isLoading,
  onViewApplications,
}: JobManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewCandidatesDialogOpen, setViewCandidatesDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to delete job");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setDeleteDialogOpen(false);
      setSelectedJob(null);
      toast({
        title: "Success",
        description: "Job deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete job.",
        variant: "destructive",
      });
    },
  });

  // Update job mutation (for edit and toggle status)
  const updateJobMutation = useMutation({
    mutationFn: (data: { id: string; updates: any }) =>
      jobs.update(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setEditDialogOpen(false);
      setSelectedJob(null);
      toast({
        title: "Success",
        description: "Job updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update job.",
        variant: "destructive",
      });
    },
  });

  // Calculate job statistics
  const jobStats = useMemo(() => {
    return jobsList.map((job) => {
      const jobApplications = applications.filter((app: any) => app.jobId === job.id);
      return {
        ...job,
        applicationsCount: jobApplications.length,
        shortlistedCount: jobApplications.filter(
          (app: any) => app.status === "shortlisted" || app.status === "interview"
        ).length,
      };
    });
  }, [jobsList, applications]);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    let filtered = jobStats;

    // Filter by status
    if (statusFilter === "active") {
      filtered = filtered.filter((job) => job.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((job) => !job.isActive);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.location.toLowerCase().includes(query) ||
          job.jobType.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [jobStats, statusFilter, searchQuery]);

  const handleDeleteClick = (job: Job) => {
    setSelectedJob(job);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (job: Job) => {
    setSelectedJob(job);
    setEditDialogOpen(true);
  };

  const handleToggleStatus = (job: Job) => {
    updateJobMutation.mutate({
      id: job.id,
      updates: { isActive: !job.isActive },
    });
  };

  const handleEditSubmit = (formData: any) => {
    if (!selectedJob) return;

    const jobData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      jobType: formData.type,
      requiredSkills: formData.skills,
      salary_min: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
      salary_max: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
    };

    updateJobMutation.mutate({
      id: selectedJob.id,
      updates: jobData,
    });
  };

  const handleConfirmDelete = () => {
    if (selectedJob) {
      deleteJobMutation.mutate(selectedJob.id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Job Postings</CardTitle>
              <CardDescription>
                Manage your job postings and track applications
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">No Jobs Found</CardTitle>
              <CardDescription>
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Click 'Post New Job' to create your first job posting"}
              </CardDescription>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Applications</TableHead>
                    <TableHead className="text-center">Shortlisted</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {job.location}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {job.jobType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={job.isActive ? "default" : "secondary"}
                          className="gap-1"
                        >
                          {job.isActive ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{job.applicationsCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <BarChart className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{job.shortlistedCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={
                                updateJobMutation.isPending ||
                                deleteJobMutation.isPending
                              }
                            >
                              {updateJobMutation.isPending ||
                              deleteJobMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedJob(job);
                                setViewCandidatesDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View AI-Matched Candidates
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(job)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Job
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(job)}>
                              {job.isActive ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Mark as Inactive
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Active
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(job)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Job
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Posting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedJob?.title}"? This action cannot
              be undone and will remove all associated applications.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteJobMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteJobMutation.isPending}
            >
              {deleteJobMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Job"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Posting</DialogTitle>
            <DialogDescription>
              Update the details for "{selectedJob?.title}"
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <JobPostingForm
              onSubmit={handleEditSubmit}
              initialData={{
                title: selectedJob.title,
                company: "",
                location: selectedJob.location,
                type: selectedJob.jobType,
                salaryMin: selectedJob.salary_min?.toString() || "",
                salaryMax: selectedJob.salary_max?.toString() || "",
                description: selectedJob.description,
                requirements: "",
                skills: selectedJob.requiredSkills || [],
              }}
              isGenerating={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Candidates with AI Match Dialog */}
      {viewCandidatesDialogOpen && selectedJob && (
        <CandidateApplicationsView
          job={selectedJob}
          applications={applications.filter((app: any) => app.jobId === selectedJob.id)}
          onClose={() => {
            setViewCandidatesDialogOpen(false);
            setSelectedJob(null);
          }}
        />
      )}
    </>
  );
}
