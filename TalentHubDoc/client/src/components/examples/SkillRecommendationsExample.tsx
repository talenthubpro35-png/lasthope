import { SkillRecommendations } from "../SkillRecommendations";

// todo: remove mock functionality
const mockRecommendations = [
  {
    id: "1",
    skill: "Kubernetes",
    relevance: 92,
    demandTrend: "rising" as const,
    category: "DevOps",
    resources: [
      { title: "K8s Basics", url: "#" },
      { title: "CKAD Course", url: "#" },
    ],
  },
  {
    id: "2",
    skill: "GraphQL",
    relevance: 85,
    demandTrend: "rising" as const,
    category: "Backend",
    resources: [
      { title: "Apollo Docs", url: "#" },
    ],
  },
  {
    id: "3",
    skill: "System Design",
    relevance: 78,
    demandTrend: "stable" as const,
    category: "Architecture",
    resources: [
      { title: "Design Primer", url: "#" },
      { title: "Grokking", url: "#" },
    ],
  },
];

export default function SkillRecommendationsExample() {
  return (
    <SkillRecommendations
      recommendations={mockRecommendations}
      basedOn="Senior Backend Developer roles"
    />
  );
}
