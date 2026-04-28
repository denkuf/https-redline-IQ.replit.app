import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MissingClause } from "@shared/schema";

interface MissingClausesProps {
  missingClauses: MissingClause[];
}

const severityConfig = {
  High: {
    badge: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    border: "border-l-red-500",
    bg: "bg-red-50/50 dark:bg-red-950/20",
  },
  Medium: {
    badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    border: "border-l-amber-500",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
  },
  Low: {
    badge: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    border: "border-l-blue-400",
    bg: "bg-blue-50/30 dark:bg-blue-950/10",
  },
};

function MissingClauseItem({ clause }: { clause: MissingClause }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const config = severityConfig[clause.severity];

  const handleCopy = () => {
    navigator.clipboard.writeText(clause.sampleLanguage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast({ title: "Could not copy to clipboard", variant: "destructive" });
    });
  };

  return (
    <div
      className={`rounded-lg border-l-4 border border-border ${config.border} ${config.bg} transition-all`}
      data-testid={`missing-clause-${clause.clauseName.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <button
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ShieldAlert className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-sm truncate">{clause.clauseName}</span>
          <Badge className={`text-xs border shrink-0 ${config.badge}`}>
            {clause.severity}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">
            {clause.whyItMatters}
          </p>

          <div className="rounded-md bg-background border border-border/60 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sample language to propose
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs gap-1"
                onClick={handleCopy}
                data-testid={`button-copy-sample-${clause.clauseName.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {copied ? (
                  <><Check className="h-3 w-3" /> Copied</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy</>
                )}
              </Button>
            </div>
            <p className="text-sm text-foreground italic leading-relaxed">
              "{clause.sampleLanguage}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function MissingClauses({ missingClauses }: MissingClausesProps) {
  if (!missingClauses || missingClauses.length === 0) return null;

  const highCount = missingClauses.filter(m => m.severity === "High").length;
  const mediumCount = missingClauses.filter(m => m.severity === "Medium").length;

  return (
    <Card className="border-orange-200 dark:border-orange-900/50" data-testid="section-missing-clauses">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-950/40">
              <ShieldAlert className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-base text-orange-800 dark:text-orange-300">
                Missing Clauses
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Critical protections absent from this contract
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {highCount > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 text-xs border">
                {highCount} High
              </Badge>
            )}
            {mediumCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs border">
                {mediumCount} Medium
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          The following standard protections were not found in this contract. Their absence may increase your risk. Each entry includes sample language you can request the other party add before signing.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {missingClauses.map((clause, index) => (
          <MissingClauseItem key={`${clause.clauseName}-${index}`} clause={clause} />
        ))}
      </CardContent>
    </Card>
  );
}
