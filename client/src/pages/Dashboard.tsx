import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  FileText,
  ChevronRight,
  Bell,
  CheckCircle2,
  Zap,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Camera,
  AlertCircle,
  Clock,
  Eye,
  Siren,
  User,
  Bot,
  CircleDot,
} from "lucide-react";
import type { ScreenshotAnalysis } from "@shared/schema";

interface AlertItem {
  id: number;
  title: string;
  alertReason: string;
  itemType: "contract_obligation" | "recurring" | "exit_window";
  description?: string;
  dueDate?: string;
}

interface CommandCenterData {
  alerts: {
    urgent: AlertItem[];
    dueSoon: AlertItem[];
    safe: AlertItem[];
  };
  recentScans: {
    id: number;
    inputText: string;
    inputType: string;
    analysis: ScreenshotAnalysis | null;
    createdAt: string;
  }[];
  recentChats: {
    role: "user" | "assistant";
    content: string;
  }[];
  recurringObligations: {
    id: number;
    title: string;
    category: string;
    nextDueDate: string | null;
    amount: string | null;
    status: string;
  }[];
  contractsCount: number;
  analyzedCount: number;
  legalScore: number;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<CommandCenterData>({
    queryKey: ["/api/command-center"],
  });

  const score = data?.legalScore ?? 50;

  const getScoreColor = (s: number) => {
    if (s >= 75) return "text-primary";
    if (s >= 50) return "text-secondary-foreground";
    return "text-destructive";
  };

  const getScoreGradient = (s: number) => {
    if (s >= 75) return "from-primary/20 to-primary/5";
    if (s >= 50) return "from-secondary/30 to-secondary/10";
    return "from-destructive/20 to-destructive/5";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 75) return "Protected";
    if (s >= 50) return "Moderate";
    if (s >= 25) return "At Risk";
    return "Vulnerable";
  };

  const getRiskBadgeVariant = (level: string | undefined) => {
    if (level === "danger") return "destructive" as const;
    if (level === "caution") return "secondary" as const;
    return "default" as const;
  };

  const getRiskLabel = (level: string | undefined) => {
    if (level === "danger") return "Danger";
    if (level === "caution") return "Caution";
    return "Safe";
  };

  const getRiskIcon = (level: string | undefined) => {
    if (level === "danger") return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (level === "caution") return <AlertCircle className="h-4 w-4 text-secondary-foreground" />;
    return <CheckCircle2 className="h-4 w-4 text-primary" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-full pb-4 space-y-6">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const alerts = data?.alerts ?? { urgent: [], dueSoon: [], safe: [] };
  const totalAlerts = alerts.urgent.length + alerts.dueSoon.length + alerts.safe.length;

  return (
    <div className="min-h-full pb-4">
      <div className={`relative rounded-2xl bg-gradient-to-br ${getScoreGradient(score)} p-6 mb-6`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${score * 2.51} 251`}
                className={getScoreColor(score)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor(score)}`} data-testid="text-legal-score">{score}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Shield className={`h-5 w-5 ${getScoreColor(score)}`} />
              <span className={`font-semibold ${getScoreColor(score)}`}>{getScoreLabel(score)}</span>
            </div>
            <h2 className="text-lg font-bold mb-1">Legal Safety Score</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
              <TrendingUp className="h-3 w-3" />
              <span data-testid="text-contracts-analyzed">{data?.analyzedCount ?? 0} analyzed</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card data-testid="card-contracts-count">
          <CardContent className="p-4 text-center">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl font-bold" data-testid="text-contracts-count">{data?.contractsCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Contracts</div>
          </CardContent>
        </Card>

        <Card data-testid="card-alerts-count">
          <CardContent className="p-4 text-center">
            <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-2 relative">
              <Bell className="h-4 w-4 text-destructive" />
              {alerts.urgent.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                </span>
              )}
            </div>
            <div className="text-xl font-bold" data-testid="text-alerts-count">{totalAlerts}</div>
            <div className="text-xs text-muted-foreground">Tracked</div>
          </CardContent>
        </Card>

        <Card data-testid="card-scans-count">
          <CardContent className="p-4 text-center">
            <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-2">
              <Camera className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div className="text-xl font-bold" data-testid="text-scans-count">{data?.recentScans?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Scans</div>
          </CardContent>
        </Card>
      </div>

      {alerts.urgent.length > 0 && (
        <div className="mb-6" data-testid="section-urgent-alerts">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Siren className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-medium text-destructive">Urgent</h3>
            <Badge variant="destructive" className="text-xs">{alerts.urgent.length}</Badge>
          </div>
          <div className="space-y-2">
            {alerts.urgent.map((item, idx) => (
              <Card key={`urgent-${item.id}-${idx}`} data-testid={`alert-urgent-${item.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.alertReason}</div>
                  </div>
                  <Badge variant="destructive" className="text-xs flex-shrink-0 no-default-hover-elevate">
                    {item.itemType === "exit_window" ? "Exit Window" : item.itemType === "recurring" ? "Recurring" : "Obligation"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {alerts.dueSoon.length > 0 && (
        <div className="mb-6" data-testid="section-due-soon-alerts">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Clock className="h-4 w-4 text-secondary-foreground" />
            <h3 className="text-sm font-medium text-secondary-foreground">Due Soon</h3>
            <Badge variant="secondary" className="text-xs">{alerts.dueSoon.length}</Badge>
          </div>
          <div className="space-y-2">
            {alerts.dueSoon.map((item, idx) => (
              <Card key={`due-${item.id}-${idx}`} data-testid={`alert-due-soon-${item.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.alertReason}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0 no-default-hover-elevate">
                    {item.itemType === "recurring" ? "Recurring" : "Obligation"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {alerts.safe.length > 0 && (
        <div className="mb-6" data-testid="section-safe-alerts">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Eye className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-primary">Monitored</h3>
            <Badge variant="default" className="text-xs">{alerts.safe.length}</Badge>
          </div>
          <div className="space-y-2">
            {alerts.safe.slice(0, 3).map((item, idx) => (
              <Card key={`safe-${item.id}-${idx}`} data-testid={`alert-safe-${item.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.alertReason}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {alerts.safe.length > 3 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{alerts.safe.length - 3} more monitored items
              </p>
            )}
          </div>
        </div>
      )}

      {totalAlerts === 0 && (
        <Card className="mb-6 border-dashed" data-testid="card-no-alerts">
          <CardContent className="py-8 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <p className="font-medium">All clear</p>
            <p className="text-sm text-muted-foreground mt-1">No obligations or deadlines to track yet</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/quick-scan">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="action-screenshot-intelligence">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mb-3">
                  <Camera className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-medium text-sm">Screenshot Intel</span>
                <span className="text-xs text-muted-foreground mt-0.5">Snap & analyze</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/negotiation-coach">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="action-advocate-chat">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/80 flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-medium text-sm">Advocate Chat</span>
                <span className="text-xs text-muted-foreground mt-0.5">Ask anything</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/signed-contracts">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="action-obligations">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-secondary-foreground" />
                </div>
                <span className="font-medium text-sm">Obligations</span>
                <span className="text-xs text-muted-foreground mt-0.5">Track deadlines</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/emergency">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="action-emergency">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-destructive flex items-center justify-center mb-3">
                  <Siren className="h-6 w-6 text-destructive-foreground" />
                </div>
                <span className="font-medium text-sm">Emergency</span>
                <span className="text-xs text-muted-foreground mt-0.5">Get help fast</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {data?.recentScans && data.recentScans.length > 0 && (
        <div className="mb-6" data-testid="section-recent-scans">
          <div className="flex items-center justify-between gap-4 mb-3 px-1">
            <h3 className="text-sm font-medium text-muted-foreground">Recent Scans</h3>
            <Link href="/quick-scan">
              <Button variant="ghost" size="sm" data-testid="button-view-all-scans">
                View All <ChevronRight className="ml-0.5 h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentScans.map((scan) => (
              <Card key={scan.id} data-testid={`scan-${scan.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getRiskIcon(scan.analysis?.riskLevel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {scan.analysis?.whatItIs || scan.inputText.slice(0, 60)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {scan.analysis?.summary || "Analysis pending"}
                    </div>
                  </div>
                  <Badge variant={getRiskBadgeVariant(scan.analysis?.riskLevel)} className="text-xs flex-shrink-0 no-default-hover-elevate">
                    {getRiskLabel(scan.analysis?.riskLevel)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {data?.recentChats && data.recentChats.length > 0 && (
        <div className="mb-6" data-testid="section-recent-chats">
          <div className="flex items-center justify-between gap-4 mb-3 px-1">
            <h3 className="text-sm font-medium text-muted-foreground">Recent Advocate Chat</h3>
            <Link href="/negotiation-coach">
              <Button variant="ghost" size="sm" data-testid="button-open-chat">
                Open Chat <ChevronRight className="ml-0.5 h-3 w-3" />
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
              {data.recentChats.map((msg, idx) => (
                <div key={idx} className="flex items-start gap-2" data-testid={`chat-message-${idx}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {msg.role === "user" ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {msg.role === "user" ? "You" : "Advocate"}
                    </span>
                    <p className="text-sm mt-0.5 line-clamp-2">{msg.content}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {data?.recurringObligations && data.recurringObligations.length > 0 && (
        <div data-testid="section-recurring">
          <div className="flex items-center justify-between gap-4 mb-3 px-1">
            <h3 className="text-sm font-medium text-muted-foreground">Active Recurring</h3>
            <Link href="/signed-contracts">
              <Button variant="ghost" size="sm" data-testid="button-view-recurring">
                Manage <ChevronRight className="ml-0.5 h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {data.recurringObligations.slice(0, 4).map((rec) => (
              <Card key={rec.id} data-testid={`recurring-${rec.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <CircleDot className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{rec.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {rec.category}{rec.amount ? ` · ${rec.amount}` : ""}
                    </div>
                  </div>
                  {rec.nextDueDate && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(rec.nextDueDate).toLocaleDateString()}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
