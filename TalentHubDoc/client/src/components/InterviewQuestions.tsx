import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sparkles, Copy, Check, RefreshCw, Download, FileText } from "lucide-react";

interface Question {
  id: string;
  question: string;
  category: "technical" | "behavioral" | "situational" | "company";
  difficulty: "easy" | "medium" | "hard";
}

interface InterviewQuestionsProps {
  jobTitle: string;
  questions: Question[];
  onGenerateMore?: () => void;
  isGenerating?: boolean;
  practiceAnswers?: Record<string, string>;
  onPracticeAnswerChange?: (answers: Record<string, string>) => void;
}

const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
};

const categoryColors = {
  technical: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  behavioral: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
  situational: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  company: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
};

export function InterviewQuestions({
  jobTitle,
  questions,
  onGenerateMore,
  isGenerating,
  practiceAnswers = {},
  onPracticeAnswerChange,
}: InterviewQuestionsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (question: string, id: string) => {
    navigator.clipboard.writeText(question);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (onPracticeAnswerChange) {
      onPracticeAnswerChange({ ...practiceAnswers, [questionId]: answer });
    }
  };

  const exportToPDF = () => {
    // Create a printable version
    const printContent = `
      <html>
        <head>
          <title>Interview Questions - ${jobTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 30px; }
            .question { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .question-header { display: flex; gap: 10px; margin-bottom: 10px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .technical { background: #dbeafe; color: #1e40af; }
            .behavioral { background: #f3e8ff; color: #6b21a8; }
            .situational { background: #fed7aa; color: #9a3412; }
            .company { background: #d1fae5; color: #065f46; }
            .easy { background: #dcfce7; color: #166534; }
            .medium { background: #fef3c7; color: #854d0e; }
            .hard { background: #fee2e2; color: #991b1b; }
            .answer { margin-top: 10px; padding: 10px; background: #f9fafb; border-radius: 4px; }
            .answer-label { font-weight: bold; color: #666; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <h1>Interview Questions for ${jobTitle}</h1>
          ${["technical", "behavioral", "company", "situational"]
            .map((category) => {
              const categoryQuestions = questions.filter((q) => q.category === category);
              if (categoryQuestions.length === 0) return "";

              return `
                <h2>${category.charAt(0).toUpperCase() + category.slice(1)} Questions</h2>
                ${categoryQuestions
                  .map(
                    (q, idx) => `
                  <div class="question">
                    <div class="question-header">
                      <span><strong>Q${idx + 1}:</strong></span>
                      <span class="badge ${category}">${category}</span>
                      <span class="badge ${q.difficulty}">${q.difficulty}</span>
                    </div>
                    <p>${q.question}</p>
                    ${
                      practiceAnswers[q.id]
                        ? `
                      <div class="answer">
                        <div class="answer-label">Your Practice Answer:</div>
                        <p>${practiceAnswers[q.id]}</p>
                      </div>
                    `
                        : ""
                    }
                  </div>
                `
                  )
                  .join("")}
              `;
            })
            .join("")}
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  // Group questions by category
  const questionsByCategory = {
    technical: questions.filter((q) => q.category === "technical"),
    behavioral: questions.filter((q) => q.category === "behavioral"),
    company: questions.filter((q) => q.category === "company"),
    situational: questions.filter((q) => q.category === "situational"),
  };

  const renderQuestion = (q: Question, index: number) => (
    <div
      key={q.id}
      className="group rounded-lg border p-4 hover-elevate"
      data-testid={`card-question-${q.id}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Q{index + 1}
              </span>
              <Badge className={categoryColors[q.category]} variant="secondary">
                {q.category}
              </Badge>
              <Badge className={difficultyColors[q.difficulty]} variant="secondary">
                {q.difficulty}
              </Badge>
            </div>
            <p className="text-sm font-medium">{q.question}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => copyToClipboard(q.question, q.id)}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`button-copy-question-${q.id}`}
          >
            {copiedId === q.id ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="practice" className="border-none">
            <AccordionTrigger className="text-sm py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Practice Answer
                {practiceAnswers[q.id] && (
                  <Badge variant="outline" className="ml-2">Answered</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Textarea
                placeholder="Write your practice answer here..."
                value={practiceAnswers[q.id] || ""}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                className="min-h-32"
                data-testid={`textarea-answer-${q.id}`}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">AI Interview Questions</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Generated for: {jobTitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={questions.length === 0}
            data-testid="button-export-pdf"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateMore}
            disabled={isGenerating}
            data-testid="button-generate-questions"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Generate More
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No questions generated yet. Select a job and click "Generate Questions".</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({questions.length})
              </TabsTrigger>
              <TabsTrigger value="technical">
                Technical ({questionsByCategory.technical.length})
              </TabsTrigger>
              <TabsTrigger value="behavioral">
                Behavioral ({questionsByCategory.behavioral.length})
              </TabsTrigger>
              <TabsTrigger value="company">
                Company ({questionsByCategory.company.length})
              </TabsTrigger>
              <TabsTrigger value="situational">
                Situational ({questionsByCategory.situational.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {questions.map((q, index) => renderQuestion(q, index))}
            </TabsContent>

            <TabsContent value="technical" className="space-y-4 mt-4">
              {questionsByCategory.technical.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No technical questions generated.
                </p>
              ) : (
                questionsByCategory.technical.map((q, index) => renderQuestion(q, index))
              )}
            </TabsContent>

            <TabsContent value="behavioral" className="space-y-4 mt-4">
              {questionsByCategory.behavioral.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No behavioral questions generated.
                </p>
              ) : (
                questionsByCategory.behavioral.map((q, index) => renderQuestion(q, index))
              )}
            </TabsContent>

            <TabsContent value="company" className="space-y-4 mt-4">
              {questionsByCategory.company.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No company-specific questions generated.
                </p>
              ) : (
                questionsByCategory.company.map((q, index) => renderQuestion(q, index))
              )}
            </TabsContent>

            <TabsContent value="situational" className="space-y-4 mt-4">
              {questionsByCategory.situational.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No situational questions generated.
                </p>
              ) : (
                questionsByCategory.situational.map((q, index) => renderQuestion(q, index))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
