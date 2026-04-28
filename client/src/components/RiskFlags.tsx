import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Quote, CheckCircle, Info, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RiskBadge } from "./RiskBadge";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { NegotiationSuggestion } from "./NegotiationSuggestion";
import { ExplainSimple } from "./ExplainSimple";
import { IsThisNormal } from "./IsThisNormal";
import type { RiskFlag } from "@shared/schema";

interface RiskFlagsProps {
  riskFlags: RiskFlag[];
  contractType?: string;
  industryMode?: string;
  highlightedFlagTitle?: string;
}

export function RiskFlags({ riskFlags, contractType = "general", industryMode = "general", highlightedFlagTitle }: RiskFlagsProps) {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sortedFlagsForInit = [...riskFlags].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.severity] - order[b.severity];
  });
  const [openItems, setOpenItems] = useState<string[]>(
    sortedFlagsForInit.filter(f => f.severity === "High").map((_, i) => `risk-${i}`)
  );

  useEffect(() => {
    if (!highlightedFlagTitle) return;
    const sortedFlags = [...riskFlags].sort((a, b) => {
      const order = { High: 0, Medium: 1, Low: 2 };
      return order[a.severity] - order[b.severity];
    });
    const matchIndex = sortedFlags.findIndex(
      f => f.title.toLowerCase() === highlightedFlagTitle.toLowerCase()
    );
    if (matchIndex === -1) return;
    const itemKey = `risk-${matchIndex}`;
    setOpenItems(prev => prev.includes(itemKey) ? prev : [...prev, itemKey]);
    // Scroll to the item after a short delay (tab switch animation)
    setTimeout(() => {
      const el = itemRefs.current[itemKey];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }, [highlightedFlagTitle]);

  if (!riskFlags.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium text-green-700 dark:text-green-400">No significant risks detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              This contract appears to have standard, balanced terms
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedFlags = [...riskFlags].sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const highCount = riskFlags.filter((r) => r.severity === "High").length;
  const mediumCount = riskFlags.filter((r) => r.severity === "Medium").length;
  const lowCount = riskFlags.filter((r) => r.severity === "Low").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Risk Analysis
          </CardTitle>
          <div className="flex items-center gap-3 text-sm">
            {highCount > 0 && (
              <span className="text-red-600 dark:text-red-400">{highCount} High</span>
            )}
            {mediumCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">{mediumCount} Medium</span>
            )}
            {lowCount > 0 && (
              <span className="text-green-600 dark:text-green-400">{lowCount} Low</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" value={openItems} onValueChange={setOpenItems}>
          {sortedFlags.map((risk, i) => {
            const itemKey = `risk-${i}`;
            const isHighlighted = highlightedFlagTitle
              ? risk.title.toLowerCase() === highlightedFlagTitle.toLowerCase()
              : false;
            return (
            <AccordionItem
              key={i}
              value={itemKey}
              data-testid={`risk-flag-${i}`}
              ref={(el) => { itemRefs.current[itemKey] = el; }}
              className={isHighlighted && openItems.includes(itemKey)
                ? "ring-2 ring-primary/40 rounded-md transition-all duration-300"
                : ""}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left flex-wrap">
                  <RiskBadge severity={risk.severity} />
                  <span className="font-medium">{risk.title}</span>
                  {risk.isStandard === false && (
                    <Badge variant="outline" className="text-xs">Unusual</Badge>
                  )}
                  {risk.negotiation && (
                    <Badge variant="secondary" className="text-xs">Has Suggestions</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <p className="text-muted-foreground">{risk.explanation}</p>

                {/* Standard/Unusual context note */}
                {risk.isStandard === true && risk.standardNote && (
                  <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded" data-testid={`standard-note-${i}`}>
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span><strong>Commonly seen:</strong> {risk.standardNote}</span>
                  </div>
                )}
                {risk.isStandard === false && risk.unusualNote && (
                  <div className="flex items-start gap-2 text-xs text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-2 rounded" data-testid={`unusual-note-${i}`}>
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span><strong>Unusual:</strong> {risk.unusualNote}</span>
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-md border-l-2 border-primary">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Quote className="h-3 w-3" />
                    <span>{risk.clauseReference}</span>
                  </div>
                  <p className="text-sm italic">"{risk.clauseQuote}"</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <ConfidenceIndicator confidence={risk.confidence} />
                  {risk.confidence < 0.75 && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="text-xs gap-1 cursor-help border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-400"
                            data-testid={`low-confidence-badge-${i}`}
                          >
                            <AlertCircle className="h-3 w-3" />
                            Low confidence
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">
                            This assessment has lower confidence — the clause may be ambiguous or context-dependent. Consider professional review.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {risk.negotiation && (
                  <NegotiationSuggestion suggestion={risk.negotiation} riskTitle={risk.title} />
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <ExplainSimple clauseText={risk.clauseQuote} riskTitle={risk.title} />
                  <IsThisNormal 
                    clauseText={risk.clauseQuote} 
                    contractType={contractType}
                    industryMode={industryMode}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
