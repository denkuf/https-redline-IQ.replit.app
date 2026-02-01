import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { NegotiationSuggestion as NegotiationSuggestionType } from "@shared/schema";

interface NegotiationSuggestionProps {
  suggestion: NegotiationSuggestionType;
  riskTitle: string;
}

export function NegotiationSuggestion({ suggestion, riskTitle }: NegotiationSuggestionProps) {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedChange, setCopiedChange] = useState(false);

  const copyToClipboard = async (text: string, type: "script" | "change") => {
    await navigator.clipboard.writeText(text);
    if (type === "script") {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedChange(true);
      setTimeout(() => setCopiedChange(false), 2000);
    }
  };

  return (
    <div className="space-y-4 mt-4 pl-4 border-l-2 border-primary/30">
      <div>
        <h5 className="text-sm font-medium text-muted-foreground mb-1">What this clause does:</h5>
        <p className="text-sm">{suggestion.whatItDoes}</p>
      </div>

      <div>
        <h5 className="text-sm font-medium text-muted-foreground mb-1">Why it's risky for you:</h5>
        <p className="text-sm">{suggestion.whyItsRisky}</p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h5 className="text-sm font-medium mb-1">Suggested change:</h5>
              <p className="text-sm">{suggestion.suggestedChangePlain}</p>
              {suggestion.suggestedChangeFormal && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Formal version: "{suggestion.suggestedChangeFormal}"
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(suggestion.suggestedChangeFormal || suggestion.suggestedChangePlain, "change")}
              data-testid="button-copy-change"
            >
              {copiedChange ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h5 className="text-sm font-medium mb-1 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                What to say:
              </h5>
              <p className="text-sm italic">"{suggestion.negotiationScript}"</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(suggestion.negotiationScript, "script")}
              data-testid="button-copy-script"
            >
              {copiedScript ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
