import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/Logo";
import { AlertCircle, Clock, Eye, AlertTriangle, Shield, CheckCircle, XCircle } from "lucide-react";

interface SharedSummary {
  summary: {
    contractName: string;
    verdict: "Safe" | "Caution" | "High Risk" | "Do Not Sign";
    riskScore: number;
    topRisks: string[];
    keyPoints: string[];
    recommendation: string;
  };
  createdAt: string;
  viewCount: number;
}

export default function SharedSummaryView() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const { data, isLoading, error, status } = useQuery<SharedSummary>({
    queryKey: ["/api/shared", token],
    queryFn: async () => {
      const response = await fetch(`/api/shared/${token}`);
      if (response.status === 404) {
        throw new Error("NOT_FOUND");
      }
      if (response.status === 410) {
        throw new Error("EXPIRED");
      }
      if (!response.ok) {
        throw new Error("FAILED");
      }
      return response.json();
    },
    enabled: !!token,
  });

  const getVerdictConfig = (verdict: string) => {
    switch (verdict) {
      case "Safe":
        return {
          icon: CheckCircle,
          bgColor: "bg-green-50 dark:bg-green-900/20",
          borderColor: "border-green-200 dark:border-green-800",
          iconColor: "text-green-600 dark:text-green-400",
          badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
          circleClass: "text-green-500",
        };
      case "Caution":
        return {
          icon: Shield,
          bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          iconColor: "text-yellow-600 dark:text-yellow-400",
          badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
          circleClass: "text-yellow-500",
        };
      case "High Risk":
        return {
          icon: AlertTriangle,
          bgColor: "bg-orange-50 dark:bg-orange-900/20",
          borderColor: "border-orange-200 dark:border-orange-800",
          iconColor: "text-orange-600 dark:text-orange-400",
          badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
          circleClass: "text-orange-500",
        };
      case "Do Not Sign":
        return {
          icon: XCircle,
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
          iconColor: "text-red-600 dark:text-red-400",
          badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
          circleClass: "text-red-500",
        };
      default:
        return {
          icon: Shield,
          bgColor: "bg-muted",
          borderColor: "border-muted",
          iconColor: "text-muted-foreground",
          badgeClass: "",
          circleClass: "text-primary",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 flex items-center justify-center">
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
          <Skeleton className="h-8 w-48 mx-auto mb-8" />
          <Skeleton className="h-64 mb-6" />
          <Skeleton className="h-48 mb-6" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "FAILED";
    
    if (errorMessage === "NOT_FOUND") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex gap-3 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
                <h1 className="text-2xl font-bold text-foreground">Share Link Not Found</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                The share link you're looking for doesn't exist. It may have been deleted or the link is incorrect.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (errorMessage === "EXPIRED") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex gap-3 mb-4">
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400 shrink-0" />
                <h1 className="text-2xl font-bold text-foreground">Share Link Expired</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                This share link has expired. Please ask the contract owner to generate a new share link.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex gap-3 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
              <h1 className="text-2xl font-bold text-foreground">Error</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Something went wrong loading this summary. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const verdictConfig = getVerdictConfig(data.summary.verdict);
  const VerdictIcon = verdictConfig.icon;
  const createdDate = new Date(data.createdAt);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = createdDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        <h1 className="text-3xl font-bold text-center mb-8 text-foreground">
          Shared Contract Summary
        </h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl" data-testid="text-contract-name">
              {data.summary.contractName}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className={`mb-6 border-2 ${verdictConfig.bgColor} ${verdictConfig.borderColor}`} data-testid="verdict-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <VerdictIcon className={`h-6 w-6 ${verdictConfig.iconColor}`} />
                <span>Verdict</span>
              </div>
              <Badge className={verdictConfig.badgeClass} data-testid="verdict-badge">
                {data.summary.verdict}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-foreground">Risk Score</span>
                <span className="text-2xl font-bold" data-testid="risk-score">
                  {data.summary.riskScore}/100
                </span>
              </div>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={`${(data.summary.riskScore / 100) * 283} 283`}
                      className={`${verdictConfig.circleClass} transition-all`}
                    />
                  </svg>
                  <span className={`text-4xl font-bold ${verdictConfig.circleClass}`} data-testid="risk-circle">
                    {data.summary.riskScore}
                  </span>
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {data.summary.riskScore < 25
                  ? "Low Risk"
                  : data.summary.riskScore < 50
                    ? "Moderate Risk"
                    : data.summary.riskScore < 75
                      ? "High Risk"
                      : "Critical Risk"}
              </div>
            </div>
          </CardContent>
        </Card>

        {data.summary.topRisks.length > 0 && (
          <Card className="mb-6" data-testid="top-risks-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Top Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.summary.topRisks.map((risk, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm"
                    data-testid={`top-risk-item-${i}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-destructive shrink-0 mt-2" />
                    <span className="text-foreground">{risk}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {data.summary.keyPoints.length > 0 && (
          <Card className="mb-6" data-testid="key-points-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                Key Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.summary.keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm"
                    data-testid={`key-point-item-${i}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400 shrink-0 mt-2" />
                    <span className="text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6" data-testid="recommendation-card">
          <CardHeader>
            <CardTitle>Recommendation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed" data-testid="recommendation-text">
              {data.summary.recommendation}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-muted/50" data-testid="metadata-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Shared On</p>
                <p className="font-medium text-foreground" data-testid="shared-date">
                  {formattedDate}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="shared-time">
                  {formattedTime}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  Views
                </p>
                <p className="font-medium text-foreground" data-testid="view-count">
                  {data.viewCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground leading-relaxed" data-testid="disclaimer">
            This summary was generated by RedlineIQ. This is informational only and does not
            constitute legal advice.
          </p>
        </div>
      </div>
    </div>
  );
}
