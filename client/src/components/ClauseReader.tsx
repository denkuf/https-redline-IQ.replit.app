import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Shield,
  AlertCircle,
  Flag,
  CheckCircle2,
  HelpCircle,
  FileText,
  ExternalLink,
  Quote,
} from "lucide-react";
import type { AnnotatedClause } from "@shared/schema";

interface ClauseReaderProps {
  clauses: AnnotatedClause[];
  onSwitchToRisks?: (flagTitle?: string) => void;
}

const RISK_CONFIG = {
  flagged: {
    label: "Flagged",
    border: "border-l-destructive",
    bg: "bg-destructive/5 dark:bg-destructive/10",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    icon: Flag,
  },
  high: {
    label: "High Risk",
    border: "border-l-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    icon: AlertTriangle,
  },
  caution: {
    label: "Caution",
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    icon: AlertCircle,
  },
  safe: {
    label: "Safe",
    border: "border-l-green-500",
    bg: "",
    badgeClass: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    icon: CheckCircle2,
  },
} as const;

function ClauseCard({
  clause,
  index,
  isExpanded,
  onToggle,
  onSwitchToRisks,
}: {
  clause: AnnotatedClause;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSwitchToRisks?: (flagTitle?: string) => void;
}) {
  const config = RISK_CONFIG[clause.riskLevel];
  const RiskIcon = config.icon;

  return (
    <div
      className={`border rounded-lg border-l-4 ${config.border} overflow-hidden transition-all`}
      data-testid={`clause-card-${index}`}
    >
      <button
        className={`w-full text-left p-4 flex items-start gap-3 hover:bg-muted/40 transition-colors ${isExpanded ? config.bg : ""}`}
        onClick={onToggle}
        aria-expanded={isExpanded}
        data-testid={`button-toggle-clause-${index}`}
      >
        <div className="flex items-center gap-2 mt-0.5 shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate" data-testid={`text-clause-name-${index}`}>
              {clause.name}
            </span>

            <Badge
              variant="outline"
              className={`text-xs shrink-0 flex items-center gap-1 ${config.badgeClass}`}
              data-testid={`badge-risk-level-${index}`}
            >
              <RiskIcon className="h-3 w-3" />
              {config.label}
            </Badge>

            <Badge
              variant="outline"
              className={`text-xs shrink-0 ${
                clause.isStandard
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                  : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
              }`}
              data-testid={`badge-standard-${index}`}
            >
              {clause.isStandard ? (
                <><Shield className="h-3 w-3 mr-1" />Standard</>
              ) : (
                <><HelpCircle className="h-3 w-3 mr-1" />Unusual</>
              )}
            </Badge>
          </div>

          {!isExpanded && (
            <p className="text-xs text-muted-foreground line-clamp-1" data-testid={`text-clause-preview-${index}`}>
              {clause.plainEnglish}
            </p>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className={`px-4 pb-4 space-y-3 ${config.bg}`}>
          <div className="pl-7 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Quote className="h-3 w-3" />
                Original text
              </div>
              <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-sm text-muted-foreground font-mono leading-relaxed bg-muted/30 rounded-r py-2 pr-2">
                {clause.originalText}
              </blockquote>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <FileText className="h-3 w-3" />
                Plain English
              </div>
              <p className="text-sm leading-relaxed" data-testid={`text-plain-english-${index}`}>
                {clause.plainEnglish}
              </p>
            </div>

            {clause.linkedRiskFlagTitles.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <AlertTriangle className="h-3 w-3" />
                  Linked risk flags
                </div>
                <div className="flex flex-wrap gap-2">
                  {clause.linkedRiskFlagTitles.map((title, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSwitchToRisks?.(title);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                      data-testid={`button-risk-link-${index}-${i}`}
                    >
                      <Flag className="h-3 w-3" />
                      {title}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ClauseReader({ clauses, onSwitchToRisks }: ClauseReaderProps) {
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());

  const toggleClause = (index: number) => {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const reviewedCount = expandedIndexes.size;
  const totalCount = clauses.length;
  const progressPercent = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  const flaggedCount = clauses.filter((c) => c.riskLevel === "flagged").length;
  const highCount = clauses.filter((c) => c.riskLevel === "high").length;
  const cautionCount = clauses.filter((c) => c.riskLevel === "caution").length;

  const expandAll = () => setExpandedIndexes(new Set(clauses.map((_, i) => i)));
  const collapseAll = () => setExpandedIndexes(new Set());

  return (
    <div className="space-y-4" data-testid="clause-reader">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Clause-by-Clause Reader
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalCount} clauses found — click any clause to expand the annotation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {flaggedCount > 0 && (
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
              <Flag className="h-3 w-3 mr-1" />
              {flaggedCount} flagged
            </Badge>
          )}
          {highCount > 0 && (
            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {highCount} high
            </Badge>
          )}
          {cautionCount > 0 && (
            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertCircle className="h-3 w-3 mr-1" />
              {cautionCount} caution
            </Badge>
          )}
        </div>
      </div>

      <Card className="p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-xs text-muted-foreground" data-testid="text-progress">
            {reviewedCount} of {totalCount} clauses reviewed
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={expandAll} data-testid="button-expand-all">
              Expand all
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={collapseAll} data-testid="button-collapse-all">
              Collapse all
            </Button>
          </div>
        </div>
        <Progress value={progressPercent} className="h-1.5" data-testid="progress-clauses-reviewed" />
      </Card>

      <div className="space-y-2">
        {clauses.map((clause, index) => (
          <ClauseCard
            key={index}
            clause={clause}
            index={index}
            isExpanded={expandedIndexes.has(index)}
            onToggle={() => toggleClause(index)}
            onSwitchToRisks={onSwitchToRisks}
          />
        ))}
      </div>
    </div>
  );
}

export function ClauseReaderSkeleton() {
  return (
    <div className="space-y-4" data-testid="clause-reader-skeleton">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          <div className="h-3 w-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-36 bg-muted animate-pulse rounded" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-1.5 bg-muted animate-pulse rounded-full" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border rounded-lg border-l-4 border-l-muted p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
            <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
            <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
          </div>
          <div className="h-3 w-3/4 bg-muted animate-pulse rounded ml-6" />
        </div>
      ))}
    </div>
  );
}
