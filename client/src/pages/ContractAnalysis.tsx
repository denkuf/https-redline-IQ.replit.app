import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, AlertTriangle, ClipboardList, Download, GitCompare, Share2, RefreshCw, Upload } from "lucide-react";
import { AnalysisSummary } from "@/components/AnalysisSummary";
import { KeyTermsTable } from "@/components/KeyTermsTable";
import { RiskFlags } from "@/components/RiskFlags";
import { ClarifyingQuestions } from "@/components/ClarifyingQuestions";
import { ContractViewer } from "@/components/ContractViewer";
import { OverallAssessment } from "@/components/OverallAssessment";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { ExportButton } from "@/components/ExportButton";
import { Disclaimer } from "@/components/Disclaimer";
import { VerdictPanel } from "@/components/VerdictPanel";
import { TrustSeal } from "@/components/TrustSeal";
import { WhatIfSimulator } from "@/components/WhatIfSimulator";
import { ShareSafeSummary } from "@/components/ShareSafeSummary";
import { VisualRiskHeatmap } from "@/components/VisualRiskHeatmap";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { industryModeLabels, type Contract, type Verdict } from "@shared/schema";

export default function ContractAnalysis() {
  const params = useParams<{ id: string }>();
  const contractId = parseInt(params.id || "0");
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [explanation, setExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [showReupload, setShowReupload] = useState(false);

  const { data: contract, isLoading, refetch } = useQuery<Contract>({
    queryKey: ["/api/contracts", contractId],
    enabled: contractId > 0,
    refetchInterval: (query) => {
      const data = query.state.data as Contract | undefined;
      if (data?.status === "analyzing" || data?.status === "pending") {
        return 2000;
      }
      return false;
    },
  });

  const answerMutation = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      const res = await apiRequest("POST", `/api/contracts/${contractId}/answers`, { answers });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", contractId] });
    },
  });

  const reAnalyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/contracts/${contractId}/compare`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Re-analysis failed");
      return res.json();
    },
    onSuccess: (data: { newContractId?: number; comparison?: any }) => {
      toast({ title: "Re-analysis complete", description: "New version created and compared." });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", contractId] });
      if (data.newContractId) {
        queryClient.invalidateQueries({ queryKey: ["/api/contracts", data.newContractId] });
      }
      navigate(`/compare/${data.newContractId || contractId}`);
    },
    onError: () => {
      toast({ title: "Re-analysis failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/contracts/${contractId}/share`);
      return res.json();
    },
    onSuccess: (data: { shareUrl: string }) => {
      navigator.clipboard.writeText(window.location.origin + data.shareUrl);
      toast({ title: "Share link copied!", description: "The link has been copied to your clipboard." });
    },
    onError: () => {
      toast({ title: "Failed to create share link", variant: "destructive" });
    },
  });

  const handleReupload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      reAnalyzeMutation.mutate(file);
      setShowReupload(false);
    }
  };

  const handleExplainSelection = async (text: string) => {
    setIsExplaining(true);
    try {
      const response = await apiRequest("POST", `/api/contracts/${contractId}/explain`, { text });
      const data = await response.json();
      setExplanation(data.explanation);
    } catch (error) {
      setExplanation("Unable to explain this selection. Please try again.");
    } finally {
      setIsExplaining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <AnalysisLoading />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Contract Not Found</h2>
        <p className="text-muted-foreground mb-6">This contract may have been deleted.</p>
        <Link href="/">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
        </Link>
      </div>
    );
  }

  const isAnalyzing = contract.status === "analyzing" || contract.status === "pending";
  const analysis = contract.analysis;
  const hasQuestions = analysis?.clarifyingQuestions?.some((q) => !q.answer);

  return (
    <div className="max-w-5xl mx-auto w-full" style={{ overflowWrap: "break-word" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href="/history">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-2xl font-bold truncate" data-testid="text-contract-name">
              {contract.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground text-sm">
                {contract.type !== "unknown" ? contract.type : "Contract Analysis"}
              </span>
              {contract.industryMode && contract.industryMode !== "general" && (
                <Badge variant="outline" className="text-xs">
                  {industryModeLabels[contract.industryMode as keyof typeof industryModeLabels] || contract.industryMode}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {!isAnalyzing && analysis && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
              data-testid="button-share-contract"
            >
              <Share2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Link href={`/compare/${contractId}`}>
              <Button variant="outline" size="sm" data-testid="button-compare-contract">
                <GitCompare className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Compare</span>
              </Button>
            </Link>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReupload(!showReupload)}
                disabled={reAnalyzeMutation.isPending}
                data-testid="button-reanalyze"
              >
                {reAnalyzeMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                <span className="hidden sm:inline">Re-analyze</span>
              </Button>
              {showReupload && (
                <div className="absolute right-0 top-full mt-2 z-10 bg-card border rounded-lg p-3 shadow-lg min-w-[200px]">
                  <p className="text-sm text-muted-foreground mb-2">Upload revised version</p>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleReupload}
                    className="text-sm w-full"
                    data-testid="input-reupload-file"
                  />
                </div>
              )}
            </div>
            <ExportButton contract={contract} />
            {analysis.riskFlags?.some(r => r.negotiation) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/contracts/${contractId}/export/negotiation-pack`, "_blank")}
                data-testid="button-export-negotiation-pack"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Negotiation Pack</span>
                <span className="sm:hidden">Pack</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {isAnalyzing ? (
        <AnalysisLoading />
      ) : !analysis ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Analysis not available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {hasQuestions && analysis.clarifyingQuestions && (
            <ClarifyingQuestions
              questions={analysis.clarifyingQuestions.filter((q) => !q.answer)}
              onAnswer={(answers) => answerMutation.mutate(answers)}
              isSubmitting={answerMutation.isPending}
            />
          )}

          {analysis.verdict && (
            <VerdictPanel verdict={analysis.verdict as Verdict} />
          )}

          {analysis.overallAssessment && !analysis.verdict && (
            <OverallAssessment
              assessment={analysis.overallAssessment}
              riskCount={analysis.riskFlags?.length || 0}
              highRiskCount={analysis.riskFlags?.filter((r) => r.severity === "High").length || 0}
            />
          )}

          <Tabs defaultValue="summary" className="space-y-4 md:space-y-6">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="summary" className="text-xs sm:text-sm px-1 sm:px-3 py-2" data-testid="tab-summary">
                <FileText className="h-4 w-4 hidden sm:block sm:mr-1" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="terms" className="text-xs sm:text-sm px-1 sm:px-3 py-2" data-testid="tab-terms">
                <ClipboardList className="h-4 w-4 hidden sm:block sm:mr-1" />
                Terms
              </TabsTrigger>
              <TabsTrigger value="risks" className="text-xs sm:text-sm px-1 sm:px-3 py-2" data-testid="tab-risks">
                <AlertTriangle className="h-4 w-4 hidden sm:block sm:mr-1" />
                Risks
                {analysis.riskFlags?.length > 0 && (
                  <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1 py-0.5 rounded-full leading-none">
                    {analysis.riskFlags.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="text-xs sm:text-sm px-1 sm:px-3 py-2" data-testid="tab-heatmap">
                Map
              </TabsTrigger>
              <TabsTrigger value="document" className="text-xs sm:text-sm px-1 sm:px-3 py-2" data-testid="tab-document">
                <FileText className="h-4 w-4 hidden sm:block sm:mr-1" />
                Doc
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <AnalysisSummary summary={analysis.summary} />
            </TabsContent>

            <TabsContent value="terms">
              <KeyTermsTable keyTerms={analysis.keyTerms || []} />
            </TabsContent>

            <TabsContent value="risks">
              <RiskFlags 
                riskFlags={analysis.riskFlags || []} 
                contractType={contract.type || "general"}
                industryMode={contract.industryMode || "general"}
              />
            </TabsContent>

            <TabsContent value="heatmap">
              <VisualRiskHeatmap 
                contractText={contract.extractedText}
                riskFlags={analysis.riskFlags || []}
              />
            </TabsContent>

            <TabsContent value="document">
              <ContractViewer
                text={contract.extractedText}
                onExplainSelection={handleExplainSelection}
                isExplaining={isExplaining}
                explanation={explanation}
              />
            </TabsContent>
          </Tabs>

          <WhatIfSimulator contractId={contractId} />

          <div className="flex flex-wrap items-center gap-4">
            <ShareSafeSummary contractId={contractId} />
          </div>

          <TrustSeal />

          <Disclaimer className="mt-8" />
        </div>
      )}
    </div>
  );
}
