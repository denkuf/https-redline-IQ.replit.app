import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronRight, Trash2, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Contract } from "@shared/schema";

interface ContractCardProps {
  contract: Contract;
  onDelete?: (id: number) => void;
}

export function ContractCard({ contract, onDelete }: ContractCardProps) {
  const statusConfig = {
    pending: { label: "Pending", icon: Clock, color: "bg-muted text-muted-foreground" },
    analyzing: { label: "Analyzing", icon: Clock, color: "bg-primary/10 text-primary" },
    completed: { label: "Analyzed", icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    error: { label: "Error", icon: AlertTriangle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  };

  const status = statusConfig[contract.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  const riskCount = contract.analysis?.riskFlags?.length || 0;
  const highRiskCount = contract.analysis?.riskFlags?.filter((r) => r.severity === "High").length || 0;

  return (
    <Card className="hover-elevate transition-all duration-200 border-border/40" data-testid={`contract-card-${contract.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate" data-testid={`contract-name-${contract.id}`}>
                  {contract.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {contract.type !== "unknown" ? contract.type : "Contract"}
                </p>
              </div>
              <Badge className={`${status.color} text-[10px]`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(contract.createdAt), { addSuffix: true })}
              </span>
              
              {contract.status === "completed" && riskCount > 0 && (
                <span className="text-[11px] flex items-center gap-1">
                  <AlertTriangle className={`h-3 w-3 ${highRiskCount > 0 ? "text-red-500" : "text-amber-500"}`} />
                  {riskCount} risk{riskCount !== 1 ? "s" : ""} found
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3.5">
              <Link href={`/contract/${contract.id}`}>
                <Button size="sm" data-testid={`button-view-${contract.id}`}>
                  View Analysis
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(contract.id)}
                  data-testid={`button-delete-${contract.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
