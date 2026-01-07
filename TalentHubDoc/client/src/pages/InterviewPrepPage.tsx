import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InterviewQuestions } from "@/components/InterviewQuestions";
import { ChatBot } from "@/components/ChatBot";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Sparkles, MessageSquare, Briefcase, Edit3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

// todo: remove mock functionality
const mockQuestions = [
  {
    id: "1",
    question: "Can you explain the difference between React's useState and useReducer hooks? When would you choose one over the other?",
    category: "technical" as const,
    difficulty: "medium" as const,
  },
  {
    id: "2",
    question: "Tell me about a time when you had to work with a difficult team member. How did you handle it?",
    category: "behavioral" as const,
    difficulty: "medium" as const,
  },
  {
    id: "3",
    question: "How would you optimize a React application that's experiencing performance issues?",
    category: "technical" as const,
    difficulty: "hard" as const,
  },
  {
    id: "4",
    question: "If you were given a tight deadline and had to choose between code quality and delivery, what would you do?",
    category: "situational" as const,
    difficulty: "easy" as const,
  },
  {
    id: "5",
    question: "Describe your experience with state management libraries. Which do you prefer and why?",
    category: "technical" as const,
    difficulty: "medium" as const,
  },
  {
    id: "6",
    question: "How do you stay updated with the latest frontend technologies and best practices?",
    category: "behavioral" as const,
    difficulty: "easy" as const,
  },
];

export function InterviewPrepPage() {
  const { user } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [customJobTitle, setCustomJobTitle] = useState<string>("");
  const [customCompany, setCustomCompany] = useState<string>("");
  const [customJobDescription, setCustomJobDescription] = useState<string>("");
  const [jobInputMode, setJobInputMode] = useState<"applications" | "custom">("custom");
  const [questionType, setQuestionType] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [questions, setQuestions] = useState(mockQuestions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});

  // Fetch candidate's applications with job details
  const { data: applicationsData } = useQuery({
    queryKey: ["/api/applications/me/with-jobs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/applications/me");
      const data = await res.json();
      // Handle both array and object formats
      const apps = Array.isArray(data) ? data : (data?.applications || []);

      // Fetch job details for each application
      const appsWithJobs = await Promise.all(
        apps.map(async (app: any) => {
          try {
            const jobRes = await apiRequest("GET", `/api/jobs/${app.jobId}`);
            const job = await jobRes.json();
            return { ...app, job };
          } catch {
            return { ...app, job: null };
          }
        })
      );
      return appsWithJobs;
    },
    enabled: !!user,
  });

  const applications = applicationsData || [];

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const handleGenerateQuestions = async () => {
    if (!user) return;

    // Validate inputs based on mode
    if (jobInputMode === "applications" && !selectedJobId) return;
    if (jobInputMode === "custom" && !customJobTitle.trim()) return;

    try {
      setIsGenerating(true);

      let requestBody: any = {
        candidateId: user.id,
      };

      if (jobInputMode === "applications") {
        requestBody.jobId = selectedJobId;
      } else {
        requestBody.jobTitle = customJobTitle;
        requestBody.company = customCompany || "the company";
        if (customJobDescription.trim()) {
          // Extract skills from job description (simple approach)
          const skills = customJobDescription
            .split(/[,\n;]/)
            .map(s => s.trim())
            .filter(Boolean)
            .slice(0, 10);
          requestBody.skills = skills;
        }
      }

      const res = await apiRequest("POST", "/api/interview/generate", requestBody);
      const data = await res.json();
      if (Array.isArray(data.questions)) {
        setQuestions(data.questions);
        // Reset practice answers when generating new questions
        setPracticeAnswers({});
      }
    } catch (error) {
      console.error("Failed to generate questions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedApplication = applications.find((app: any) => app.jobId === selectedJobId);
  const displayJobTitle = jobInputMode === "applications"
    ? (selectedApplication?.job?.title || "No job selected")
    : (customJobTitle || "Custom Job");

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          userRole="candidate"
          userName="Sarah Johnson"
          onLogout={() => console.log("Logging out...")}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b p-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Interview Preparation</h1>
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
            <div className="max-w-5xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Generate Interview Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs value={jobInputMode} onValueChange={(v) => setJobInputMode(v as "applications" | "custom")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="custom">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Enter Job Details
                      </TabsTrigger>
                      <TabsTrigger value="applications">
                        <Briefcase className="h-4 w-4 mr-2" />
                        My Applications
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="custom" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="customJobTitle">Job Title *</Label>
                        <Input
                          id="customJobTitle"
                          value={customJobTitle}
                          onChange={(e) => setCustomJobTitle(e.target.value)}
                          placeholder="e.g., Senior Full Stack Developer"
                          data-testid="input-custom-job-title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customCompany">Company Name (Optional)</Label>
                        <Input
                          id="customCompany"
                          value={customCompany}
                          onChange={(e) => setCustomCompany(e.target.value)}
                          placeholder="e.g., Google, Microsoft, Startup XYZ"
                          data-testid="input-custom-company"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customJobDescription">
                          Job Description / Required Skills (Optional)
                        </Label>
                        <Textarea
                          id="customJobDescription"
                          value={customJobDescription}
                          onChange={(e) => setCustomJobDescription(e.target.value)}
                          placeholder="Paste job description or list required skills (React, Node.js, TypeScript, etc.)"
                          className="min-h-32"
                          data-testid="textarea-custom-job-description"
                        />
                        <p className="text-xs text-muted-foreground">
                          Add job description or skills to get more relevant technical questions
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="applications" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="jobSelect">Select a Job You Applied For</Label>
                        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                          <SelectTrigger data-testid="select-job">
                            <SelectValue placeholder="Select a job..." />
                          </SelectTrigger>
                          <SelectContent>
                            {applications.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No applications found
                              </SelectItem>
                            ) : (
                              applications.map((app: any) => (
                                <SelectItem key={app.id} value={app.jobId}>
                                  {app.job?.title || "Unknown Job"} - {app.job?.company || "Unknown Company"}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {applications.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            You haven't applied to any jobs yet. Switch to "Enter Job Details" to generate questions for any role.
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="questionType">Question Type</Label>
                      <Select value={questionType} onValueChange={setQuestionType}>
                        <SelectTrigger data-testid="select-question-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="company">Company-Specific</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger data-testid="select-difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Difficulties</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateQuestions}
                    disabled={
                      isGenerating ||
                      (jobInputMode === "applications" && !selectedJobId) ||
                      (jobInputMode === "custom" && !customJobTitle.trim())
                    }
                    className="w-full gap-2"
                    data-testid="button-generate"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGenerating ? "Generating..." : "Generate Questions"}
                  </Button>
                </CardContent>
              </Card>

              <InterviewQuestions
                jobTitle={displayJobTitle}
                questions={questions}
                onGenerateMore={handleGenerateQuestions}
                isGenerating={isGenerating}
                practiceAnswers={practiceAnswers}
                onPracticeAnswerChange={setPracticeAnswers}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Interview Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg space-y-2">
                      <h3 className="font-medium">Before the Interview</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>Research the company thoroughly</li>
                        <li>Review the job description</li>
                        <li>Prepare your STAR stories</li>
                        <li>Practice with these questions</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg space-y-2">
                      <h3 className="font-medium">During the Interview</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>Take time to think before answering</li>
                        <li>Ask clarifying questions</li>
                        <li>Use specific examples</li>
                        <li>Show enthusiasm for the role</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
      <ChatBot />
    </SidebarProvider>
  );
}
