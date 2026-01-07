import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AIMatchScore } from "@/components/AIMatchScore";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Sparkles,
  MapPin,
  Briefcase,
  GraduationCap,
  Star,
  Filter,
  ArrowUpDown,
  Calendar,
  Clock,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  requiredSkills: string[];
  location?: string;
}

interface Candidate {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  location: string | null;
  skills: string[] | null;
  headline: string | null;
  yearsOfExperience: number | null;
  experienceDetails: string | null;
  educationDetails: string | null;
  availability: string | null;
}

interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  status: string;
  appliedAt: string;
  matchScore?: number;
}

interface CandidateWithMatch extends Candidate {
  applicationId: string;
  applicationStatus: string;
  appliedAt: string;
  matchScore: number;
  matchDetails?: {
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    locationMatch: boolean;
  };
  matchedSkills?: Array<{ skill: string; matched: boolean }>;
}

interface CandidateApplicationsViewProps {
  job: Job;
  applications: Application[];
  onClose: () => void;
}

export function CandidateApplicationsView({
  job,
  applications,
  onClose,
}: CandidateApplicationsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"match" | "date" | "name">("match");
  const [filterMatch, setFilterMatch] = useState<"all" | "80+" | "60+" | "below60">("all");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithMatch | null>(null);

  // Fetch all candidates for these applications
  const { data: candidatesData, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["candidates", applications.map(a => a.candidateId)],
    queryFn: async () => {
      const candidatePromises = applications.map(async (app) => {
        try {
          const response = await fetch(`/api/candidates/${app.candidateId}`, {
            credentials: "include",
          });
          if (!response.ok) return null;
          const candidate = await response.json();
          return { ...candidate, applicationId: app.id, applicationStatus: app.status, appliedAt: app.appliedAt };
        } catch {
          return null;
        }
      });
      const results = await Promise.all(candidatePromises);
      return results.filter(Boolean);
    },
    enabled: applications.length > 0,
  });

  // Calculate match scores for all candidates
  const candidatesWithScores = useMemo(() => {
    if (!candidatesData) return [];

    return candidatesData.map((candidate: any) => {
      const candidateSkills = candidate.skills || [];
      const jobSkills = job.requiredSkills || [];

      // Calculate skills match
      const setCand = new Set(candidateSkills.map((s: string) => s.toLowerCase()));
      const matchedSkills = jobSkills.map((s: string) => ({
        skill: s,
        matched: setCand.has(s.toLowerCase()),
      }));
      const matchedCount = matchedSkills.filter((s: { skill: string; matched: boolean }) => s.matched).length;
      const skillsMatch = jobSkills.length > 0 ? Math.round((matchedCount / jobSkills.length) * 100) : 0;

      // Calculate experience match (simplified - based on years of experience)
      let experienceMatch = 50; // Default
      if (candidate.yearsOfExperience) {
        if (candidate.yearsOfExperience >= 5) experienceMatch = 100;
        else if (candidate.yearsOfExperience >= 3) experienceMatch = 75;
        else if (candidate.yearsOfExperience >= 1) experienceMatch = 50;
        else experienceMatch = 25;
      }

      // Calculate education match (simplified - has education = 100%)
      const educationMatch = candidate.educationDetails ? 100 : 50;

      // Calculate location match
      const locationMatch =
        !job.location ||
        !candidate.location ||
        candidate.location.toLowerCase().includes(job.location.toLowerCase()) ||
        candidate.location.toLowerCase().includes("remote");

      // Overall match score (weighted average)
      const matchScore = Math.round(
        skillsMatch * 0.5 + // Skills: 50%
        experienceMatch * 0.25 + // Experience: 25%
        educationMatch * 0.15 + // Education: 15%
        (locationMatch ? 100 : 0) * 0.1 // Location: 10%
      );

      return {
        ...candidate,
        matchScore,
        matchDetails: {
          skillsMatch,
          experienceMatch,
          educationMatch,
          locationMatch,
        },
        matchedSkills,
      };
    });
  }, [candidatesData, job]);

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    let filtered = candidatesWithScores;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName?.toLowerCase().includes(query) ||
          c.lastName?.toLowerCase().includes(query) ||
          c.bio?.toLowerCase().includes(query) ||
          c.skills?.some((s: string) => s.toLowerCase().includes(query))
      );
    }

    // Filter by match score
    if (filterMatch === "80+") {
      filtered = filtered.filter((c) => c.matchScore >= 80);
    } else if (filterMatch === "60+") {
      filtered = filtered.filter((c) => c.matchScore >= 60);
    } else if (filterMatch === "below60") {
      filtered = filtered.filter((c) => c.matchScore < 60);
    }

    // Sort candidates
    if (sortBy === "match") {
      filtered.sort((a, b) => b.matchScore - a.matchScore);
    } else if (sortBy === "date") {
      filtered.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
    } else if (sortBy === "name") {
      filtered.sort((a, b) => {
        const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim();
        const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim();
        return nameA.localeCompare(nameB);
      });
    }

    return filtered;
  }, [candidatesWithScores, searchQuery, filterMatch, sortBy]);

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getMatchBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Matched Candidates for {job.title}
                </DialogTitle>
                <DialogDescription>
                  {filteredCandidates.length} candidates sorted by AI match score
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" />
                  AI-Powered Matching
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterMatch} onValueChange={(v: any) => setFilterMatch(v)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Matches</SelectItem>
                  <SelectItem value="80+">80%+ Match</SelectItem>
                  <SelectItem value="60+">60%+ Match</SelectItem>
                  <SelectItem value="below60">Below 60%</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Sort by Match</SelectItem>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="name">Sort by Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Candidates List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {isLoadingCandidates ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </>
              ) : filteredCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="font-medium">No Candidates Found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                filteredCandidates.map((candidate) => (
                  <Card
                    key={candidate.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Match Score - Prominent */}
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getMatchColor(candidate.matchScore)}`}>
                            {candidate.matchScore}%
                          </div>
                          <p className="text-xs text-muted-foreground">Match</p>
                        </div>

                        {/* Candidate Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {candidate.firstName || ""} {candidate.lastName || "Unknown"}
                              </h3>
                              {candidate.headline && (
                                <p className="text-sm text-muted-foreground">{candidate.headline}</p>
                              )}
                            </div>
                            <Badge variant={getMatchBadgeVariant(candidate.matchScore)}>
                              {candidate.applicationStatus}
                            </Badge>
                          </div>

                          {/* Match Breakdown */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-muted-foreground">Skills:</span>
                              <span className={`font-medium ${getMatchColor(candidate.matchDetails?.skillsMatch || 0)}`}>
                                {candidate.matchDetails?.skillsMatch}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="h-4 w-4 text-blue-500" />
                              <span className="text-muted-foreground">Experience:</span>
                              <span className={`font-medium ${getMatchColor(candidate.matchDetails?.experienceMatch || 0)}`}>
                                {candidate.matchDetails?.experienceMatch}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <GraduationCap className="h-4 w-4 text-purple-500" />
                              <span className="text-muted-foreground">Education:</span>
                              <span className={`font-medium ${getMatchColor(candidate.matchDetails?.educationMatch || 0)}`}>
                                {candidate.matchDetails?.educationMatch}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-green-500" />
                              <span className="text-muted-foreground">Location:</span>
                              <span className={`font-medium ${candidate.matchDetails?.locationMatch ? "text-green-600" : "text-red-600"}`}>
                                {candidate.matchDetails?.locationMatch ? "Match" : "Different"}
                              </span>
                            </div>
                          </div>

                          {/* Skills Preview */}
                          {candidate.skills && candidate.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {candidate.skills.slice(0, 6).map((skill) => {
                                const isMatched = candidate.matchedSkills?.find(
                                  (ms) => ms.skill.toLowerCase() === skill.toLowerCase()
                                )?.matched;
                                return (
                                  <Badge
                                    key={skill}
                                    variant={isMatched ? "default" : "outline"}
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                );
                              })}
                              {candidate.skills.length > 6 && (
                                <Badge variant="outline" className="text-xs">
                                  +{candidate.skills.length - 6} more
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Applied Date */}
                          <p className="text-xs text-muted-foreground mt-2">
                            Applied {new Date(candidate.appliedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate Detail Dialog */}
      {selectedCandidate && (
        <Dialog open={true} onOpenChange={() => setSelectedCandidate(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCandidate.firstName || ""} {selectedCandidate.lastName || "Unknown"}
              </DialogTitle>
              <DialogDescription>
                {selectedCandidate.headline || "Candidate Profile"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* AI Match Score Component */}
              {selectedCandidate.matchedSkills && (
                <AIMatchScore
                  score={selectedCandidate.matchScore}
                  matchedSkills={selectedCandidate.matchedSkills}
                  jobTitle={job.title}
                />
              )}

              {/* Match Breakdown Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Match Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Skills Match</span>
                      <span className={`text-sm font-bold ${getMatchColor(selectedCandidate.matchDetails?.skillsMatch || 0)}`}>
                        {selectedCandidate.matchDetails?.skillsMatch}%
                      </span>
                    </div>
                    <Progress value={selectedCandidate.matchDetails?.skillsMatch || 0} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Experience Match</span>
                      <span className={`text-sm font-bold ${getMatchColor(selectedCandidate.matchDetails?.experienceMatch || 0)}`}>
                        {selectedCandidate.matchDetails?.experienceMatch}%
                      </span>
                    </div>
                    <Progress value={selectedCandidate.matchDetails?.experienceMatch || 0} className="h-2" />
                    {selectedCandidate.yearsOfExperience && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedCandidate.yearsOfExperience} years of experience
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Education Match</span>
                      <span className={`text-sm font-bold ${getMatchColor(selectedCandidate.matchDetails?.educationMatch || 0)}`}>
                        {selectedCandidate.matchDetails?.educationMatch}%
                      </span>
                    </div>
                    <Progress value={selectedCandidate.matchDetails?.educationMatch || 0} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Location Match</span>
                      <Badge variant={selectedCandidate.matchDetails?.locationMatch ? "default" : "secondary"}>
                        {selectedCandidate.matchDetails?.locationMatch ? "Match" : "Different Location"}
                      </Badge>
                    </div>
                    {selectedCandidate.location && (
                      <p className="text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {selectedCandidate.location}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bio */}
              {selectedCandidate.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Professional Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedCandidate.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Availability & Preferences */}
              {selectedCandidate.availability && (() => {
                try {
                  const availData = selectedCandidate.availability.startsWith('{')
                    ? JSON.parse(selectedCandidate.availability)
                    : null;

                  if (!availData) {
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Availability
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{selectedCandidate.availability}</p>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Availability & Preferences
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Start Date</p>
                          <Badge variant="outline" className="capitalize">
                            {availData.startDate.replace(/-/g, ' ')}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Employment Type Preferences</p>
                          <div className="flex flex-wrap gap-2">
                            {availData.preferences?.fullTime && <Badge>Full-time</Badge>}
                            {availData.preferences?.partTime && <Badge>Part-time</Badge>}
                            {availData.preferences?.contract && <Badge>Contract</Badge>}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Work Location Preferences</p>
                          <div className="flex flex-wrap gap-2">
                            {availData.preferences?.remote && <Badge variant="secondary">Remote</Badge>}
                            {availData.preferences?.hybrid && <Badge variant="secondary">Hybrid</Badge>}
                            {availData.preferences?.onsite && <Badge variant="secondary">On-site</Badge>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium mb-1 flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Weekly Hours
                            </p>
                            <p className="text-sm text-muted-foreground">{availData.weeklyHours} hours/week</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Timezone</p>
                            <p className="text-sm text-muted-foreground">{availData.timezone}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                } catch (e) {
                  return null;
                }
              })()}

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1">Contact Candidate</Button>
                <Button variant="outline" className="flex-1">View Full Profile</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
