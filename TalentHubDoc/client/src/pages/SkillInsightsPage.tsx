import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SkillRecommendations } from "@/components/SkillRecommendations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ai, skillInsights } from "@/lib/api";
import {
  Bell,
  Sparkles,
  TrendingUp,
  Target,
  Award,
  BookOpen,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Brain,
  Lightbulb,
  Rocket,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Zap,
  DollarSign,
  Clock,
  Building,
  Search,
  RefreshCw,
} from "lucide-react";

// Type definitions
interface CandidateProfile {
  id?: string;
  skills?: string[];
  yearsOfExperience?: number;
  headline?: string;
  firstName?: string;
  lastName?: string;
}

interface SkillRecommendation {
  id: string;
  skill: string;
  relevance: number;
  demandTrend: "rising" | "stable" | "declining";
  category: string;
  reason?: string;
  resources?: { title: string; url: string }[];
}

interface RecommendationsResponse {
  basedOn: string;
  targetRole?: string;
  aiPowered: boolean;
  recommendations: SkillRecommendation[];
}

export function SkillInsightsPage() {
  const { user, logout } = useAuth();
  const [targetRole, setTargetRole] = useState<string>("");
  const [showGapAnalysis, setShowGapAnalysis] = useState(false);

  // Fetch AI status
  const { data: aiStatus } = useQuery({
    queryKey: ["/api/skills/ai-status"],
    queryFn: () => skillInsights.getAIStatus(),
    retry: false,
  });

  // Fetch candidate profile
  const { data: candidateProfile, isLoading: isLoadingProfile } = useQuery<CandidateProfile>({
    queryKey: ["/api/candidates/me"],
    retry: false,
  });

  // Fetch skill recommendations if candidate has skills
  const { data: recommendations, isLoading: isLoadingRecommendations, refetch: refetchRecommendations } = useQuery<RecommendationsResponse>({
    queryKey: ["/api/recommendations/skills", candidateProfile?.skills],
    enabled: !!candidateProfile?.skills?.length,
    retry: false,
    queryFn: async () => {
      const response = await ai.getSkillRecommendations(
        candidateProfile?.skills || [],
        "career growth"
      );
      return response as RecommendationsResponse;
    },
  });

  // Fetch market demand for candidate's skills
  const { data: marketDemand, isLoading: isLoadingMarketDemand, refetch: refetchMarketDemand } = useQuery({
    queryKey: ["/api/skills/market-demand", candidateProfile?.skills],
    enabled: !!candidateProfile?.skills?.length,
    retry: false,
    queryFn: async () => {
      return skillInsights.getMarketDemand(candidateProfile?.skills || []);
    },
  });

  // Fetch career paths
  const { data: careerPaths, isLoading: isLoadingCareerPaths, refetch: refetchCareerPaths } = useQuery({
    queryKey: ["/api/skills/career-paths", candidateProfile?.skills, candidateProfile?.yearsOfExperience],
    enabled: !!candidateProfile?.skills?.length,
    retry: false,
    queryFn: async () => {
      return skillInsights.getCareerPaths(
        candidateProfile?.skills || [],
        candidateProfile?.yearsOfExperience,
        candidateProfile?.headline
      );
    },
  });

  // Fetch skill gap analysis (on demand)
  const { data: skillGapAnalysis, isLoading: isLoadingGapAnalysis, refetch: refetchGapAnalysis } = useQuery({
    queryKey: ["/api/skills/gap-analysis", candidateProfile?.skills, targetRole],
    enabled: showGapAnalysis && !!targetRole && !!candidateProfile?.skills?.length,
    retry: false,
    queryFn: async () => {
      return skillInsights.getSkillGapAnalysis(candidateProfile?.skills || [], targetRole);
    },
  });

  // Fetch available jobs to analyze market demand
  const { data: availableJobs } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
    retry: false,
  });

  // Calculate skill statistics
  const skillStats = useMemo(() => {
    if (!candidateProfile?.skills || !availableJobs) {
      return {
        totalSkills: 0,
        inDemandSkills: 0,
        skillCoverage: 0,
        topDemandSkills: [],
      };
    }

    const candidateSkills = candidateProfile.skills || [];
    const totalSkills = candidateSkills.length;

    // Analyze job market to find skill demand
    const skillDemandMap = new Map<string, number>();
    availableJobs.forEach((job: any) => {
      const jobSkills = job.requiredSkills || [];
      jobSkills.forEach((skill: string) => {
        const lowerSkill = skill.toLowerCase();
        skillDemandMap.set(lowerSkill, (skillDemandMap.get(lowerSkill) || 0) + 1);
      });
    });

    // Count how many candidate skills are in demand
    const inDemandSkills = candidateSkills.filter((skill: string) =>
      skillDemandMap.has(skill.toLowerCase())
    ).length;

    // Calculate average skill coverage across jobs
    const coverageScores = availableJobs.map((job: any) => {
      const jobSkills = job.requiredSkills || [];
      const matchedSkills = jobSkills.filter((skill: string) =>
        candidateSkills.some((cs: string) => cs.toLowerCase() === skill.toLowerCase())
      );
      return jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * 100 : 0;
    });
    const avgCoverage = coverageScores.length > 0
      ? Math.round(coverageScores.reduce((a, b) => a + b, 0) / coverageScores.length)
      : 0;

    // Get top 5 most demanded skills
    const topDemandSkills = Array.from(skillDemandMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count]) => ({
        skill,
        count,
        hasSkill: candidateSkills.some((cs: string) => cs.toLowerCase() === skill.toLowerCase()),
      }));

    return {
      totalSkills,
      inDemandSkills,
      skillCoverage: avgCoverage,
      topDemandSkills,
    };
  }, [candidateProfile?.skills, availableJobs]);

  // Group skills by category (simple categorization based on common patterns)
  const categorizedSkills = useMemo(() => {
    if (!candidateProfile?.skills) return {};

    const categories: Record<string, string[]> = {
      "Programming Languages": [],
      "Frameworks & Libraries": [],
      "Cloud & DevOps": [],
      "Databases": [],
      "Tools & Platforms": [],
      "Soft Skills": [],
      "Other": [],
    };

    const programmingLanguages = ["javascript", "python", "java", "typescript", "c++", "c#", "ruby", "go", "rust", "php", "swift", "kotlin"];
    const frameworks = ["react", "angular", "vue", "node", "express", "django", "flask", "spring", "laravel", "rails"];
    const cloudDevOps = ["aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "ci/cd", "terraform", "ansible"];
    const databases = ["sql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "dynamodb"];
    const tools = ["git", "jira", "figma", "slack", "vscode", "postman"];
    const softSkills = ["communication", "leadership", "teamwork", "problem solving", "critical thinking", "agile", "scrum"];

    candidateProfile.skills.forEach((skill: string) => {
      const lowerSkill = skill.toLowerCase();

      if (programmingLanguages.some(lang => lowerSkill.includes(lang))) {
        categories["Programming Languages"].push(skill);
      } else if (frameworks.some(fw => lowerSkill.includes(fw))) {
        categories["Frameworks & Libraries"].push(skill);
      } else if (cloudDevOps.some(cd => lowerSkill.includes(cd))) {
        categories["Cloud & DevOps"].push(skill);
      } else if (databases.some(db => lowerSkill.includes(db))) {
        categories["Databases"].push(skill);
      } else if (tools.some(tool => lowerSkill.includes(tool))) {
        categories["Tools & Platforms"].push(skill);
      } else if (softSkills.some(ss => lowerSkill.includes(ss))) {
        categories["Soft Skills"].push(skill);
      } else {
        categories["Other"].push(skill);
      }
    });

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, skills]) => skills.length > 0)
    );
  }, [candidateProfile?.skills]);

  const handleGapAnalysis = () => {
    if (targetRole.trim()) {
      setShowGapAnalysis(true);
      refetchGapAnalysis();
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const getDemandBadgeColor = (demand: string) => {
    switch (demand) {
      case "high": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "rising": return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "stable": return <ArrowRight className="h-4 w-4 text-yellow-600" />;
      case "declining": return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return null;
    }
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
                <BarChart3 className="h-5 w-5" />
                <h1 className="text-xl font-semibold">Skill Insights</h1>
              </div>
              {aiStatus && (
                <Badge variant={aiStatus.geminiAvailable ? "default" : "secondary"} className="ml-2">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {aiStatus.provider}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header Section */}
              <div>
                <h2 className="text-3xl font-bold mb-2">Your Skill Insights</h2>
                <p className="text-muted-foreground">
                  AI-powered analysis of your skills and career growth opportunities
                </p>
              </div>

              {/* Stats Cards */}
              {isLoadingProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-16" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
                      <Brain className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{skillStats.totalSkills}</div>
                      <p className="text-xs text-muted-foreground">
                        Skills in your profile
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">In-Demand Skills</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{skillStats.inDemandSkills}</div>
                      <p className="text-xs text-muted-foreground">
                        Skills matching job market
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Market Coverage</CardTitle>
                      <Target className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{skillStats.skillCoverage}%</div>
                      <p className="text-xs text-muted-foreground">
                        Average job requirement match
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Career Paths</CardTitle>
                      <Briefcase className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {careerPaths?.careerPaths?.length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        AI-suggested career options
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Main Content Tabs */}
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
                  <TabsTrigger value="market">Market Analysis</TabsTrigger>
                  <TabsTrigger value="career-paths">Career Paths</TabsTrigger>
                  <TabsTrigger value="gap-analysis">Skill Gap</TabsTrigger>
                  <TabsTrigger value="categories">By Category</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Current Skills */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Your Skills
                        </CardTitle>
                        <CardDescription>
                          All skills in your profile
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingProfile ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-6 w-full" />
                            ))}
                          </div>
                        ) : candidateProfile?.skills?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {candidateProfile.skills.map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-sm">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              No skills added yet. Update your profile to add skills.
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>

                    {/* Skill Coverage */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Skill Coverage Analysis
                        </CardTitle>
                        <CardDescription>
                          How well your skills match the job market
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Overall Market Coverage</span>
                            <span className="font-medium">{skillStats.skillCoverage}%</span>
                          </div>
                          <Progress value={skillStats.skillCoverage} className="h-3" />
                        </div>

                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Performance Rating</p>
                          {skillStats.skillCoverage >= 70 ? (
                            <div className="flex items-start gap-2 text-sm text-green-600">
                              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium">Excellent coverage!</p>
                                <p className="text-muted-foreground">
                                  Your skills match most job requirements well
                                </p>
                              </div>
                            </div>
                          ) : skillStats.skillCoverage >= 40 ? (
                            <div className="flex items-start gap-2 text-sm text-yellow-600">
                              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium">Good foundation</p>
                                <p className="text-muted-foreground">
                                  Consider learning additional in-demand skills
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 text-sm text-red-600">
                              <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium">Room for growth</p>
                                <p className="text-muted-foreground">
                                  Focus on building key skills for your target roles
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* AI Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">AI-Powered Skill Recommendations</h3>
                    <Button variant="outline" size="sm" onClick={() => refetchRecommendations()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                  {isLoadingRecommendations ? (
                    <Card>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : recommendations?.recommendations?.length ? (
                    <SkillRecommendations
                      recommendations={recommendations.recommendations}
                      basedOn={recommendations.basedOn || "career growth"}
                    />
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <Rocket className="h-16 w-16 text-muted-foreground mb-4" />
                        <CardTitle className="text-xl mb-2">No Recommendations Yet</CardTitle>
                        <CardDescription className="text-center max-w-md">
                          Add skills to your profile to get personalized AI-powered skill recommendations
                          based on market trends and your career goals.
                        </CardDescription>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Market Analysis Tab */}
                <TabsContent value="market" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">AI Market Demand Analysis</h3>
                    <Button variant="outline" size="sm" onClick={() => refetchMarketDemand()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {isLoadingMarketDemand ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-48" />
                      ))}
                    </div>
                  ) : marketDemand?.insights?.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {marketDemand.insights.map((insight) => (
                        <Card key={insight.skillName}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{insight.skillName}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge className={getDemandBadgeColor(insight.marketDemand)}>
                                  {insight.marketDemand} demand
                                </Badge>
                                {getTrendIcon(insight.demandTrend)}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span>Salary Impact: <strong>{insight.averageSalaryImpact}</strong></span>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1 flex items-center gap-1">
                                <Building className="h-4 w-4" /> Top Industries
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {insight.topIndustries.map((industry) => (
                                  <Badge key={industry} variant="outline" className="text-xs">
                                    {industry}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1 flex items-center gap-1">
                                <Zap className="h-4 w-4" /> Related Skills
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {insight.relatedSkills.slice(0, 4).map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {insight.learningPath && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <GraduationCap className="h-3 w-3 inline mr-1" />
                                {insight.learningPath}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
                        <CardTitle className="text-xl mb-2">No Market Data</CardTitle>
                        <CardDescription className="text-center">
                          Add skills to your profile to see AI-powered market demand analysis
                        </CardDescription>
                      </CardContent>
                    </Card>
                  )}

                  {/* Local Job Market Analysis */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Top In-Demand Skills (Local Jobs)
                      </CardTitle>
                      <CardDescription>
                        Most requested skills in current job postings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {skillStats.topDemandSkills.length > 0 ? (
                        skillStats.topDemandSkills.map((skillData, index) => (
                          <div key={skillData.skill} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium capitalize">{skillData.skill}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Required in {skillData.count} job{skillData.count !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              {skillData.hasSkill ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  You have this
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Consider learning
                                </Badge>
                              )}
                            </div>
                            <Progress
                              value={(skillData.count / (availableJobs?.length || 1)) * 100}
                              className="h-2"
                            />
                          </div>
                        ))
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No job market data available at the moment.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Career Paths Tab */}
                <TabsContent value="career-paths" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">AI-Suggested Career Paths</h3>
                    <Button variant="outline" size="sm" onClick={() => refetchCareerPaths()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>

                  {isLoadingCareerPaths ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-48" />
                      ))}
                    </div>
                  ) : careerPaths?.careerPaths?.length ? (
                    <div className="space-y-4">
                      {careerPaths.careerPaths.map((path, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                                  <Briefcase className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{path.title}</CardTitle>
                                  <CardDescription className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    {path.salaryRange}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">{path.matchScore}%</div>
                                <p className="text-xs text-muted-foreground">Match Score</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  Skills You Have
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {path.requiredSkills.map((skill) => (
                                    <Badge key={skill} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                  <GraduationCap className="h-4 w-4 text-blue-600" />
                                  Skills to Learn
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {path.skillsToLearn.map((skill) => (
                                    <Badge key={skill} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                              <Clock className="h-4 w-4" />
                              <span>Estimated transition time: <strong>{path.estimatedTimeToTransition}</strong></span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
                        <CardTitle className="text-xl mb-2">No Career Paths Yet</CardTitle>
                        <CardDescription className="text-center max-w-md">
                          Add skills to your profile to get personalized career path suggestions
                        </CardDescription>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Skill Gap Analysis Tab */}
                <TabsContent value="gap-analysis" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Skill Gap Analysis
                      </CardTitle>
                      <CardDescription>
                        Enter a target role to see what skills you need to develop
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Senior Software Engineer, Data Scientist, DevOps Engineer"
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleGapAnalysis()}
                        />
                        <Button onClick={handleGapAnalysis} disabled={!targetRole.trim()}>
                          <Search className="h-4 w-4 mr-2" />
                          Analyze
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {isLoadingGapAnalysis && (
                    <Card>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <Skeleton className="h-8 w-1/3" />
                          <Skeleton className="h-32 w-full" />
                          <Skeleton className="h-32 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {skillGapAnalysis?.analysis && !isLoadingGapAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Analysis for: {skillGapAnalysis.analysis.targetRole}</CardTitle>
                        <CardDescription>
                          Current Level: {skillGapAnalysis.analysis.currentLevel}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              Matching Skills ({skillGapAnalysis.analysis.matchingSkills.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {skillGapAnalysis.analysis.matchingSkills.length > 0 ? (
                                skillGapAnalysis.analysis.matchingSkills.map((skill) => (
                                  <Badge key={skill} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">No matching skills found</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <XCircle className="h-5 w-5 text-red-600" />
                              Missing Skills ({skillGapAnalysis.analysis.missingSkills.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {skillGapAnalysis.analysis.missingSkills.map((skill) => (
                                <Badge key={skill} variant="destructive">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-yellow-600" />
                            Recommendations
                          </h4>
                          <ul className="space-y-2">
                            {skillGapAnalysis.analysis.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(categorizedSkills).map(([category, skills]) => (
                      <Card key={category}>
                        <CardHeader>
                          <CardTitle className="text-lg">{category}</CardTitle>
                          <CardDescription>
                            {skills.length} skill{skills.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {skills.map((skill) => (
                              <Badge key={skill} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {Object.keys(categorizedSkills).length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                        <CardTitle className="text-xl mb-2">No Skills Added</CardTitle>
                        <CardDescription className="text-center">
                          Add skills to your profile to see them organized by category
                        </CardDescription>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
