import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, ExternalLink, BookOpen } from "lucide-react";

interface SkillRecommendation {
  id: string;
  skill: string;
  relevance: number;
  demandTrend: "rising" | "stable" | "declining";
  category: string;
  resources?: { title: string; url: string }[];
}

interface SkillRecommendationsProps {
  recommendations: SkillRecommendation[];
  basedOn: string;
}

const trendColors = {
  rising: "text-green-600 dark:text-green-400",
  stable: "text-yellow-600 dark:text-yellow-400",
  declining: "text-red-600 dark:text-red-400",
};

const trendLabels = {
  rising: "High Demand",
  stable: "Stable Demand",
  declining: "Declining",
};

export function SkillRecommendations({ recommendations, basedOn }: SkillRecommendationsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI Skill Recommendations</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Based on your interest in: {basedOn}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="rounded-lg border p-4 space-y-3 hover-elevate"
            data-testid={`card-skill-rec-${rec.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h3 className="font-medium">{rec.skill}</h3>
                <Badge variant="outline">{rec.category}</Badge>
              </div>
              <div className={`flex items-center gap-1 text-sm ${trendColors[rec.demandTrend]}`}>
                <TrendingUp className="h-4 w-4" />
                <span>{trendLabels[rec.demandTrend]}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Relevance to your goals</span>
                <span className="font-medium">{rec.relevance}%</span>
              </div>
              <Progress value={rec.relevance} className="h-2" />
            </div>

            {rec.resources && rec.resources.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>Learning Resources</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rec.resources.map((resource, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => window.open(resource.url, "_blank")}
                      data-testid={`link-resource-${rec.id}-${index}`}
                    >
                      {resource.title}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
