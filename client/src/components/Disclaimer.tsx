import { Scale } from "lucide-react";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/50 ${className}`}>
      <Scale className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        This is informational, not legal advice. For important decisions, consult a qualified attorney.
      </p>
    </div>
  );
}
