import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfidenceIndicatorProps {
  confidence: number;
}

export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const percentage = Math.round(confidence * 100);
  const isLow = confidence < 0.7;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isLow ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className={`text-xs ${isLow ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            {percentage}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {isLow
            ? "Lower confidence - consider professional review"
            : "High confidence in this assessment"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
