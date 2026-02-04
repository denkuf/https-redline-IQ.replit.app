import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  Shield, 
  FileText, 
  ChevronRight,
  Bell,
  CheckCircle2,
  Zap,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  TrendingUp
} from "lucide-react";
import type { ContractObligation, SignedContract, Contract } from "@shared/schema";

interface UpcomingObligation extends ContractObligation {
  contract?: Contract;
  signedContract?: SignedContract;
}

export default function Dashboard() {
  const { data: upcomingObligations = [], isLoading: loadingObligations } = useQuery<ContractObligation[]>({
    queryKey: ["/api/obligations/upcoming"],
  });

  const { data: signedContracts = [], isLoading: loadingContracts } = useQuery<SignedContract[]>({
    queryKey: ["/api/signed-contracts"],
  });

  const { data: legalScore } = useQuery<{ currentScore: number; contractsAnalyzed: number }>({
    queryKey: ["/api/legal-score"],
  });

  const { data: expiryRadar } = useQuery<{ alerts: ContractObligation[]; activeContracts: number }>({
    queryKey: ["/api/expiry-radar"],
  });

  const score = legalScore?.currentScore || 50;
  const contractsAnalyzed = legalScore?.contractsAnalyzed || 0;

  const getDaysUntil = (date: Date | string | null) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const now = new Date();
    const diff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-primary";
    if (score >= 50) return "text-secondary-foreground";
    if (score >= 25) return "text-destructive";
    return "text-destructive";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 75) return "from-primary/20 to-primary/5";
    if (score >= 50) return "from-secondary/30 to-secondary/10";
    if (score >= 25) return "from-destructive/20 to-destructive/5";
    return "from-destructive/20 to-destructive/5";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return "Protected";
    if (score >= 50) return "Moderate";
    if (score >= 25) return "At Risk";
    return "Vulnerable";
  };

  const getUrgencyStyle = (days: number | null) => {
    if (days === null) return { bg: "bg-muted", text: "text-muted-foreground", label: "No date", variant: "secondary" as const };
    if (days < 0) return { bg: "bg-destructive/10", text: "text-destructive", label: "Overdue", variant: "destructive" as const };
    if (days <= 3) return { bg: "bg-destructive/10", text: "text-destructive", label: `${days}d left`, variant: "destructive" as const };
    if (days <= 7) return { bg: "bg-secondary", text: "text-secondary-foreground", label: `${days}d left`, variant: "secondary" as const };
    if (days <= 14) return { bg: "bg-secondary", text: "text-secondary-foreground", label: `${days}d left`, variant: "secondary" as const };
    return { bg: "bg-primary/10", text: "text-primary", label: `${days}d left`, variant: "default" as const };
  };

  return (
    <div className="min-h-full pb-4">
      {/* Hero Score Section */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getScoreGradient(score)} p-6 mb-6`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-center gap-6">
          {/* Circular Score */}
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
          
          {/* Score Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Shield className={`h-5 w-5 ${getScoreColor(score)}`} />
              <span className={`font-semibold ${getScoreColor(score)}`}>{getScoreLabel(score)}</span>
            </div>
            <h2 className="text-lg font-bold mb-1">Legal Safety Score</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span data-testid="text-contracts-analyzed">{contractsAnalyzed} contracts analyzed</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="overflow-hidden" data-testid="card-active-contracts">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </div>
            <div className="text-2xl font-bold mb-0.5" data-testid="text-active-contracts">{signedContracts.length}</div>
            <div className="text-xs text-muted-foreground">Contracts monitored</div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden" data-testid="card-upcoming-deadlines">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-destructive" />
              </div>
              {upcomingObligations.length > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
              )}
            </div>
            <div className="text-2xl font-bold mb-0.5" data-testid="text-upcoming-deadlines">{upcomingObligations.length}</div>
            <div className="text-xs text-muted-foreground">Upcoming deadlines</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="action-analyze-contract">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-medium text-sm">Analyze Contract</span>
                <span className="text-xs text-muted-foreground mt-0.5">Upload & scan</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/quick-scan">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="action-quick-scan">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/80 flex items-center justify-center mb-3">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-medium text-sm">Quick Scan</span>
                <span className="text-xs text-muted-foreground mt-0.5">Paste any text</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/negotiation-coach">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="action-negotiation">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-secondary-foreground" />
                </div>
                <span className="font-medium text-sm">Negotiation</span>
                <span className="text-xs text-muted-foreground mt-0.5">Get responses</span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/emergency">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="action-emergency">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-destructive flex items-center justify-center mb-3">
                  <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
                </div>
                <span className="font-medium text-sm">Emergency</span>
                <span className="text-xs text-muted-foreground mt-0.5">Get help fast</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Upcoming Obligations */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-medium text-muted-foreground">Upcoming Obligations</h3>
          <Link href="/signed-contracts">
            <Button variant="ghost" size="sm" className="h-7 text-xs" data-testid="button-view-all-obligations">
              View All <ChevronRight className="ml-0.5 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {loadingObligations ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </CardContent>
          </Card>
        ) : upcomingObligations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">No upcoming deadlines</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingObligations.slice(0, 4).map((obligation) => {
              const days = getDaysUntil(obligation.dueDate);
              const urgency = getUrgencyStyle(days);
              return (
                <Card key={obligation.id} className="overflow-hidden" data-testid={`obligation-${obligation.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${urgency.bg} flex items-center justify-center flex-shrink-0`}>
                      {obligation.type === "payment" ? (
                        <span className={`font-bold ${urgency.text}`}>$</span>
                      ) : obligation.type === "renewal" ? (
                        <Calendar className={`h-5 w-5 ${urgency.text}`} />
                      ) : obligation.type === "termination_window" ? (
                        <Clock className={`h-5 w-5 ${urgency.text}`} />
                      ) : (
                        <FileText className={`h-5 w-5 ${urgency.text}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{obligation.title}</div>
                      {obligation.description && (
                        <div className="text-xs text-muted-foreground truncate">{obligation.description}</div>
                      )}
                    </div>
                    <Badge variant={urgency.variant} className="text-xs flex-shrink-0">
                      {urgency.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Contracts */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-medium text-muted-foreground">Signed Contracts</h3>
          <Link href="/signed-contracts">
            <Button variant="ghost" size="sm" className="h-7 text-xs" data-testid="button-view-all-contracts">
              View All <ChevronRight className="ml-0.5 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {loadingContracts ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </CardContent>
          </Card>
        ) : signedContracts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium">No contracts yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start tracking signed contracts</p>
              <Link href="/">
                <Button size="sm" className="mt-4" data-testid="button-upload-first">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upload Your First
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {signedContracts.slice(0, 4).map((sc) => (
              <Link key={sc.id} href={`/signed-contracts/${sc.id}`}>
                <Card className="overflow-hidden hover-elevate cursor-pointer" data-testid={`signed-contract-${sc.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{sc.counterpartyName || "Contract"}</div>
                      <div className="text-xs text-muted-foreground">
                        Signed {new Date(sc.signedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={sc.status === "active" ? "default" : "secondary"} className="text-xs">
                        {sc.status}
                      </Badge>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Expiry Radar Alerts */}
      {expiryRadar?.alerts && expiryRadar.alerts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Expiry Radar</h3>
          <div className="space-y-2">
            {expiryRadar.alerts.slice(0, 3).map((alert) => {
              const days = getDaysUntil(alert.dueDate);
              const isTermination = alert.type === "termination_window";
              return (
                <Card 
                  key={alert.id} 
                  className={`overflow-hidden border-l-4 ${isTermination ? "border-l-destructive" : "border-l-primary"}`}
                  data-testid={`expiry-alert-${alert.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-xl ${isTermination ? "bg-destructive/10" : "bg-primary/10"} flex items-center justify-center flex-shrink-0`}>
                        {isTermination ? (
                          <Clock className="h-5 w-5 text-destructive" />
                        ) : (
                          <Calendar className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{alert.title}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isTermination
                            ? "Window to cancel without penalty"
                            : "Contract auto-renews soon"}
                        </p>
                      </div>
                      {days !== null && (
                        <Badge variant={isTermination ? "destructive" : "default"} className="text-xs flex-shrink-0">
                          {days}d left
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
