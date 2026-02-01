import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, AlertTriangle, ClipboardList, Download } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";
import { industryModeLabels, type Contract, type Verdict } from "@shared/schema";

export default function ContractAnalysis() {
  const params = useParams<{ id: string }>();
  const contractId = parseInt(params.id || "0");
  const queryClient = useQueryClient();
  const [explanation, setExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);

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
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/history">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-contract-name">
              {contract.name}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
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
          <div className="flex items-center gap-2">
            <ExportButton contract={contract} />
            {analysis.riskFlags?.some(r => r.negotiation) && (
              <Button
                variant="outline"
                onClick={() => window.open(`/api/contracts/${contractId}/export/negotiation-pack`, "_blank")}
                data-testid="button-export-negotiation-pack"
              >
                <Download className="h-4 w-4 mr-2" />
                Negotiation Pack
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

          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary" data-testid="tab-summary">
                <FileText className="h-4 w-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="terms" data-testid="tab-terms">
                <ClipboardList className="h-4 w-4 mr-2" />
                Key Terms
              </TabsTrigger>
              <TabsTrigger value="risks" data-testid="tab-risks">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Risks
                {analysis.riskFlags?.length > 0 && (
                  <span className="ml-2 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {analysis.riskFlags.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="heatmap" data-testid="tab-heatmap">
                Risk Map
              </TabsTrigger>
              <TabsTrigger value="document" data-testid="tab-document">
                <FileText className="h-4 w-4 mr-2" />
                Document
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
