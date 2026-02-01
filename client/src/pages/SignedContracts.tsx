import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle, 
  ArrowLeft,
  Check,
  AlertTriangle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ContractObligation, SignedContract, Contract } from "@shared/schema";

interface SignedContractWithDetails extends SignedContract {
  obligations: ContractObligation[];
  contract: Contract;
}

export default function SignedContracts() {
  return <SignedContractsList />;
}

function SignedContractsList() {
  const { data: signedContracts = [], isLoading } = useQuery<SignedContract[]>({
    queryKey: ["/api/signed-contracts"],
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Signed Contracts</h1>
        </div>
        <p className="text-muted-foreground">
          Contracts you've signed and are monitoring for deadlines and obligations.
        </p>
      </div>

      {signedContracts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Signed Contracts Yet</h3>
            <p className="text-muted-foreground mb-4">
              When you mark a contract as signed, it will appear here with deadline tracking.
            </p>
            <Link href="/history">
              <Button data-testid="button-view-analyzed">View Analyzed Contracts</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {signedContracts.map((sc) => (
            <Link key={sc.id} href={`/signed-contracts/${sc.id}`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`signed-contract-card-${sc.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{sc.counterpartyName || "Signed Contract"}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Signed {new Date(sc.signedDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant={sc.status === "active" ? "default" : "secondary"}>
                      {sc.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SignedContractDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0");

  const { data: signedContract, isLoading } = useQuery<SignedContractWithDetails>({
    queryKey: ["/api/signed-contracts", id],
  });

  const completeMutation = useMutation({
    mutationFn: async (obligationId: number) => {
      const response = await apiRequest("PATCH", `/api/obligations/${obligationId}`, {
        status: "completed",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signed-contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/obligations/upcoming"] });
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!signedContract) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-16 text-muted-foreground">Contract not found</div>
      </div>
    );
  }

  const getDaysUntil = (date: Date | string | null) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const now = new Date();
    return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string, dueDate: Date | string | null) => {
    if (status === "completed") {
      return <Badge variant="default">Completed</Badge>;
    }
    if (status === "missed") {
      return <Badge variant="destructive">Missed</Badge>;
    }
    
    const days = getDaysUntil(dueDate);
    if (days !== null && days < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    if (days !== null && days <= 7) {
      return <Badge variant="secondary">Due Soon</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Link href="/signed-contracts">
        <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-to-list">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Signed Contracts
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{signedContract.counterpartyName || "Contract"}</h1>
            <p className="text-muted-foreground">
              Signed on {new Date(signedContract.signedDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Obligations & Deadlines
          </CardTitle>
          <CardDescription>Track your responsibilities for this contract</CardDescription>
        </CardHeader>
        <CardContent>
          {signedContract.obligations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">No tracked obligations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {signedContract.obligations.map((obligation) => (
                <div
                  key={obligation.id}
                  className={`p-4 rounded-lg border ${
                    obligation.status === "completed" ? "bg-muted/30" : "bg-card"
                  }`}
                  data-testid={`obligation-item-${obligation.id}`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${obligation.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                          {obligation.title}
                        </span>
                        {getStatusBadge(obligation.status || "pending", obligation.dueDate)}
                        <Badge variant="outline" className="text-xs">{obligation.type}</Badge>
                      </div>
                      {obligation.description && (
                        <p className="text-sm text-muted-foreground">{obligation.description}</p>
                      )}
                      {obligation.dueDate && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(obligation.dueDate).toLocaleDateString()}
                          {obligation.isRecurring && (
                            <span className="ml-2">({obligation.recurringInterval})</span>
                          )}
                        </div>
                      )}
                    </div>
                    {obligation.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => completeMutation.mutate(obligation.id)}
                        disabled={completeMutation.isPending}
                        data-testid={`button-complete-${obligation.id}`}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {signedContract.contract && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Original Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/contract/${signedContract.contract.id}`}>
              <Button variant="outline" data-testid="button-view-analysis">
                <FileText className="mr-2 h-4 w-4" />
                View Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
