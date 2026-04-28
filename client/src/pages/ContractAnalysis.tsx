import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, AlertTriangle, ClipboardList, Download, GitCompare, Share2, RefreshCw, Upload, MapPin, Clock, X, BookOpen, ChevronDown, ChevronRight, FileEdit } from "lucide-react";
import { AnalysisSummary } from "@/components/AnalysisSummary";
import { KeyTermsTable } from "@/components/KeyTermsTable";
import { RiskFlags } from "@/components/RiskFlags";
import { MissingClauses } from "@/components/MissingClauses";
import { ClarifyingQuestions } from "@/components/ClarifyingQuestions";
import { ContractViewer } from "@/components/ContractViewer";
import { ClauseReader, ClauseReaderSkeleton } from "@/components/ClauseReader";
import { RedlineViewer } from "@/components/RedlineViewer";
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
import { industryModeLabels, type Contract, type Verdict, type Redline } from "@shared/schema";

const STALE_DAYS = 180;

function getAnalysisAgeLabel(analysedAt: string | Date | null | undefined): string | null {
  if (!analysedAt) return null;
  const date = new Date(analysedAt);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function isAnalysisStale(analysedAt: string | Date | null | undefined): boolean {
  if (!analysedAt) return true;
  const diffMs = Date.now() - new Date(analysedAt).getTime();
  return diffMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export default function ContractAnalysis() {
  const params = useParams<{ id: string }>();
  const contractId = parseInt(params.id || "0");
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [explanation, setExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [showReupload, setShowReupload] = useState(false);
  const [staleBannerDismissed, setStaleBannerDismissed] = useState(false);
  const [showRefreshPanel, setShowRefreshPanel] = useState(false);
  const [refreshJurisdiction, setRefreshJurisdiction] = useState("");
  const [refreshContext, setRefreshContext] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [highlightedRiskFlag, setHighlightedRiskFlag] = useState<string | undefined>(undefined);
  const [clausesGenerated, setClausesGenerated] = useState(false);
  const [clauses, setClauses] = useState<import("@shared/schema").AnnotatedClause[]>([]);
  const [isGeneratingClauses, setIsGeneratingClauses] = useState(false);
  const [clauseGenerationError, setClauseGenerationError] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [lastAnalysedAt, setLastAnalysedAt] = useState<string | null>(null);
  const [showRedlineViewer, setShowRedlineViewer] = useState(false);
  const [redlines, setRedlines] = useState<Redline[]>([]);
  const [isGeneratingRedlines, setIsGeneratingRedlines] = useState(false);
  const [redlinesLoaded, setRedlinesLoaded] = useState(false);

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

  const refreshAnalysisMutation = useMutation({
    mutationFn: async (opts?: { jurisdiction?: string; context?: string }) => {
      const body: Record<string, string> = {};
      if (opts?.jurisdiction?.trim()) body.jurisdiction = opts.jurisdiction.trim();
      if (opts?.context?.trim()) body.context = opts.context.trim();
      const res = await apiRequest("POST", `/api/contracts/${contractId}/reanalyze`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Re-analysis started", description: "The AI is reviewing your contract again. Results will update shortly." });
      setStaleBannerDismissed(true);
      setShowRefreshPanel(false);
      setRefreshJurisdiction("");
      setRefreshContext("");
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", contractId] });
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

  const handleGenerateRedlines = async () => {
    if (!contract?.analysis) return;
    // If we already have cached redlines from the analysis, use them
    if (contract.analysis.redlines !== undefined && contract.analysis.redlines !== null) {
      setRedlines(contract.analysis.redlines);
      setRedlinesLoaded(true);
      setShowRedlineViewer(true);
      return;
    }
    // If we already fetched redlines this session (even if empty), re-use them
    if (redlinesLoaded) {
      setShowRedlineViewer(true);
      return;
    }
    setIsGeneratingRedlines(true);
    try {
      const res = await apiRequest("POST", `/api/contracts/${contractId}/redlines`);
      const data = await res.json();
      setRedlines(data.redlines || []);
      setRedlinesLoaded(true);
      setShowRedlineViewer(true);
      // Refresh contract query so server-persisted analysis.redlines is the source of truth
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", contractId] });
    } catch {
      toast({ title: "Failed to generate redlines", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsGeneratingRedlines(false);
    }
  };

  const handleSwitchToRisks = (flagTitle?: string) => {
    setActiveTab("risks");
    if (flagTitle) setHighlightedRiskFlag(flagTitle);
    setTimeout(() => {
      document.querySelector('[data-testid="tab-risks"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Reset clause and redline state when analysis changes (re-analysis or switching contracts)
  useEffect(() => {
    const analysedAt = contract?.analysis?.analysedAt ?? null;
    if (analysedAt !== lastAnalysedAt) {
      setLastAnalysedAt(analysedAt);
      setClauses([]);
      setClausesGenerated(false);
      setClauseGenerationError(false);
      // Reset redline local state so stale edits from a prior analysis are never reused
      setRedlines([]);
      setRedlinesLoaded(false);
      setShowRedlineViewer(false);
    }
  }, [contractId, contract?.analysis?.analysedAt]);

  const loadClauses = async (analysis: NonNullable<typeof contract>["analysis"]) => {
    if (!analysis || clausesGenerated || isGeneratingClauses) return;
    // Use cached clauses from analysis if available
    if (analysis.clauses && analysis.clauses.length > 0) {
      setClauses(analysis.clauses);
      setClausesGenerated(true);
      return;
    }
    setIsGeneratingClauses(true);
    setClauseGenerationError(false);
    try {
      const res = await apiRequest("POST", `/api/contracts/${contractId}/clauses`);
      const data = await res.json();
      if (data.clauses && data.clauses.length > 0) {
        setClauses(data.clauses);
        setClausesGenerated(true);
      } else {
        setClauseGenerationError(true);
      }
    } catch {
      setClauseGenerationError(true);
    } finally {
      setIsGeneratingClauses(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "document" && contract?.analysis && !clausesGenerated && !isGeneratingClauses) {
      loadClauses(contract.analysis);
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
              {contract.jurisdiction && (
                <Badge variant="secondary" className="text-xs gap-1" data-testid="badge-jurisdiction">
                  <MapPin className="h-3 w-3" />
                  {contract.jurisdiction}
                </Badge>
              )}
              {contract.analysedAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-analysed-at">
                  <Clock className="h-3 w-3" />
                  Analysed {getAnalysisAgeLabel(contract.analysedAt)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isAnalyzing && contract.extractedText && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRefreshPanel(!showRefreshPanel)}
                disabled={refreshAnalysisMutation.isPending}
                data-testid="button-refresh-analysis"
                title="Re-run AI analysis on the stored contract text"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshAnalysisMutation.isPending ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh Analysis</span>
              </Button>
              {showRefreshPanel && (
                <div className="absolute right-0 top-full mt-2 z-10 bg-card border rounded-lg p-3 shadow-lg w-72">
                  <p className="text-sm font-medium mb-1">Refresh AI Analysis</p>
                  <p className="text-xs text-muted-foreground mb-3">Optionally update context before re-running. Stored risk preferences are used automatically.</p>
                  <div className="space-y-2 mb-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Override jurisdiction (optional)</label>
                      <input
                        type="text"
                        value={refreshJurisdiction}
                        onChange={(e) => setRefreshJurisdiction(e.target.value)}
                        placeholder={contract?.jurisdiction || "e.g. California, US"}
                        className="w-full text-sm rounded border border-input bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-refresh-jurisdiction"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Additional context (optional)</label>
                      <textarea
                        value={refreshContext}
                        onChange={(e) => setRefreshContext(e.target.value)}
                        placeholder="e.g. I'm the contractor, concerned about non-compete clauses"
                        className="w-full text-sm rounded border border-input bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        rows={2}
                        data-testid="input-refresh-context"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => refreshAnalysisMutation.mutate({ jurisdiction: refreshJurisdiction, context: refreshContext })}
                    disabled={refreshAnalysisMutation.isPending}
                    data-testid="button-confirm-refresh"
                  >
                    <RefreshCw className={`h-3 w-3 mr-2 ${refreshAnalysisMutation.isPending ? "animate-spin" : ""}`} />
                    Run Analysis
                  </Button>
                </div>
              )}
            </div>
          )}
          {!isAnalyzing && analysis && (
            <>
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
                <span className="hidden sm:inline">New Version</span>
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateRedlines}
              disabled={isGeneratingRedlines}
              data-testid="button-generate-redlines"
            >
              {isGeneratingRedlines ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileEdit className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">Redlines</span>
              <span className="sm:hidden">Redlines</span>
            </Button>
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
            </>
          )}
        </div>
      </div>

      {!isAnalyzing && !staleBannerDismissed && isAnalysisStale(contract.analysedAt) && contract.extractedText && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 mb-4" data-testid="banner-stale-analysis">
          <Clock className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Analysis may be outdated</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {contract.analysedAt
                ? `This analysis is ${getAnalysisAgeLabel(contract.analysedAt)} old.`
                : "This contract has never been analysed."}{" "}
              Laws, regulations, and market norms can change — a fresh review may surface new risks.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
              onClick={() => refreshAnalysisMutation.mutate({})}
              disabled={refreshAnalysisMutation.isPending}
              data-testid="button-stale-reanalyze"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${refreshAnalysisMutation.isPending ? "animate-spin" : ""}`} />
              Re-analyse now
            </Button>
            <button
              onClick={() => setStaleBannerDismissed(true)}
              className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 p-1"
              data-testid="button-dismiss-stale-banner"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
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
                {((analysis.riskFlags?.length || 0) + (analysis.missingClauses?.length || 0)) > 0 && (
                  <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1 py-0.5 rounded-full leading-none">
                    {(analysis.riskFlags?.length || 0) + (analysis.missingClauses?.length || 0)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="text-xs sm:text-sm px-1 sm:px-3 py-2" data-testid="tab-heatmap">
                Map
              </TabsTrigger>
              <TabsTrigger value="document" className="text-xs sm:text-sm px-1 sm:px-3 py-2" data-testid="tab-document">
                <BookOpen className="h-4 w-4 hidden sm:block sm:mr-1" />
                Doc
                {isGeneratingClauses && (
                  <div className="ml-1 h-3 w-3 border border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <AnalysisSummary summary={analysis.summary} />
            </TabsContent>

            <TabsContent value="terms">
              <KeyTermsTable keyTerms={analysis.keyTerms || []} />
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              <RiskFlags 
                riskFlags={analysis.riskFlags || []} 
                contractType={contract.type || "general"}
                industryMode={contract.industryMode || "general"}
                highlightedFlagTitle={highlightedRiskFlag}
              />
              {analysis.missingClauses && analysis.missingClauses.length > 0 && (
                <MissingClauses missingClauses={analysis.missingClauses} />
              )}
            </TabsContent>

            <TabsContent value="heatmap">
              <VisualRiskHeatmap 
                contractText={contract.extractedText}
                riskFlags={analysis.riskFlags || []}
              />
            </TabsContent>

            <TabsContent value="document" className="space-y-4">
              {isGeneratingClauses ? (
                <ClauseReaderSkeleton />
              ) : clausesGenerated && clauses.length > 0 ? (
                <>
                  <ClauseReader
                    clauses={clauses}
                    onSwitchToRisks={handleSwitchToRisks}
                  />
                  <div className="border rounded-lg">
                    <button
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
                      onClick={() => setShowRawText(!showRawText)}
                      data-testid="button-toggle-raw-text"
                    >
                      <span className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        View raw contract text
                      </span>
                      {showRawText ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {showRawText && (
                      <div className="border-t">
                        <ContractViewer
                          text={contract.extractedText}
                          onExplainSelection={handleExplainSelection}
                          isExplaining={isExplaining}
                          explanation={explanation}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : clauseGenerationError ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Annotated reader unavailable</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Could not generate clause annotations. Showing the raw contract text below. Use "Select to Explain" to understand any section.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-300"
                      onClick={() => {
                        setClauseGenerationError(false);
                        loadClauses(contract.analysis);
                      }}
                      data-testid="button-retry-clauses"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                  <ContractViewer
                    text={contract.extractedText}
                    onExplainSelection={handleExplainSelection}
                    isExplaining={isExplaining}
                    explanation={explanation}
                  />
                </div>
              ) : (
                <ContractViewer
                  text={contract.extractedText}
                  onExplainSelection={handleExplainSelection}
                  isExplaining={isExplaining}
                  explanation={explanation}
                />
              )}
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

      {/* Smart Redline Viewer */}
      {showRedlineViewer && contract && (
        <RedlineViewer
          contractText={contract.extractedText}
          redlines={redlines}
          contractName={contract.name}
          open={showRedlineViewer}
          onClose={() => setShowRedlineViewer(false)}
        />
      )}
    </div>
  );
}
