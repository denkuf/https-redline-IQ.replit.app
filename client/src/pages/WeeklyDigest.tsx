import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Zap,
  ChevronRight,
  Download,
} from "lucide-react";

interface DigestData {
  legalScore: number;
  urgentAlerts: number;
  dueSoonAlerts: number;
  activeObligations: number;
  contractsAnalyzedThisWeek: number;
  totalContracts: number;
  activeSignedContracts: number;
  upcomingDeadlines: Array<{
    title: string;
    alertReason: string;
    dueDate?: string;
    itemType: string;
  }>;
  autoRenewWarnings: Array<{
    title: string;
    provider: string;
    exitWindowEnd: string;
    cancellationNoticeDays: number;
  }>;
}

function ScoreIndicator({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 70) return "text-primary";
    if (s >= 40) return "text-secondary-foreground";
    return "text-destructive";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 70) return "Protected";
    if (s >= 40) return "Moderate Risk";
    return "High Risk";
  };

  const getScoreBgGradient = (s: number) => {
    if (s >= 70) return "from-primary/20 to-primary/5";
    if (s >= 40) return "from-secondary/30 to-secondary/10";
    return "from-destructive/20 to-destructive/5";
  };

  return (
    <div className={`relative rounded-xl bg-gradient-to-br ${getScoreBgGradient(score)} p-6 border`}>
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/20"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${score * 2.51} 251`}
              className={getScoreColor(score)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${getScoreColor(score)}`} data-testid="text-legal-score">
              {score}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`h-5 w-5 ${getScoreColor(score)}`} />
            <span className={`font-semibold text-sm ${getScoreColor(score)}`}>{getScoreLabel(score)}</span>
          </div>
          <h2 className="text-lg font-bold mb-2">Weekly Legal Health</h2>
          <p className="text-sm text-muted-foreground">
            Your comprehensive contract and obligation status for the week
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4 text-center">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="text-2xl font-bold" data-testid={`stat-${testId}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export default function WeeklyDigest() {
  const { data, isLoading } = useQuery<DigestData>({
    queryKey: ["/api/digest"],
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const score = data?.legalScore ?? 0;
  const urgentCount = data?.urgentAlerts ?? 0;
  const dueSoonCount = data?.dueSoonAlerts ?? 0;
  const hasAlerts = urgentCount > 0 || dueSoonCount > 0;
  const hasDeadlines = (data?.upcomingDeadlines?.length ?? 0) > 0;
  const hasAutoRenew = (data?.autoRenewWarnings?.length ?? 0) > 0;

  return (
    <div className="space-y-6 pb-4" data-testid="page-weekly-digest">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Weekly Digest</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your legal health summary and upcoming obligations
          </p>
        </div>
        <Button variant="outline" size="sm" data-testid="button-download-digest">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      <ScoreIndicator score={score} />

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Overview</h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={AlertTriangle}
            label="Urgent Alerts"
            value={urgentCount}
            testId="card-urgent-alerts"
          />
          <StatCard
            icon={Clock}
            label="Due Soon"
            value={dueSoonCount}
            testId="card-due-soon"
          />
          <StatCard
            icon={FileText}
            label="Active Obligations"
            value={data?.activeObligations ?? 0}
            testId="card-active-obligations"
          />
          <StatCard
            icon={TrendingUp}
            label="This Week"
            value={data?.contractsAnalyzedThisWeek ?? 0}
            testId="card-this-week"
          />
          <StatCard
            icon={FileText}
            label="Total Contracts"
            value={data?.totalContracts ?? 0}
            testId="card-total-contracts"
          />
          <StatCard
            icon={CheckCircle2}
            label="Signed Contracts"
            value={data?.activeSignedContracts ?? 0}
            testId="card-signed-contracts"
          />
        </div>
      </div>

      {hasAlerts && (
        <Card className="border-destructive/30" data-testid="section-active-alerts">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">Active Alerts</CardTitle>
              {(urgentCount > 0 || dueSoonCount > 0) && (
                <Badge variant="destructive" className="ml-auto text-xs">
                  {urgentCount + dueSoonCount}
                </Badge>
              )}
            </div>
            <CardDescription>
              Immediate action may be required for these items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentCount > 0 && (
                <div data-testid="alerts-urgent">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      Urgent ({urgentCount})
                    </span>
                  </div>
                </div>
              )}
              {dueSoonCount > 0 && (
                <div data-testid="alerts-due-soon">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Clock className="h-4 w-4 text-secondary-foreground" />
                    <span className="text-sm font-medium text-secondary-foreground">
                      Due Soon ({dueSoonCount})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!hasAlerts && (
        <Card className="border-dashed" data-testid="card-no-alerts">
          <CardContent className="py-8 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">No active alerts</p>
            <p className="text-sm text-muted-foreground mt-1">
              All your obligations are on track
            </p>
          </CardContent>
        </Card>
      )}

      {hasDeadlines && (
        <Card data-testid="section-upcoming-deadlines">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
              <Badge variant="default" className="ml-auto text-xs">
                {data?.upcomingDeadlines?.length ?? 0}
              </Badge>
            </div>
            <CardDescription>
              Important dates and obligations coming up this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.upcomingDeadlines?.map((deadline, idx) => {
                const isUrgent = urgentCount > 0 && idx < urgentCount;
                return (
                  <Card
                    key={`deadline-${idx}`}
                    className="border-0 bg-muted/50"
                    data-testid={`deadline-item-${idx}`}
                  >
                    <CardContent className="p-3 flex items-start gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isUrgent
                            ? "bg-destructive/10"
                            : "bg-secondary/10"
                        }`}
                      >
                        {isUrgent ? (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Clock className="h-5 w-5 text-secondary-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{deadline.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {deadline.alertReason}
                        </div>
                        {deadline.dueDate && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Due: {new Date(deadline.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={isUrgent ? "destructive" : "secondary"}
                        className="text-xs flex-shrink-0 no-default-hover-elevate"
                      >
                        {isUrgent ? "Urgent" : "Due Soon"}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!hasDeadlines && (
        <Card className="border-dashed" data-testid="card-no-deadlines">
          <CardContent className="py-8 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">No upcoming deadlines</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your obligations are well managed
            </p>
          </CardContent>
        </Card>
      )}

      {hasAutoRenew && (
        <Card data-testid="section-auto-renew-warnings">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-secondary-foreground" />
              <CardTitle className="text-lg">Auto-Renew Warnings</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">
                {data?.autoRenewWarnings?.length ?? 0}
              </Badge>
            </div>
            <CardDescription>
              Subscriptions with exit windows closing soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.autoRenewWarnings?.map((warning, idx) => (
                <Card
                  key={`warning-${idx}`}
                  className="border-0 bg-secondary/10"
                  data-testid={`auto-renew-item-${idx}`}
                >
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{warning.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Provider: {warning.provider}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                        <span>
                          Exit window closes:{" "}
                          {new Date(warning.exitWindowEnd).toLocaleDateString()}
                        </span>
                        <span>
                          ({warning.cancellationNoticeDays} days notice required)
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0"
                      data-testid={`button-review-auto-renew-${idx}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!hasAutoRenew && (
        <Card className="border-dashed" data-testid="card-no-auto-renew">
          <CardContent className="py-8 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium">No auto-renew warnings</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your subscriptions are within safe windows
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50 border-0" data-testid="section-digest-footer">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            Digest generated weekly. Updates reflect your latest contract analysis and obligations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
