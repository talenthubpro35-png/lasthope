import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Sparkles, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface JobPostingFormProps {
  onSubmit?: (data: JobFormData) => void;
  onGenerateDescription?: () => void;
  isGenerating?: boolean;
  initialData?: Partial<JobFormData>;
}

interface JobFormData {
  title: string;
  company: string;
  location: string;
  type: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  requirements: string;
  skills: string[];
  mustHaveSkills: string[];
}

export function JobPostingForm({ onSubmit, onGenerateDescription, isGenerating, initialData }: JobPostingFormProps) {
  const [formData, setFormData] = useState<JobFormData>({
    title: initialData?.title || "",
    company: initialData?.company || "",
    location: initialData?.location || "",
    type: initialData?.type || "",
    salaryMin: initialData?.salaryMin || "",
    salaryMax: initialData?.salaryMax || "",
    description: initialData?.description || "",
    requirements: initialData?.requirements || "",
    skills: initialData?.skills || [],
    mustHaveSkills: initialData?.mustHaveSkills || [],
  });
  const [newSkill, setNewSkill] = useState("");

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
      mustHaveSkills: formData.mustHaveSkills.filter((s) => s !== skill),
    });
  };

  const toggleMustHave = (skill: string) => {
    if (formData.mustHaveSkills.includes(skill)) {
      setFormData({
        ...formData,
        mustHaveSkills: formData.mustHaveSkills.filter((s) => s !== skill),
      });
    } else {
      setFormData({
        ...formData,
        mustHaveSkills: [...formData.mustHaveSkills, skill],
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Job Posting</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Senior Frontend Developer"
                data-testid="input-job-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g., TechCorp Inc."
                data-testid="input-company"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., San Francisco, CA or Remote"
                data-testid="input-location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Employment Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger data-testid="select-job-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salaryMin">Salary Range (Min)</Label>
              <Input
                id="salaryMin"
                value={formData.salaryMin}
                onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                placeholder="e.g., 80000"
                type="number"
                data-testid="input-salary-min"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryMax">Salary Range (Max)</Label>
              <Input
                id="salaryMax"
                value={formData.salaryMax}
                onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                placeholder="e.g., 120000"
                type="number"
                data-testid="input-salary-max"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Job Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onGenerateDescription}
                disabled={isGenerating}
                data-testid="button-generate-description"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the role, responsibilities, and what makes this position exciting..."
              className="min-h-32"
              data-testid="textarea-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="List the qualifications, experience, and education required..."
              className="min-h-24"
              data-testid="textarea-requirements"
            />
          </div>

          <div className="space-y-2">
            <Label>Required Skills</Label>
            <p className="text-xs text-muted-foreground">
              Click the star to mark skills as "Must-Have" (higher priority in matching)
            </p>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                data-testid="input-skill"
              />
              <Button type="button" variant="outline" onClick={handleAddSkill} data-testid="button-add-skill">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.skills.length > 0 && (
              <TooltipProvider>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill) => {
                    const isMustHave = formData.mustHaveSkills.includes(skill);
                    return (
                      <Badge
                        key={skill}
                        variant={isMustHave ? "default" : "secondary"}
                        className={`gap-1 ${isMustHave ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => toggleMustHave(skill)}
                              className={`hover:scale-110 transition-transform ${isMustHave ? "text-white" : "text-muted-foreground hover:text-amber-500"}`}
                            >
                              <Star className={`h-3 w-3 ${isMustHave ? "fill-current" : ""}`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isMustHave ? "Remove from Must-Have" : "Mark as Must-Have"}
                          </TooltipContent>
                        </Tooltip>
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
            {formData.mustHaveSkills.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                <Star className="h-3 w-3 inline fill-current" /> {formData.mustHaveSkills.length} must-have skill(s) marked
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" data-testid="button-save-draft">
              Save Draft
            </Button>
            <Button type="submit" data-testid="button-publish-job">
              Publish Job
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
