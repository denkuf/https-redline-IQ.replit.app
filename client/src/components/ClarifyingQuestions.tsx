import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HelpCircle, ChevronRight } from "lucide-react";
import type { ClarifyingQuestion } from "@shared/schema";

interface ClarifyingQuestionsProps {
  questions: ClarifyingQuestion[];
  onAnswer: (answers: Record<string, string>) => void;
  isSubmitting?: boolean;
}

export function ClarifyingQuestions({ questions, onAnswer, isSubmitting }: ClarifyingQuestionsProps) {
  // Normalize questions to ensure unique keys (AI sometimes emits duplicate IDs like q1,q2,q1,q2)
  const normalizedQuestions = questions.map((q, index) => ({
    ...q,
    _key: `${q.id}-${index}`,
  }));

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    // Map back to original IDs for the parent handler
    const mapped: Record<string, string> = {};
    normalizedQuestions.forEach((q) => {
      if (answers[q._key] !== undefined) {
        mapped[q.id] = answers[q._key];
      }
    });
    onAnswer(mapped);
  };

  const allAnswered = normalizedQuestions.every((q) => answers[q._key]?.trim());

  if (!questions.length) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <HelpCircle className="h-5 w-5" />
          A Few Quick Questions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Help us provide a more accurate analysis by answering these questions:
        </p>

        {normalizedQuestions.map((q, index) => (
          <div key={q._key} className="space-y-3" data-testid={`clarifying-question-${index}`}>
            <Label className="text-base font-medium">{q.question}</Label>
            
            {q.options ? (
              <RadioGroup
                value={answers[q._key] || ""}
                onValueChange={(value) => setAnswers({ ...answers, [q._key]: value })}
              >
                {q.options.map((option, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${q._key}-${i}`} />
                    <Label htmlFor={`${q._key}-${i}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Input
                value={answers[q._key] || ""}
                onChange={(e) => setAnswers({ ...answers, [q._key]: e.target.value })}
                placeholder="Your answer..."
                data-testid={`input-answer-${q._key}`}
              />
            )}
          </div>
        ))}

        <Button
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting}
          className="w-full"
          data-testid="button-submit-answers"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Updating Analysis...
            </>
          ) : (
            <>
              Continue Analysis
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
