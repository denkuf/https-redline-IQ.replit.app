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
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    onAnswer(answers);
  };

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

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

        {questions.map((q, index) => (
          <div key={q.id} className="space-y-3" data-testid={`clarifying-question-${index}`}>
            <Label className="text-base font-medium">{q.question}</Label>
            
            {q.options ? (
              <RadioGroup
                value={answers[q.id] || ""}
                onValueChange={(value) => setAnswers({ ...answers, [q.id]: value })}
              >
                {q.options.map((option, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${q.id}-${i}`} />
                    <Label htmlFor={`${q.id}-${i}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Input
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Your answer..."
                data-testid={`input-answer-${q.id}`}
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
