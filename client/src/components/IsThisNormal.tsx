import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Loader2, Check, AlertTriangle, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface IsThisNormalProps {
  clauseText: string;
  contractType: string;
  industryMode?: string;
}

interface NormalityResult {
  isNormal: boolean;
  verdict: "Common" | "Unusual" | "Red Flag";
  explanation: string;
  frequency: string;
  betterAlternative?: string;
}

export function IsThisNormal({ clauseText, contractType, industryMode }: IsThisNormalProps) {
  const [result, setResult] = useState<NormalityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleCheck = async () => {
    if (result) {
      setShowResult(!showResult);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/is-normal", {
        clauseText,
        contractType,
        industryMode,
      });
      const data = await response.json();
      setResult(data);
      setShowResult(true);
    } catch (error) {
      console.error("Failed to check normality:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "Common":
        return <Check className="h-4 w-4" />;
      case "Unusual":
        return <AlertTriangle className="h-4 w-4" />;
      case "Red Flag":
        return <X className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "Common":
        return <Badge variant="secondary">{verdict}</Badge>;
      case "Unusual":
        return <Badge variant="outline">{verdict}</Badge>;
      case "Red Flag":
        return <Badge variant="destructive">{verdict}</Badge>;
      default:
        return <Badge variant="secondary">{verdict}</Badge>;
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheck}
        disabled={isLoading}
        className="gap-2"
        data-testid="button-is-normal"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <HelpCircle className="h-3 w-3" />
        )}
        {showResult ? "Hide Result" : "Is This Normal?"}
      </Button>

      {showResult && result && (
        <Card className="bg-muted/30" data-testid="normal-result">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              {getVerdictIcon(result.verdict)}
              {getVerdictBadge(result.verdict)}
              <span className="text-sm text-muted-foreground">{result.frequency}</span>
            </div>
            <p className="text-sm">{result.explanation}</p>
            {result.betterAlternative && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  More standard alternative:
                </p>
                <p className="text-sm">{result.betterAlternative}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
