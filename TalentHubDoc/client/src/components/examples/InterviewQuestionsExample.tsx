import { InterviewQuestions } from "../InterviewQuestions";

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
];

export default function InterviewQuestionsExample() {
  return (
    <InterviewQuestions
      jobTitle="Senior Frontend Developer"
      questions={mockQuestions}
      onGenerateMore={() => console.log("Generating more questions...")}
    />
  );
}
