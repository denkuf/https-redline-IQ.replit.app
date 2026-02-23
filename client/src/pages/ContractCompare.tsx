import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowUp, ArrowDown, Upload, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contract } from "@shared/schema";

interface ComparisonResult {
  changes: Array<{
    type: "added" | "removed" | "modified";
    description: string;
    riskImpact: "increased" | "decreased" | "neutral";
  }>;
  newRiskScore: number;
  previousRiskScore: number;
  summary: string;
}

const getHighlight = (text: string, type: "added" | "removed" | "neutral") => {
  if (type === "added") {
    return <span className="bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 px-1 rounded">{text}</span>;
  } else if (type === "removed") {
    return <span className="bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 px-1 rounded line-through">{text}</span>;
  }
  return text;
};

export default function ContractCompare() {
  const params = useParams<{ id: string }>();
  const contractId = parseInt(params.id || "0");
  const [selectedContractId, setSelectedContractId] = useState<number | null>(contractId > 0 ? contractId : null);
  const [revisedFile, setRevisedFile] = useState<File | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [newContractId, setNewContractId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: selectedContract, isLoading: selectedContractLoading } = useQuery<Contract>({
    queryKey: ["/api/contracts", selectedContractId],
    enabled: selectedContractId !== null && selectedContractId > 0,
  });

  const { data: versions = [] } = useQuery<Contract[]>({
    queryKey: [`/api/contracts/${selectedContractId}/versions`],
    enabled: selectedContractId !== null && selectedContractId > 0,
  });

  const { data: newContract, isLoading: newContractLoading } = useQuery<Contract>({
    queryKey: ["/api/contracts", newContractId],
    enabled: newContractId !== null && newContractId > 0,
  });

  const compareMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/contracts/${selectedContractId}/compare`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to compare contracts");
      }

      return response.json() as Promise<{
        comparison: ComparisonResult;
        newContractId: number;
      }>;
    },
    onSuccess: (data) => {
      setComparison(data.comparison);
      setNewContractId(data.newContractId);
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Comparison completed",
        description: "Contract versions compared successfully",
      });
    },
    onError: () => {
      toast({
        title: "Comparison failed",
        description: "Unable to compare contracts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRevisedFile(e.target.files[0]);
    }
  };

  const handleCompare = () => {
    if (!selectedContractId || !revisedFile) {
      toast({
        title: "Missing information",
        description: "Please select a contract and upload a revised version",
        variant: "destructive",
      });
      return;
    }

    compareMutation.mutate(revisedFile);
  };

  const getRiskChangeColor = (impact: string) => {
    if (impact === "increased") return "text-red-600 dark:text-red-400";
    if (impact === "decreased") return "text-green-600 dark:text-green-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getRiskChangeIcon = (impact: string) => {
    if (impact === "increased") return <ArrowUp className="h-4 w-4" />;
    if (impact === "decreased") return <ArrowDown className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/history">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Compare Contracts</h1>
          <p className="text-muted-foreground">View changes between contract versions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-6 h-fit sticky top-6">
          <h2 className="font-semibold mb-4">Select Contract</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Original Contract</label>
              <Select
                value={selectedContractId?.toString() || ""}
                onValueChange={(value) => {
                  const id = parseInt(value);
                  setSelectedContractId(id);
                  setComparison(null);
                  setRevisedFile(null);
                  setNewContractId(null);
                }}
              >
                <SelectTrigger data-testid="select-contract">
                  <SelectValue placeholder="Choose a contract..." />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id.toString()}>
                      {contract.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedContract && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Contract</p>
                  <p className="font-medium truncate" data-testid="text-selected-contract">
                    {selectedContract.name}
                  </p>
                </div>

                {selectedContract.analysis?.verdict && (
                  <div>
                    <p className="text-xs text-muted-foreground">Current Risk Score</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" data-testid="text-current-risk">
                        {selectedContract.analysis.verdict.riskScore}
                      </span>
                      <Badge variant={
                        selectedContract.analysis.verdict.riskScore < 30
                          ? "outline"
                          : selectedContract.analysis.verdict.riskScore < 60
                          ? "secondary"
                          : "destructive"
                      }>
                        {selectedContract.analysis.verdict.verdict}
                      </Badge>
                    </div>
                  </div>
                )}

                {versions.length > 1 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Version History</p>
                    <div className="space-y-2">
                      {versions.map((v) => (
                        <div key={v.id} className="text-xs p-2 rounded bg-background border">
                          <p className="font-medium">v{v.version}</p>
                          <p className="text-muted-foreground">
                            {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "Unknown date"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Upload Revised Version</h3>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-upload"
              />

              {revisedFile ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{revisedFile.name}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevisedFile(null)}
                    data-testid="button-clear-file"
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full mb-3"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-revised"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              )}

              <Button
                onClick={handleCompare}
                disabled={!selectedContractId || !revisedFile || compareMutation.isPending || selectedContractLoading}
                className="w-full"
                data-testid="button-compare"
              >
                {compareMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  "Compare Versions"
                )}
              </Button>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {comparison && (
            <>
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Comparison Results</h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Original Risk Score</p>
                    <p className="text-2xl font-bold" data-testid="text-original-risk">
                      {comparison.previousRiskScore}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">New Risk Score</p>
                    <p className="text-2xl font-bold" data-testid="text-new-risk">
                      {comparison.newRiskScore}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium mb-2">Risk Change</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${
                      comparison.newRiskScore < comparison.previousRiskScore
                        ? "text-green-600 dark:text-green-400"
                        : comparison.newRiskScore > comparison.previousRiskScore
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {comparison.newRiskScore > comparison.previousRiskScore ? "+" : ""}
                      {comparison.newRiskScore - comparison.previousRiskScore}
                    </span>
                    {comparison.newRiskScore !== comparison.previousRiskScore && (
                      getRiskChangeIcon(
                        comparison.newRiskScore > comparison.previousRiskScore ? "increased" : "decreased"
                      )
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">Summary of Changes</h3>
                <p className="text-sm leading-relaxed mb-4" data-testid="text-comparison-summary">
                  {comparison.summary}
                </p>

                {comparison.changes.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Change Details</h4>
                    {comparison.changes.map((change, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-muted/50">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {change.type === "added"
                                  ? "Added"
                                  : change.type === "removed"
                                  ? "Removed"
                                  : "Modified"}
                              </Badge>
                              <span className={`text-xs font-medium flex items-center gap-1 ${getRiskChangeColor(
                                change.riskImpact
                              )}`}>
                                {getRiskChangeIcon(change.riskImpact)}
                                {change.riskImpact === "increased"
                                  ? "Increases Risk"
                                  : change.riskImpact === "decreased"
                                  ? "Decreases Risk"
                                  : "Neutral"}
                              </span>
                            </div>
                            <p className="text-sm" data-testid={`text-change-${idx}`}>
                              {change.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {newContract && newContract.analysis && (
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">New Version Analysis</h3>
                  <div className="space-y-4">
                    {newContract.analysis.verdict && (
                      <div className="p-4 rounded-lg bg-muted">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium">Overall Assessment</span>
                          <Badge variant={
                            newContract.analysis.verdict.riskScore < 30
                              ? "outline"
                              : newContract.analysis.verdict.riskScore < 60
                              ? "secondary"
                              : "destructive"
                          }>
                            {newContract.analysis.verdict.verdict}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {newContract.analysis.verdict.reasoning}
                        </p>
                      </div>
                    )}

                    {newContract.analysis.riskFlags && newContract.analysis.riskFlags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Key Risk Flags in New Version</h4>
                        <div className="space-y-2">
                          {newContract.analysis.riskFlags.slice(0, 3).map((flag, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                              {flag.severity === "High" ? (
                                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="text-sm">
                                <p className="font-medium">{flag.title}</p>
                                <p className="text-xs text-muted-foreground">{flag.explanation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button asChild className="w-full mt-4" data-testid="button-view-full-analysis">
                    <Link href={`/contract/${newContractId}`}>
                      View Full Analysis
                    </Link>
                  </Button>
                </Card>
              )}
            </>
          )}

          {!comparison && selectedContract && (
            <Card className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Ready to Compare</h3>
              <p className="text-muted-foreground mb-4">
                Upload the revised version of your contract to see the differences and impact on risk assessment
              </p>
            </Card>
          )}

          {!selectedContract && !comparison && (
            <Card className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <ArrowLeft className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Select a Contract</h3>
              <p className="text-muted-foreground">
                Choose a contract from the list on the left to get started with comparison
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
