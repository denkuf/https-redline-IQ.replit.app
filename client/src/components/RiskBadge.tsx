import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

type Severity = "Low" | "Medium" | "High";

interface RiskBadgeProps {
  severity: Severity;
  className?: string;
}

const severityConfig = {
  Low: {
    variant: "secondary" as const,
    icon: Info,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  Medium: {
    variant: "secondary" as const,
    icon: AlertCircle,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  High: {
    variant: "destructive" as const,
    icon: AlertTriangle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function RiskBadge({ severity, className = "" }: RiskBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {severity}
    </Badge>
  );
}
