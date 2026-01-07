import { AIMatchScore } from "../AIMatchScore";

export default function AIMatchScoreExample() {
  return (
    <AIMatchScore
      score={85}
      jobTitle="Senior Frontend Developer"
      matchedSkills={[
        { skill: "React", matched: true },
        { skill: "TypeScript", matched: true },
        { skill: "Node.js", matched: true },
        { skill: "GraphQL", matched: false },
        { skill: "AWS", matched: false },
      ]}
    />
  );
}
