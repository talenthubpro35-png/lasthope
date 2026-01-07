import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, AlertTriangle, Info, CheckCircle, Sparkles } from "lucide-react";
import { useMemo } from "react";

interface CVData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  summary: string;
  skills: string[];
  experience: any[];
  education: any[];
  certifications?: any[];
  projects?: any[];
  languages?: any[];
  volunteer?: any[];
  awards?: any[];
  publications?: any[];
  courses?: any[];
}

interface Suggestion {
  id: string;
  category: "critical" | "important" | "optional";
  message: string;
  field: string;
}

interface SmartSuggestionsProps {
  cvData: CVData;
}

export function SmartSuggestions({ cvData }: SmartSuggestionsProps) {
  const { completeness, suggestions, categoryStats } = useMemo(() => {
    const suggestions: Suggestion[] = [];
    let totalWeight = 0;
    let completedWeight = 0;

    // Define weights for each field
    const fieldWeights = {
      name: 10,
      email: 10,
      phone: 5,
      location: 5,
      title: 8,
      summary: 15,
      skills: 12,
      experience: 15,
      education: 10,
      certifications: 3,
      projects: 3,
      languages: 2,
      volunteer: 2,
      awards: 2,
      publications: 1,
      courses: 2,
    };

    // Critical checks
    if (!cvData.name || cvData.name === "Your Name" || cvData.name.trim() === "") {
      suggestions.push({
        id: "name",
        category: "critical",
        message: "Add your full name",
        field: "Personal Information",
      });
    } else {
      completedWeight += fieldWeights.name;
    }
    totalWeight += fieldWeights.name;

    if (!cvData.email || cvData.email.trim() === "") {
      suggestions.push({
        id: "email",
        category: "critical",
        message: "Add your email address",
        field: "Personal Information",
      });
    } else {
      completedWeight += fieldWeights.email;
    }
    totalWeight += fieldWeights.email;

    if (!cvData.title || cvData.title === "Your Professional Title" || cvData.title.trim() === "") {
      suggestions.push({
        id: "title",
        category: "critical",
        message: "Add your job title or professional headline",
        field: "Personal Information",
      });
    } else {
      completedWeight += fieldWeights.title;
    }
    totalWeight += fieldWeights.title;

    // Important checks
    if (!cvData.summary || cvData.summary === "Add your professional summary..." || cvData.summary.trim().length < 50) {
      suggestions.push({
        id: "summary",
        category: "important",
        message: cvData.summary.trim().length === 0
          ? "Add a professional summary (aim for 100-200 words)"
          : "Expand your professional summary (current: " + cvData.summary.trim().length + " chars, aim for 200+)",
        field: "Professional Summary",
      });
    } else {
      completedWeight += fieldWeights.summary;
    }
    totalWeight += fieldWeights.summary;

    if (!cvData.skills || cvData.skills.length === 0) {
      suggestions.push({
        id: "skills",
        category: "important",
        message: "Add at least 5 relevant skills",
        field: "Skills",
      });
    } else if (cvData.skills.length < 5) {
      suggestions.push({
        id: "skills-few",
        category: "important",
        message: `Add more skills (current: ${cvData.skills.length}, recommended: 5-10)`,
        field: "Skills",
      });
      completedWeight += (cvData.skills.length / 5) * fieldWeights.skills;
    } else {
      completedWeight += fieldWeights.skills;
    }
    totalWeight += fieldWeights.skills;

    if (!cvData.experience || cvData.experience.length === 0) {
      suggestions.push({
        id: "experience",
        category: "important",
        message: "Add at least one work experience",
        field: "Experience",
      });
    } else {
      completedWeight += fieldWeights.experience;
      // Check experience details
      const hasDescriptions = cvData.experience.some(
        (exp) => exp.description && Array.isArray(exp.description) && exp.description.length > 0
      );
      if (!hasDescriptions) {
        suggestions.push({
          id: "experience-details",
          category: "important",
          message: "Add bullet points describing your responsibilities and achievements",
          field: "Experience",
        });
      }
    }
    totalWeight += fieldWeights.experience;

    if (!cvData.education || cvData.education.length === 0) {
      suggestions.push({
        id: "education",
        category: "important",
        message: "Add your education background",
        field: "Education",
      });
    } else {
      completedWeight += fieldWeights.education;
    }
    totalWeight += fieldWeights.education;

    if (!cvData.phone || cvData.phone.trim() === "") {
      suggestions.push({
        id: "phone",
        category: "optional",
        message: "Add your phone number",
        field: "Personal Information",
      });
    } else {
      completedWeight += fieldWeights.phone;
    }
    totalWeight += fieldWeights.phone;

    if (!cvData.location || cvData.location.trim() === "") {
      suggestions.push({
        id: "location",
        category: "optional",
        message: "Add your location (city, state/country)",
        field: "Personal Information",
      });
    } else {
      completedWeight += fieldWeights.location;
    }
    totalWeight += fieldWeights.location;

    // Optional enhancements
    if (!cvData.certifications || cvData.certifications.length === 0) {
      suggestions.push({
        id: "certifications",
        category: "optional",
        message: "Add professional certifications (if applicable)",
        field: "Certifications",
      });
    } else {
      completedWeight += fieldWeights.certifications;
    }
    totalWeight += fieldWeights.certifications;

    if (!cvData.projects || cvData.projects.length === 0) {
      suggestions.push({
        id: "projects",
        category: "optional",
        message: "Showcase your projects to stand out",
        field: "Projects",
      });
    } else {
      completedWeight += fieldWeights.projects;
    }
    totalWeight += fieldWeights.projects;

    if (!cvData.languages || cvData.languages.length === 0) {
      suggestions.push({
        id: "languages",
        category: "optional",
        message: "Add languages you speak (if multilingual)",
        field: "Languages",
      });
    } else {
      completedWeight += fieldWeights.languages;
    }
    totalWeight += fieldWeights.languages;

    if (!cvData.volunteer || cvData.volunteer.length === 0) {
      suggestions.push({
        id: "volunteer",
        category: "optional",
        message: "Add volunteer experience to highlight community involvement",
        field: "Volunteer",
      });
    } else {
      completedWeight += fieldWeights.volunteer;
    }
    totalWeight += fieldWeights.volunteer;

    if (!cvData.awards || cvData.awards.length === 0) {
      suggestions.push({
        id: "awards",
        category: "optional",
        message: "Add awards and honors (if any)",
        field: "Awards",
      });
    } else {
      completedWeight += fieldWeights.awards;
    }
    totalWeight += fieldWeights.awards;

    if (!cvData.publications || cvData.publications.length === 0) {
      suggestions.push({
        id: "publications",
        category: "optional",
        message: "Add publications (if applicable)",
        field: "Publications",
      });
    } else {
      completedWeight += fieldWeights.publications;
    }
    totalWeight += fieldWeights.publications;

    if (!cvData.courses || cvData.courses.length === 0) {
      suggestions.push({
        id: "courses",
        category: "optional",
        message: "Add relevant courses you've completed",
        field: "Courses",
      });
    } else {
      completedWeight += fieldWeights.courses;
    }
    totalWeight += fieldWeights.courses;

    // Calculate completeness percentage
    const completeness = Math.round((completedWeight / totalWeight) * 100);

    // Category stats
    const categoryStats = {
      critical: suggestions.filter((s) => s.category === "critical").length,
      important: suggestions.filter((s) => s.category === "important").length,
      optional: suggestions.filter((s) => s.category === "optional").length,
    };

    return { completeness, suggestions, categoryStats };
  }, [cvData]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "critical":
        return <AlertCircle className="h-4 w-4" />;
      case "important":
        return <AlertTriangle className="h-4 w-4" />;
      case "optional":
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "important":
        return "text-orange-600 dark:text-orange-400";
      case "optional":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getCategoryBadgeVariant = (category: string): "destructive" | "default" | "secondary" => {
    switch (category) {
      case "critical":
        return "destructive";
      case "important":
        return "default";
      case "optional":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getCompletenessColor = () => {
    if (completeness >= 80) return "text-green-600 dark:text-green-400";
    if (completeness >= 60) return "text-blue-600 dark:text-blue-400";
    if (completeness >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getCompletenessMessage = () => {
    if (completeness >= 90) return "Excellent! Your CV is comprehensive";
    if (completeness >= 80) return "Great! Just a few more touches";
    if (completeness >= 60) return "Good progress! Keep going";
    if (completeness >= 40) return "Getting there! Add more details";
    return "Let's build your CV together";
  };

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Smart Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Completeness Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Completeness</span>
            <span className={`text-2xl font-bold ${getCompletenessColor()}`}>
              {completeness}%
            </span>
          </div>
          <Progress value={completeness} className="h-2" />
          <p className="text-xs text-muted-foreground">{getCompletenessMessage()}</p>
        </div>

        {/* Category Summary */}
        {suggestions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {categoryStats.critical > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {categoryStats.critical} Critical
              </Badge>
            )}
            {categoryStats.important > 0 && (
              <Badge variant="default" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {categoryStats.important} Important
              </Badge>
            )}
            {categoryStats.optional > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Info className="h-3 w-3" />
                {categoryStats.optional} Optional
              </Badge>
            )}
          </div>
        )}

        {/* Suggestions List */}
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Perfect! No suggestions
              </p>
              <p className="text-xs text-muted-foreground">
                Your CV looks comprehensive
              </p>
            </div>
          ) : (
            <>
              {/* Critical Suggestions */}
              {suggestions
                .filter((s) => s.category === "critical")
                .map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20"
                  >
                    <div className="flex gap-2">
                      <div className={`mt-0.5 ${getCategoryColor(suggestion.category)}`}>
                        {getCategoryIcon(suggestion.category)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{suggestion.message}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.field}</p>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Important Suggestions */}
              {suggestions
                .filter((s) => s.category === "important")
                .map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                  >
                    <div className="flex gap-2">
                      <div className={`mt-0.5 ${getCategoryColor(suggestion.category)}`}>
                        {getCategoryIcon(suggestion.category)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{suggestion.message}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.field}</p>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Optional Suggestions */}
              {suggestions
                .filter((s) => s.category === "optional")
                .map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex gap-2">
                      <div className={`mt-0.5 ${getCategoryColor(suggestion.category)}`}>
                        {getCategoryIcon(suggestion.category)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">{suggestion.message}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.field}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
