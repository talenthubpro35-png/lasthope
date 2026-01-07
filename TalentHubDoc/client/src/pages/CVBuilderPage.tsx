import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CVPreview } from "@/components/CVPreview";
import { ChatBot } from "@/components/ChatBot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, X, Sparkles, Eye, Edit, Download, Save } from "lucide-react";
import { SmartSuggestions } from "@/components/SmartSuggestions";

// todo: remove mock functionality
const initialCVData = {
  name: "Sarah Johnson",
  title: "Senior Full Stack Developer",
  email: "sarah.johnson@email.com",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA",
  website: "sarahjohnson.dev",
  linkedin: "linkedin.com/in/sarahjohnson",
  summary: "Experienced Full Stack Developer with 6+ years of expertise in building scalable web applications. Passionate about clean code, user experience, and mentoring junior developers.",
  skills: ["React", "TypeScript", "Node.js", "Python", "PostgreSQL", "AWS", "Docker"],
  experience: [
    {
      title: "Senior Full Stack Developer",
      company: "TechCorp Inc.",
      duration: "2021 - Present",
      description: [
        "Led development of a microservices architecture serving 1M+ daily users",
        "Mentored a team of 5 junior developers",
      ],
    },
    {
      title: "Full Stack Developer",
      company: "StartupXYZ",
      duration: "2018 - 2021",
      description: [
        "Built and maintained React-based SPA with 50+ components",
        "Designed RESTful APIs handling 10K+ requests per minute",
      ],
    },
  ],
  education: [
    {
      degree: "M.S. Computer Science",
      institution: "Stanford University",
      year: "2018",
    },
    {
      degree: "B.S. Computer Science",
      institution: "UC Berkeley",
      year: "2016",
    },
  ],
  certifications: [],
  projects: [],
  languages: [],
  volunteer: [],
  awards: [],
  publications: [],
  courses: [],
};

export function CVBuilderPage() {
  const [cvData, setCVData] = useState(initialCVData);
  const [activeTab, setActiveTab] = useState("edit");
  const [newSkill, setNewSkill] = useState("");
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch candidate data
  const { data: candidateProfile } = useQuery<any>({
    queryKey: ["/api/candidates/me"],
    retry: false,
  });

  // Fetch user data for email/phone
  const { data: userData } = useQuery<any>({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Update CV data when candidate profile loads
  useEffect(() => {
    if (candidateProfile) {
      try {
        // Parse all JSON fields
        let experience = [];
        let education = [];
        let certifications = [];
        let projects = [];
        let languages = [];
        let volunteer = [];
        let awards = [];
        let publications = [];
        let courses = [];

        const parseField = (field: string, fieldName: string) => {
          if (field) {
            try {
              return JSON.parse(field);
            } catch (err) {
              console.error(`Error parsing ${fieldName}:`, err);
              return [];
            }
          }
          return [];
        };

        experience = parseField(candidateProfile.experienceDetails, "experience");
        education = parseField(candidateProfile.educationDetails, "education");
        certifications = parseField(candidateProfile.certificationsDetails, "certifications");
        projects = parseField(candidateProfile.projectsDetails, "projects");
        languages = parseField(candidateProfile.languagesDetails, "languages");
        volunteer = parseField(candidateProfile.volunteerDetails, "volunteer");
        awards = parseField(candidateProfile.awardsDetails, "awards");
        publications = parseField(candidateProfile.publicationsDetails, "publications");
        courses = parseField(candidateProfile.coursesDetails, "courses");

        setCVData({
          name: `${candidateProfile.firstName || ""} ${candidateProfile.lastName || ""}`.trim() || "Your Name",
          title: candidateProfile.headline || "Your Professional Title",
          email: userData?.email || "",
          phone: userData?.phone || "",
          location: candidateProfile.location || "",
          website: "",
          linkedin: "",
          summary: candidateProfile.bio || "Add your professional summary...",
          skills: candidateProfile.skills || [],
          experience: experience.length > 0 ? experience : initialCVData.experience,
          education: education.length > 0 ? education : initialCVData.education,
          certifications: certifications,
          projects: projects,
          languages: languages,
          volunteer: volunteer,
          awards: awards,
          publications: publications,
          courses: courses,
        });
      } catch (err) {
        console.error("Error loading CV data:", err);
      }
    }
  }, [candidateProfile, user, userData]);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !cvData.skills.includes(newSkill.trim())) {
      setCVData({ ...cvData, skills: [...cvData.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setCVData({ ...cvData, skills: cvData.skills.filter((s) => s !== skill) });
  };

  const handleGenerateWithAI = () => {
    // todo: remove mock functionality
    console.log("Generating CV with AI...");
    setCVData({
      ...cvData,
      summary: "Results-driven Full Stack Developer with 6+ years of experience building high-performance web applications. Expert in React, TypeScript, and Node.js with a proven track record of leading development teams and delivering scalable solutions. Passionate about clean code architecture and continuous learning.",
    });
  };

  const handleDownloadCV = async () => {
    try {
      const response = await fetch("/api/candidates/cv/download", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download CV");
      }

      // Get filename from header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "CV.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success!",
        description: "Your CV has been downloaded successfully.",
      });
    } catch (err) {
      console.error("Download error:", err);
      toast({
        title: "Error",
        description: "Failed to download CV. Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/candidates/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save CV");
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh candidate data after successful save
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/me"] });
      toast({
        title: "Success!",
        description: "Your CV has been saved successfully.",
      });
    },
    onError: (err) => {
      console.error("Save error:", err);
      toast({
        title: "Error",
        description: "Failed to save CV. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveCV = async () => {
    // Parse name into firstName and lastName
    const nameParts = cvData.name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    saveMutation.mutate({
      firstName,
      lastName,
      headline: cvData.title,
      bio: cvData.summary,
      location: cvData.location,
      skills: cvData.skills,
      experienceDetails: JSON.stringify(cvData.experience),
      educationDetails: JSON.stringify(cvData.education),
      certificationsDetails: JSON.stringify(cvData.certifications),
      projectsDetails: JSON.stringify(cvData.projects),
      languagesDetails: JSON.stringify(cvData.languages),
      volunteerDetails: JSON.stringify(cvData.volunteer),
      awardsDetails: JSON.stringify(cvData.awards),
      publicationsDetails: JSON.stringify(cvData.publications),
      coursesDetails: JSON.stringify(cvData.courses),
    });
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
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-lg font-semibold">CV Builder</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-6">
                  <TabsList>
                    <TabsTrigger value="edit" className="gap-2" data-testid="tab-edit">
                      <Edit className="h-4 w-4" />
                      Edit
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-2" data-testid="tab-preview">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveCV}
                      variant="outline"
                      className="gap-2"
                      disabled={saveMutation.isPending}
                      data-testid="button-save-cv"
                    >
                      <Save className="h-4 w-4" />
                      {saveMutation.isPending ? "Saving..." : "Save CV"}
                    </Button>
                    <Button onClick={handleGenerateWithAI} className="gap-2" data-testid="button-ai-enhance">
                      <Sparkles className="h-4 w-4" />
                      Enhance with AI
                    </Button>
                  </div>
                </div>

                <TabsContent value="edit" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className="space-y-6 lg:col-span-1">
                      <Card>
                        <CardHeader>
                          <CardTitle>Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Full Name</Label>
                              <Input
                                id="name"
                                value={cvData.name}
                                onChange={(e) => setCVData({ ...cvData, name: e.target.value })}
                                data-testid="input-cv-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="title">Job Title</Label>
                              <Input
                                id="title"
                                value={cvData.title}
                                onChange={(e) => setCVData({ ...cvData, title: e.target.value })}
                                data-testid="input-cv-title"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={cvData.email}
                                onChange={(e) => setCVData({ ...cvData, email: e.target.value })}
                                data-testid="input-cv-email"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone</Label>
                              <Input
                                id="phone"
                                value={cvData.phone}
                                onChange={(e) => setCVData({ ...cvData, phone: e.target.value })}
                                data-testid="input-cv-phone"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              value={cvData.location}
                              onChange={(e) => setCVData({ ...cvData, location: e.target.value })}
                              data-testid="input-cv-location"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="website">Website</Label>
                              <Input
                                id="website"
                                value={cvData.website}
                                onChange={(e) => setCVData({ ...cvData, website: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="linkedin">LinkedIn</Label>
                              <Input
                                id="linkedin"
                                value={cvData.linkedin}
                                onChange={(e) => setCVData({ ...cvData, linkedin: e.target.value })}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Professional Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={cvData.summary}
                            onChange={(e) => setCVData({ ...cvData, summary: e.target.value })}
                            className="min-h-32"
                            placeholder="Write a brief summary of your professional background..."
                            data-testid="textarea-cv-summary"
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Skills</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex gap-2">
                            <Input
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              placeholder="Add a skill"
                              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                              data-testid="input-cv-skill"
                            />
                            <Button onClick={handleAddSkill} variant="outline" data-testid="button-add-cv-skill">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {cvData.skills.map((skill) => (
                              <Badge key={skill} variant="secondary" className="gap-1">
                                {skill}
                                <button onClick={() => handleRemoveSkill(skill)}>
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <CardTitle>Experience</CardTitle>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {cvData.experience.map((exp, index) => (
                            <div key={index} className="p-4 border rounded-lg space-y-2">
                              <div className="flex justify-between">
                                <div>
                                  <p className="font-medium">{exp.title}</p>
                                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                                </div>
                                <span className="text-sm text-muted-foreground">{exp.duration}</span>
                              </div>
                              {exp.description && Array.isArray(exp.description) && (
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {exp.description.map((item, i) => (
                                    <li key={i}>{item}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <CardTitle>Education</CardTitle>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {cvData.education.map((edu, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <div className="flex justify-between">
                                <div>
                                  <p className="font-medium">{edu.degree}</p>
                                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                                </div>
                                <span className="text-sm text-muted-foreground">{edu.year}</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <CardTitle>Certifications</CardTitle>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {cvData.certifications.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No certifications added yet</p>
                          ) : (
                            cvData.certifications.map((cert: any, index: number) => (
                              <div key={index} className="p-4 border rounded-lg">
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-medium">{cert.name}</p>
                                    <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                                    {cert.credentialId && (
                                      <p className="text-xs text-muted-foreground mt-1">ID: {cert.credentialId}</p>
                                    )}
                                  </div>
                                  <span className="text-sm text-muted-foreground">{cert.date}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <CardTitle>Projects</CardTitle>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {cvData.projects.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No projects added yet</p>
                          ) : (
                            cvData.projects.map((project: any, index: number) => (
                              <div key={index} className="p-4 border rounded-lg space-y-2">
                                <div className="flex justify-between">
                                  <p className="font-medium">{project.title}</p>
                                  {project.date && <span className="text-sm text-muted-foreground">{project.date}</span>}
                                </div>
                                {project.description && (
                                  <p className="text-sm text-muted-foreground">{project.description}</p>
                                )}
                                {project.technologies && project.technologies.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {project.technologies.map((tech: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-xs">{tech}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <CardTitle>Languages</CardTitle>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {cvData.languages.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No languages added yet</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              {cvData.languages.map((lang: any, index: number) => (
                                <div key={index} className="p-3 border rounded-lg">
                                  <p className="font-medium">{lang.language}</p>
                                  <p className="text-sm text-muted-foreground">{lang.proficiency}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <CardTitle>Volunteer Experience</CardTitle>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {cvData.volunteer.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No volunteer experience added yet</p>
                          ) : (
                            cvData.volunteer.map((vol: any, index: number) => (
                              <div key={index} className="p-4 border rounded-lg space-y-2">
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-medium">{vol.role}</p>
                                    <p className="text-sm text-muted-foreground">{vol.organization}</p>
                                  </div>
                                  <span className="text-sm text-muted-foreground">{vol.duration}</span>
                                </div>
                                {vol.description && (
                                  <p className="text-sm text-muted-foreground">{vol.description}</p>
                                )}
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <CardTitle>Awards & Honors</CardTitle>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {cvData.awards.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No awards added yet</p>
                          ) : (
                            cvData.awards.map((award: any, index: number) => (
                              <div key={index} className="p-4 border rounded-lg space-y-2">
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-medium">{award.title}</p>
                                    <p className="text-sm text-muted-foreground">{award.issuer}</p>
                                  </div>
                                  <span className="text-sm text-muted-foreground">{award.date}</span>
                                </div>
                                {award.description && (
                                  <p className="text-sm text-muted-foreground">{award.description}</p>
                                )}
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <CardTitle>Publications</CardTitle>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {cvData.publications.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No publications added yet</p>
                          ) : (
                            cvData.publications.map((pub: any, index: number) => (
                              <div key={index} className="p-4 border rounded-lg space-y-2">
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-medium">{pub.title}</p>
                                    <p className="text-sm text-muted-foreground">{pub.publisher}</p>
                                  </div>
                                  <span className="text-sm text-muted-foreground">{pub.date}</span>
                                </div>
                                {pub.description && (
                                  <p className="text-sm text-muted-foreground">{pub.description}</p>
                                )}
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                          <CardTitle>Courses</CardTitle>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {cvData.courses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No courses added yet</p>
                          ) : (
                            cvData.courses.map((course: any, index: number) => (
                              <div key={index} className="p-4 border rounded-lg">
                                <div className="flex justify-between">
                                  <div>
                                    <p className="font-medium">{course.name}</p>
                                    <p className="text-sm text-muted-foreground">{course.institution}</p>
                                  </div>
                                  <span className="text-sm text-muted-foreground">{course.date}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Smart Suggestions Sidebar */}
                    <div className="lg:col-span-2 xl:col-span-1">
                      <SmartSuggestions cvData={cvData} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-0">
                  <CVPreview
                    data={cvData}
                    onDownload={handleDownloadCV}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
      <ChatBot />
    </SidebarProvider>
  );
}
