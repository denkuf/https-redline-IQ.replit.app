import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, XCircle, CheckCircle, ArrowRight, Info, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Verdict } from "@shared/schema";

interface VerdictPanelProps {
  verdict: Verdict;
}

export function VerdictPanel({ verdict }: VerdictPanelProps) {
  // Parse annotation tags embedded in reasoning by the validation pass
  const wasAdjusted = verdict.reasoning?.includes("[Score adjusted:");
  const isUncertain = verdict.reasoning?.includes("[Score uncertain:");
  const adjustmentNote = wasAdjusted
    ? verdict.reasoning.match(/\[Score adjusted: ([^\]]+)\]/)?.[1] ?? null
    : null;

  const getVerdictConfig = () => {
    switch (verdict.verdict) {
      case "Safe":
        return {
          icon: CheckCircle,
          bgColor: "bg-green-50 dark:bg-green-900/20",
          borderColor: "border-green-200 dark:border-green-800",
          iconColor: "text-green-500",
          progressColor: "bg-green-500",
          badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
        };
      case "Caution":
        return {
          icon: Shield,
          bgColor: "bg-amber-50 dark:bg-amber-900/20",
          borderColor: "border-amber-200 dark:border-amber-800",
          iconColor: "text-amber-500",
          progressColor: "bg-amber-500",
          badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
        };
      case "High Risk":
        return {
          icon: AlertTriangle,
          bgColor: "bg-orange-50 dark:bg-orange-900/20",
          borderColor: "border-orange-200 dark:border-orange-800",
          iconColor: "text-orange-500",
          progressColor: "bg-orange-500",
          badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
        };
      case "Do Not Sign":
        return {
          icon: XCircle,
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
          iconColor: "text-red-500",
          progressColor: "bg-red-500",
          badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
        };
      default:
        return {
          icon: Shield,
          bgColor: "bg-muted",
          borderColor: "border-muted",
          iconColor: "text-muted-foreground",
          progressColor: "bg-primary",
          badgeClass: "",
        };
    }
  };

  const config = getVerdictConfig();
  const Icon = config.icon;

  // Clean reasoning text — strip annotation tags before display
  const cleanReasoning = verdict.reasoning
    ?.replace(/\s*\[Score adjusted:[^\]]+\]/g, "")
    .replace(/\s*\[Score uncertain:[^\]]+\]/g, "")
    .trim();

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`} data-testid="verdict-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
            <span>Should I Sign This?</span>
          </div>
          <Badge className={config.badgeClass} data-testid="verdict-badge">
            {verdict.verdict}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Risk Score</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold" data-testid="risk-score">{verdict.riskScore}/100</span>
              {wasAdjusted && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-xs gap-1 cursor-help border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400"
                        data-testid="score-adjusted-badge"
                      >
                        <Info className="h-3 w-3" />
                        Adjusted
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        Score adjusted by secondary AI review: {adjustmentNote}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${config.progressColor} transition-all`}
              style={{ width: `${verdict.riskScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex justify-between text-xs text-muted-foreground w-full">
              <span>Safe</span>
              <span>High Risk</span>
            </div>
          </div>
          {/* Always-visible accuracy label */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-1 mt-2 w-fit cursor-help"
                  data-testid="score-estimate-label"
                >
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">AI estimate · ±10 points</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">
                  This score is an AI estimate based on visible contract text. Actual risk may differ
                  depending on jurisdiction, enforceability in your location, missing clauses, and
                  your negotiating position. It is not a substitute for professional legal advice.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Score uncertain warning (set by validation pass) */}
          {isUncertain && (
            <div
              className="flex items-start gap-2 mt-3 p-2 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400"
              data-testid="score-uncertain-warning"
            >
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                The score reliability is lower than usual — this contract may be incomplete or highly
                ambiguous. Consider having a professional review the full document.
              </span>
            </div>
          )}
        </div>

        {verdict.topRisks.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Top Concerns</h4>
            <ul className="space-y-2">
              {verdict.topRisks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" data-testid={`top-risk-${i}`}>
                  <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    risk.severity === "High" ? "bg-red-500" :
                    risk.severity === "Medium" ? "bg-amber-500" : "bg-green-500"
                  }`} />
                  <span className="break-words min-w-0">
                    <strong>{risk.title}</strong>
                    <span className="text-muted-foreground"> - {risk.clauseReference}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {verdict.negotiationPriorities.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              What to Negotiate First
            </h4>
            <ol className="space-y-1 list-decimal list-inside">
              {verdict.negotiationPriorities.map((priority, i) => (
                <li key={i} className="text-sm" data-testid={`negotiation-priority-${i}`}>
                  {priority}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="pt-3 border-t">
          <p className="text-sm text-muted-foreground" data-testid="verdict-reasoning">
            {cleanReasoning}
          </p>
          <p className="text-xs text-muted-foreground mt-2 italic">
            Reasoning is contract-based only. This is not legal advice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
