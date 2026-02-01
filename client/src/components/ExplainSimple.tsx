import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ExplainSimpleProps {
  clauseText: string;
  riskTitle?: string;
}

interface SimpleExplanation {
  simpleExplanation: string;
  realWorldExample: string;
  bottomLine: string;
}

export function ExplainSimple({ clauseText, riskTitle }: ExplainSimpleProps) {
  const [explanation, setExplanation] = useState<SimpleExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleExplain = async () => {
    if (explanation) {
      setShowExplanation(!showExplanation);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/explain-simple", {
        clauseText,
        riskTitle,
      });
      const data = await response.json();
      setExplanation(data);
      setShowExplanation(true);
    } catch (error) {
      console.error("Failed to get simple explanation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExplain}
        disabled={isLoading}
        className="gap-2"
        data-testid="button-explain-simple"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Lightbulb className="h-3 w-3" />
        )}
        {showExplanation ? "Hide Simple Explanation" : "Explain Like I'm 12"}
      </Button>

      {showExplanation && explanation && (
        <Card className="bg-secondary/30 border-secondary" data-testid="simple-explanation">
          <CardContent className="py-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-primary mb-1">
                In simple words:
              </p>
              <p className="text-sm">{explanation.simpleExplanation}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-primary mb-1">
                Real-world example:
              </p>
              <p className="text-sm italic">{explanation.realWorldExample}</p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm font-semibold">{explanation.bottomLine}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
