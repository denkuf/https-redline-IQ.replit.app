import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Shield, 
  FileText, 
  ChevronRight,
  Bell,
  CheckCircle,
  TrendingUp,
  Radar
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

  const getDaysUntil = (date: Date | string | null) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const now = new Date();
    const diff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getUrgencyBadge = (days: number | null) => {
    if (days === null) return null;
    if (days < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (days <= 3) {
      return <Badge variant="destructive">Due in {days} days</Badge>;
    }
    if (days <= 7) {
      return <Badge variant="secondary">Due in {days} days</Badge>;
    }
    return <Badge variant="outline">Due in {days} days</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <span className="text-primary font-bold">$</span>;
      case "renewal":
        return <Calendar className="h-4 w-4 text-primary" />;
      case "termination_window":
        return <Clock className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Legal Guardian Dashboard</h1>
        <p className="text-muted-foreground">
          Your contracts, obligations, and legal safety at a glance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card data-testid="card-legal-score">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Legal Safety Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold" data-testid="text-legal-score">{legalScore?.currentScore || 50}/100</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span data-testid="text-contracts-analyzed">{legalScore?.contractsAnalyzed || 0} contracts analyzed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-contracts">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold" data-testid="text-active-contracts">{signedContracts.length}</div>
                <div className="text-sm text-muted-foreground">Signed and monitored</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-upcoming-deadlines">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <div className="text-3xl font-bold" data-testid="text-upcoming-deadlines">{upcomingObligations.length}</div>
                <div className="text-sm text-muted-foreground">In the next 30 days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Upcoming Obligations
                </CardTitle>
                <CardDescription>Deadlines you need to meet</CardDescription>
              </div>
              <Link href="/signed-contracts">
                <Button variant="ghost" size="sm" data-testid="button-view-all-obligations">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingObligations ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : upcomingObligations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">No upcoming deadlines</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingObligations.slice(0, 5).map((obligation) => (
                  <div
                    key={obligation.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                    data-testid={`obligation-${obligation.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {getTypeIcon(obligation.type)}
                      <div>
                        <div className="font-medium">{obligation.title}</div>
                        {obligation.description && (
                          <div className="text-sm text-muted-foreground">{obligation.description}</div>
                        )}
                      </div>
                    </div>
                    {getUrgencyBadge(getDaysUntil(obligation.dueDate))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Signed Contracts
                </CardTitle>
                <CardDescription>Contracts you're monitoring</CardDescription>
              </div>
              <Link href="/signed-contracts">
                <Button variant="ghost" size="sm" data-testid="button-view-all-contracts">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingContracts ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : signedContracts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No signed contracts yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Mark a contract as signed to start monitoring
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {signedContracts.slice(0, 5).map((sc) => (
                  <Link key={sc.id} href={`/signed-contracts/${sc.id}`}>
                    <div
                      className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                      data-testid={`signed-contract-${sc.id}`}
                    >
                      <div>
                        <div className="font-medium">{sc.counterpartyName || "Contract"}</div>
                        <div className="text-sm text-muted-foreground">
                          Signed {new Date(sc.signedDate).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="outline">{sc.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link href="/quick-scan" data-testid="link-quick-scan">
          <Card className="hover-elevate cursor-pointer h-full" data-testid="card-quick-scan-action">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Red Flag Shield</h3>
                <p className="text-sm text-muted-foreground">
                  Instantly scan any text for legal red flags
                </p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/negotiation-coach" data-testid="link-negotiation-coach">
          <Card className="hover-elevate cursor-pointer h-full" data-testid="card-negotiation-coach-action">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Negotiation Coach</h3>
                <p className="text-sm text-muted-foreground">
                  Get help responding during negotiations
                </p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {expiryRadar?.alerts && expiryRadar.alerts.length > 0 && (
        <Card className="mt-8" data-testid="card-expiry-radar">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-primary" />
              Contract Expiry Radar
            </CardTitle>
            <CardDescription>
              Important renewal and termination windows coming up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiryRadar.alerts.map((alert) => {
                const days = getDaysUntil(alert.dueDate);
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.type === "termination_window"
                        ? "bg-destructive/10 border-destructive"
                        : "bg-secondary/30 border-secondary"
                    }`}
                    data-testid={`expiry-alert-${alert.id}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {alert.type === "termination_window" ? (
                          <Clock className="h-5 w-5 text-destructive" />
                        ) : (
                          <Calendar className="h-5 w-5 text-primary" />
                        )}
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          {alert.description && (
                            <div className="text-sm text-muted-foreground">{alert.description}</div>
                          )}
                        </div>
                      </div>
                      {getUrgencyBadge(days)}
                    </div>
                    {days !== null && days <= 14 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {alert.type === "termination_window"
                          ? "This is your window to cancel without penalty. Act now if you don't want to continue."
                          : "This contract will auto-renew soon. Review the terms if you want to make changes."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
