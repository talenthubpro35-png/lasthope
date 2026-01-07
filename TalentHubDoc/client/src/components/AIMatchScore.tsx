import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle, XCircle, Award, Briefcase, GraduationCap, MapPin } from "lucide-react";

interface SkillMatch {
  skill: string;
  matched: boolean;
}

interface MatchBreakdown {
  skills: number;
  experience: number;
  education: number;
  location: number;
}

interface AIMatchScoreProps {
  score: number;
  matchedSkills?: SkillMatch[];
  jobTitle: string;
  breakdown?: MatchBreakdown;
}

export function AIMatchScore({ score, matchedSkills = [], jobTitle, breakdown }: AIMatchScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const matched = matchedSkills.filter((s) => s.matched);
  const missing = matchedSkills.filter((s) => !s.matched);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI Match Analysis</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">for {jobTitle}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className={`text-5xl font-bold ${getScoreColor(score)}`} data-testid="text-match-score">
            {score}%
          </div>
          <p className="text-sm text-muted-foreground mt-1">Overall Match Score</p>
          <Progress value={score} className="mt-3 h-2" />
        </div>

        {/* Match Breakdown */}
        {breakdown && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Match Breakdown</h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-blue-600" />
                  <span>Skills</span>
                </div>
                <span className={`text-sm font-medium ${getScoreColor(breakdown.skills)}`}>
                  {breakdown.skills}%
                </span>
              </div>
              <Progress value={breakdown.skills} className="h-1.5" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-purple-600" />
                  <span>Experience</span>
                </div>
                <span className={`text-sm font-medium ${getScoreColor(breakdown.experience)}`}>
                  {breakdown.experience}%
                </span>
              </div>
              <Progress value={breakdown.experience} className="h-1.5" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-emerald-600" />
                  <span>Education</span>
                </div>
                <span className={`text-sm font-medium ${getScoreColor(breakdown.education)}`}>
                  {breakdown.education}%
                </span>
              </div>
              <Progress value={breakdown.education} className="h-1.5" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <span>Location</span>
                </div>
                <span className={`text-sm font-medium ${getScoreColor(breakdown.location)}`}>
                  {breakdown.location}%
                </span>
              </div>
              <Progress value={breakdown.location} className="h-1.5" />
            </div>
          </div>
        )}

        {/* Skills Details */}
        {matchedSkills.length > 0 && (
          <div className="space-y-4">
            {matched.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Matching Skills ({matched.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {matched.map((skill) => (
                    <span
                      key={skill.skill}
                      className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                    >
                      {skill.skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missing.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  Skills to Develop ({missing.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {missing.map((skill) => (
                    <span
                      key={skill.skill}
                      className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                    >
                      {skill.skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
