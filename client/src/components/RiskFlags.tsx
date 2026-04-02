import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Quote, CheckCircle, Info } from "lucide-react";
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
}

export function RiskFlags({ riskFlags, contractType = "general", industryMode = "general" }: RiskFlagsProps) {
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
        <Accordion type="multiple" defaultValue={sortedFlags.filter(f => f.severity === "High").map((_, i) => `risk-${i}`)}>
          {sortedFlags.map((risk, i) => (
            <AccordionItem key={i} value={`risk-${i}`} data-testid={`risk-flag-${i}`}>
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

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <ConfidenceIndicator confidence={risk.confidence} />
                </div>

                {risk.confidence < 0.75 && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2 rounded" data-testid={`low-confidence-note-${i}`}>
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Lower confidence — this clause may be ambiguous or context-dependent. Consider professional review.</span>
                  </div>
                )}

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
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
