import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Loader2, ChevronDown, ChevronUp, Quote } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface WhatIfSimulatorProps {
  contractId: number;
}

interface SimulationResult {
  answer: string;
  relevantClauses: { quote: string; explanation: string }[];
  worstCase: string;
  bestCase: string;
  advice: string;
}

const COMMON_SCENARIOS = [
  "What if I cancel early?",
  "What if they sue me?",
  "What if I miss a payment?",
  "What if I want to make changes?",
  "What if I need to extend the deadline?",
];

export function WhatIfSimulator({ contractId }: WhatIfSimulatorProps) {
  const [scenario, setScenario] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const handleSimulate = async () => {
    if (!scenario.trim()) return;

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/what-if", {
        scenario,
        contractId,
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Failed to simulate scenario:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickScenario = (s: string) => {
    setScenario(s);
  };

  return (
    <Card data-testid="what-if-simulator">
      <CardHeader 
        className="cursor-pointer" 
        onClick={() => setShowSimulator(!showSimulator)}
      >
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            What If? Simulator
          </span>
          {showSimulator ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      
      {showSimulator && (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ask any "what if" question and see what your contract says about it.
          </p>

          <div className="flex flex-wrap gap-2">
            {COMMON_SCENARIOS.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer hover-elevate"
                onClick={() => handleQuickScenario(s)}
                data-testid={`scenario-${s.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              >
                {s}
              </Badge>
            ))}
          </div>

          <Textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Type your scenario here... e.g., 'What if I need to terminate early?'"
            className="min-h-20"
            data-testid="input-what-if"
          />

          <Button
            onClick={handleSimulate}
            disabled={isLoading || !scenario.trim()}
            data-testid="button-simulate"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Simulate Scenario"
            )}
          </Button>

          {result && (
            <div className="space-y-4 pt-4 border-t" data-testid="simulation-result">
              <div>
                <h4 className="font-medium mb-2">Answer:</h4>
                <p className="text-sm">{result.answer}</p>
              </div>

              {result.relevantClauses.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Relevant Clauses:</h4>
                  <div className="space-y-3">
                    {result.relevantClauses.map((clause, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-md border-l-2 border-primary">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Quote className="h-3 w-3" />
                          <span>From contract</span>
                        </div>
                        <p className="text-sm italic mb-2">"{clause.quote}"</p>
                        <p className="text-sm text-muted-foreground">{clause.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-destructive/10 rounded-md">
                  <h5 className="text-xs font-medium text-destructive mb-1">
                    Worst Case:
                  </h5>
                  <p className="text-sm">{result.worstCase}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-md">
                  <h5 className="text-xs font-medium text-primary mb-1">
                    Best Case:
                  </h5>
                  <p className="text-sm">{result.bestCase}</p>
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
                <h5 className="text-xs font-medium text-primary mb-1">Advice:</h5>
                <p className="text-sm">{result.advice}</p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
