import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, X, Loader2, Briefcase, GraduationCap, MapPin, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Progress } from "@/components/ui/progress";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";

interface Experience {
  title: string;
  company: string;
  duration: string;
  description?: string;
}

interface Education {
  degree: string;
  institution: string;
  year?: string;
  field?: string;
}

interface CandidateProfile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  location: string | null;
  skills: string[] | null;
  experience: number | null;
  yearsOfExperience: number | null;
  experienceDetails: string | null;
  educationDetails: string | null;
  headline: string | null;
  resume_url: string | null;
  expectedSalary: string | null;
  availability: string | null;
}

// Common skills for autocomplete
const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "SQL",
  "AWS", "Docker", "Kubernetes", "Git", "REST API", "GraphQL", "MongoDB",
  "PostgreSQL", "HTML", "CSS", "Tailwind CSS", "Next.js", "Express.js",
  "Vue.js", "Angular", "C++", "C#", ".NET", "Spring Boot", "Django",
  "Flask", "FastAPI", "Machine Learning", "Data Analysis", "Agile", "Scrum"
];

// Common locations
const COMMON_LOCATIONS = [
  "New York, USA", "San Francisco, USA", "London, UK", "Berlin, Germany",
  "Paris, France", "Toronto, Canada", "Sydney, Australia", "Singapore",
  "Tokyo, Japan", "Remote", "Hybrid"
];

export default function CandidateProfileEdit() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    headline: "",
    skills: [] as string[],
    location: "",
    expectedSalary: "",
    availability: "",
    availabilityData: null as any,
    experienceItems: [] as Experience[],
    educationItems: [] as Education[],
  });

  const [newSkill, setNewSkill] = useState("");
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch current profile
  const { data: profile, isLoading } = useQuery<CandidateProfile>({
    queryKey: ["candidate-profile"],
    queryFn: async () => {
      const response = await fetch("/api/candidates/me", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
  });

  // Update form data when profile is loaded
  useEffect(() => {
    if (profile) {
      console.log("Profile loaded, updating form. Profile data:", profile);

      // Parse experience and education from JSON strings
      let experienceItems: Experience[] = [];
      let educationItems: Education[] = [];

      try {
        if (profile.experienceDetails) {
          console.log("Parsing experienceDetails:", profile.experienceDetails);
          experienceItems = JSON.parse(profile.experienceDetails);
          console.log("Parsed experience items:", experienceItems);
        }
      } catch (e) {
        console.error("Failed to parse experience details:", e);
      }

      try {
        if (profile.educationDetails) {
          console.log("Parsing educationDetails:", profile.educationDetails);
          educationItems = JSON.parse(profile.educationDetails);
          console.log("Parsed education items:", educationItems);
        }
      } catch (e) {
        console.error("Failed to parse education details:", e);
      }

      console.log("Setting form data with experience:", experienceItems.length, "education:", educationItems.length);

      // Parse availability data if it exists
      let availabilityData = null;
      try {
        if (profile.availability && profile.availability.startsWith('{')) {
          availabilityData = JSON.parse(profile.availability);
        }
      } catch (e) {
        console.error("Failed to parse availability data:", e);
      }

      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        bio: profile.bio || "",
        headline: profile.headline || "",
        skills: profile.skills || [],
        location: profile.location || "",
        expectedSalary: profile.expectedSalary || "",
        availability: profile.availability || "",
        availabilityData: availabilityData,
        experienceItems,
        educationItems,
      });
      setHasUnsavedChanges(false);
    }
  }, [profile]);

  // Calculate profile completion percentage
  const calculateCompletion = useCallback(() => {
    const fields = [
      formData.firstName,
      formData.lastName,
      formData.bio,
      formData.headline,
      formData.location,
      formData.skills.length > 0,
      formData.experienceItems.length > 0,
      formData.educationItems.length > 0,
      formData.availability,
      profile?.resume_url,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [formData, profile]);

  // Handle resume upload success with AI extracted data
  const handleResumeUploadSuccess = (data: any) => {
    console.log("========== RESUME UPLOAD SUCCESS ==========");
    console.log("Full data received from backend:", data);
    const extractedData = data.extractedData;
    console.log("Extracted data:", extractedData);

    // Count what was extracted
    const extractedFields = [];
    if (extractedData?.name) extractedFields.push("name");
    if (extractedData?.bio) extractedFields.push("bio");
    if (extractedData?.location) extractedFields.push("location");
    if (extractedData?.skills?.length) extractedFields.push(`${extractedData.skills.length} skills`);
    if (extractedData?.experience?.length) extractedFields.push(`${extractedData.experience.length} experience(s)`);
    if (extractedData?.education?.length) extractedFields.push(`${extractedData.education.length} education(s)`);

    console.log("Extracted fields:", extractedFields);

    toast({
      title: "✨ Resume Processed Successfully!",
      description: extractedData
        ? `Extracted: ${extractedFields.join(", ")}. Data will load shortly...`
        : "Resume uploaded. Refreshing profile...",
    });

    // The backend has already saved the data to the database
    // Just refetch the profile and let the useEffect populate the form
    console.log("Invalidating queries to refetch profile...");
    queryClient.invalidateQueries({ queryKey: ["candidate-profile"] });
  };

  // Handle availability save
  const handleAvailabilitySave = (availabilityData: any) => {
    handleFieldChange("availabilityData", availabilityData);
    handleFieldChange("availability", JSON.stringify(availabilityData));
  };

  // Auto-save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/candidates/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          bio: data.bio || null,
          headline: data.headline || null,
          skills: data.skills.length > 0 ? data.skills : null,
          location: data.location || null,
          expectedSalary: data.expectedSalary || null,
          availability: data.availabilityData ? JSON.stringify(data.availabilityData) : data.availability || null,
          experienceDetails: data.experienceItems.length > 0 ? JSON.stringify(data.experienceItems) : null,
          educationDetails: data.educationItems.length > 0 ? JSON.stringify(data.educationItems) : null,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onMutate: () => {
      setAutoSaveStatus("saving");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-profile"] });
      setAutoSaveStatus("saved");
      setHasUnsavedChanges(false);
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    },
    onError: (error: Error) => {
      setAutoSaveStatus("idle");
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Skills management
  const handleAddSkill = (skill?: string) => {
    const skillToAdd = skill || newSkill.trim();
    if (skillToAdd && !formData.skills.includes(skillToAdd)) {
      handleFieldChange("skills", [...formData.skills, skillToAdd]);
      setNewSkill("");
      setSkillSuggestions([]);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    handleFieldChange(
      "skills",
      formData.skills.filter((skill) => skill !== skillToRemove)
    );
  };

  const handleSkillInputChange = (value: string) => {
    setNewSkill(value);
    if (value.length > 0) {
      const suggestions = COMMON_SKILLS.filter(
        (skill) =>
          skill.toLowerCase().includes(value.toLowerCase()) &&
          !formData.skills.includes(skill)
      ).slice(0, 5);
      setSkillSuggestions(suggestions);
    } else {
      setSkillSuggestions([]);
    }
  };

  // Location autocomplete
  const handleLocationChange = (value: string) => {
    handleFieldChange("location", value);
    if (value.length > 0) {
      const suggestions = COMMON_LOCATIONS.filter((loc) =>
        loc.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setLocationSuggestions(suggestions);
    } else {
      setLocationSuggestions([]);
    }
  };

  // Experience management
  const addExperience = () => {
    handleFieldChange("experienceItems", [
      ...formData.experienceItems,
      { title: "", company: "", duration: "", description: "" },
    ]);
  };

  const updateExperience = (index: number, field: keyof Experience, value: string) => {
    const updated = [...formData.experienceItems];
    updated[index] = { ...updated[index], [field]: value };
    handleFieldChange("experienceItems", updated);
  };

  const removeExperience = (index: number) => {
    handleFieldChange(
      "experienceItems",
      formData.experienceItems.filter((_, i) => i !== index)
    );
  };

  // Education management
  const addEducation = () => {
    handleFieldChange("educationItems", [
      ...formData.educationItems,
      { degree: "", institution: "", year: "", field: "" },
    ]);
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = [...formData.educationItems];
    updated[index] = { ...updated[index], [field]: value };
    handleFieldChange("educationItems", updated);
  };

  const removeEducation = (index: number) => {
    handleFieldChange(
      "educationItems",
      formData.educationItems.filter((_, i) => i !== index)
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const completionPercentage = calculateCompletion();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/candidate")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edit Your Profile</h1>
            <p className="text-muted-foreground">
              Create a professional profile with AI-powered autofill
            </p>
          </div>

          {/* Auto-save status */}
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            {autoSaveStatus === "saving" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            )}
            {autoSaveStatus === "saved" && (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Profile Completion */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profile Completion</span>
              <span className="text-sm font-bold">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            {completionPercentage < 100 && (
              <p className="text-xs text-muted-foreground mt-2">
                Complete your profile to increase your chances of being discovered by recruiters
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Resume Upload Section */}
        <ResumeUpload
          currentResumeUrl={profile?.resume_url || undefined}
          onUploadSuccess={handleResumeUploadSuccess}
        />

        {/* Profile Information Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Your name and professional headline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange("firstName", e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange("lastName", e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headline">Professional Headline</Label>
                <Input
                  id="headline"
                  value={formData.headline}
                  onChange={(e) => handleFieldChange("headline", e.target.value)}
                  placeholder="e.g., Senior Software Engineer | Full-Stack Developer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Summary *</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleFieldChange("bio", e.target.value)}
                  placeholder="Write a compelling summary about your professional experience, skills, and career goals..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.bio.length} characters • Aim for 200-500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Location & Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location & Availability
              </CardTitle>
              <CardDescription>
                Where you're located and when you're available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  placeholder="City, Country or Remote"
                />
                {locationSuggestions.length > 0 && (
                  <div className="border rounded-md mt-1 bg-background">
                    {locationSuggestions.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          handleFieldChange("location", loc);
                          setLocationSuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    value={formData.availability}
                    onChange={(e) => handleFieldChange("availability", e.target.value)}
                    placeholder="e.g., Immediate, 2 weeks notice"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedSalary">Expected Salary</Label>
                  <Input
                    id="expectedSalary"
                    value={formData.expectedSalary}
                    onChange={(e) => handleFieldChange("expectedSalary", e.target.value)}
                    placeholder="e.g., $80,000 - $100,000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Skills
              </CardTitle>
              <CardDescription>
                Add your technical and professional skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skills">Add Skill</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      id="skills"
                      value={newSkill}
                      onChange={(e) => handleSkillInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Type a skill (e.g., JavaScript, Project Management)"
                    />
                    {skillSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full border rounded-md mt-1 bg-background shadow-lg">
                        {skillSuggestions.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => handleAddSkill(skill)}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleAddSkill()}
                    variant="outline"
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.skills.length > 0 ? (
                  formData.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="px-3 py-1 text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No skills added yet. Start typing to see suggestions.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Work Experience */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Work Experience
                  </CardTitle>
                  <CardDescription>
                    Add your professional work history
                  </CardDescription>
                </div>
                <Button type="button" onClick={addExperience} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Experience
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.experienceItems.length > 0 ? (
                formData.experienceItems.map((exp, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Experience {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExperience(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Job Title *</Label>
                        <Input
                          value={exp.title}
                          onChange={(e) => updateExperience(index, "title", e.target.value)}
                          placeholder="Software Engineer"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Company *</Label>
                        <Input
                          value={exp.company}
                          onChange={(e) => updateExperience(index, "company", e.target.value)}
                          placeholder="Tech Corp"
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Duration *</Label>
                      <Input
                        value={exp.duration}
                        onChange={(e) => updateExperience(index, "duration", e.target.value)}
                        placeholder="Jan 2020 - Present"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={exp.description || ""}
                        onChange={(e) => updateExperience(index, "description", e.target.value)}
                        placeholder="Describe your responsibilities and achievements..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No work experience added yet</p>
                  <p className="text-sm">Click "Add Experience" to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Education
                  </CardTitle>
                  <CardDescription>
                    Add your educational background
                  </CardDescription>
                </div>
                <Button type="button" onClick={addEducation} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Education
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.educationItems.length > 0 ? (
                formData.educationItems.map((edu, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Education {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducation(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Degree *</Label>
                        <Input
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, "degree", e.target.value)}
                          placeholder="Bachelor of Science"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Field of Study</Label>
                        <Input
                          value={edu.field || ""}
                          onChange={(e) => updateEducation(index, "field", e.target.value)}
                          placeholder="Computer Science"
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Institution *</Label>
                        <Input
                          value={edu.institution}
                          onChange={(e) => updateEducation(index, "institution", e.target.value)}
                          placeholder="University Name"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Year</Label>
                        <Input
                          value={edu.year || ""}
                          onChange={(e) => updateEducation(index, "year", e.target.value)}
                          placeholder="2020"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No education added yet</p>
                  <p className="text-sm">Click "Add Education" to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Availability & Preferences */}
          <AvailabilityCalendar
            onSave={handleAvailabilitySave}
            initialData={formData.availabilityData}
          />

          {/* Save Button */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saveMutation.isPending || !hasUnsavedChanges}
              className="flex-1"
              size="lg"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>

          {hasUnsavedChanges && !saveMutation.isPending && (
            <p className="text-sm text-amber-600 text-center">
              You have unsaved changes. Click "Save Profile" to update your profile.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
