import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface OverallAssessmentProps {
  assessment: string;
  riskCount: number;
  highRiskCount: number;
}

export function OverallAssessment({ assessment, riskCount, highRiskCount }: OverallAssessmentProps) {
  const getStatusInfo = () => {
    if (highRiskCount > 0) {
      return {
        icon: AlertTriangle,
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
        iconColor: "text-red-500",
        title: "Significant Concerns Found",
      };
    }
    if (riskCount > 0) {
      return {
        icon: Shield,
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        borderColor: "border-amber-200 dark:border-amber-800",
        iconColor: "text-amber-500",
        title: "Review Recommended",
      };
    }
    return {
      icon: CheckCircle,
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-800",
      iconColor: "text-green-500",
      title: "Appears Reasonable",
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <Card className={`${status.bgColor} ${status.borderColor} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${status.bgColor}`}>
            <Icon className={`h-6 w-6 ${status.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2" data-testid="text-overall-title">
              {status.title}
            </h3>
            <p className="text-muted-foreground" data-testid="text-overall-assessment">
              {assessment}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
