import { AlertTriangle } from "lucide-react";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-border ${className}`}>
      <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground">
        I'm not a lawyer. This is informational, not legal advice. For important decisions, consult a qualified attorney.
      </p>
    </div>
  );
}
