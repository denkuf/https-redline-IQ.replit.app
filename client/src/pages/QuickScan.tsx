import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScanSearch,
  Upload,
  Camera,
  FileText,
  Image,
  X,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Ban,
  Eye,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QuickScan as QuickScanType, ScreenshotAnalysis } from "@shared/schema";

interface ScanResult {
  id: number;
  inputText: string;
  inputType: string;
  sourceFileName: string | null;
  analysis: ScreenshotAnalysis;
  createdAt: string;
}

export default function QuickScan() {
  const [activeTab, setActiveTab] = useState("paste");
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [catchOpen, setCatchOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const historyQuery = useQuery<ScanResult[]>({
    queryKey: ["/api/quick-scans"],
  });

  const scanMutation = useMutation({
    mutationFn: async (payload: { text?: string; file?: File }) => {
      const formData = new FormData();
      if (payload.file) {
        formData.append("file", payload.file);
      }
      if (payload.text) {
        formData.append("text", payload.text);
      }
      const res = await fetch("/api/screenshot-intelligence", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || res.statusText);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setCatchOpen(false);
      setText("");
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/quick-scans"] });
      toast({ title: "Analysis complete", description: "Your document has been analyzed." });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (activeTab === "paste" && text.trim()) {
      scanMutation.mutate({ text: text.trim() });
    } else if ((activeTab === "upload" || activeTab === "camera") && selectedFile) {
      scanMutation.mutate({ file: selectedFile });
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const clearFile = () => setSelectedFile(null);

  const canSubmit =
    !scanMutation.isPending &&
    ((activeTab === "paste" && text.trim().length > 0) ||
      ((activeTab === "upload" || activeTab === "camera") && selectedFile !== null));

  const loadHistoryItem = (item: ScanResult) => {
    setResult(item);
    setCatchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ScanSearch className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Screenshot Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Paste, upload, or photograph anything confusing to understand it instantly.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3" data-testid="tabs-input-method">
              <TabsTrigger value="paste" data-testid="tab-paste">
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Paste Text</span>
                <span className="sm:hidden">Text</span>
              </TabsTrigger>
              <TabsTrigger value="upload" data-testid="tab-upload">
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Upload File</span>
                <span className="sm:hidden">File</span>
              </TabsTrigger>
              <TabsTrigger value="camera" data-testid="tab-camera">
                <Camera className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Take Photo</span>
                <span className="sm:hidden">Photo</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="mt-4 space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste any text here - contracts, emails, notices, messages..."
                className="min-h-[140px]"
                data-testid="input-paste-text"
              />
              <p className="text-xs text-muted-foreground">
                Paste from contracts, emails, WhatsApp, letters, or anywhere else.
              </p>
            </TabsContent>

            <TabsContent value="upload" className="mt-4 space-y-3">
              {selectedFile ? (
                <div className="flex items-center gap-3 p-4 rounded-md bg-muted">
                  {selectedFile.type.startsWith("image/") ? (
                    <Image className="h-6 w-6 text-primary" />
                  ) : (
                    <FileText className="h-6 w-6 text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm" data-testid="text-selected-file">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearFile} data-testid="button-clear-file">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`relative border-2 border-dashed rounded-md p-10 transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    data-testid="input-file-upload"
                  />
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Drop a file here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, DOCX, JPG, PNG
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="camera" className="mt-4 space-y-3">
              {selectedFile && selectedFile.type.startsWith("image/") ? (
                <div className="flex items-center gap-3 p-4 rounded-md bg-muted">
                  <Camera className="h-6 w-6 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm" data-testid="text-camera-file">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearFile} data-testid="button-clear-camera">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-md p-10 transition-colors border-primary/50 bg-primary/5 cursor-pointer"
                  onClick={() => cameraInputRef.current?.click()}
                  data-testid="button-open-camera"
                >
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-camera-capture"
                  />
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Camera className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-sm">Tap to take a photo</p>
                    <p className="text-xs text-muted-foreground">
                      Our AI will extract and analyze the text
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
            data-testid="button-analyze"
          >
            {scanMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <ScanSearch className="mr-2 h-4 w-4" />
                Analyze
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {scanMutation.isPending && (
        <Card data-testid="scan-loading">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      )}

      {result?.analysis && <AnalysisResults analysis={result.analysis} catchOpen={catchOpen} setCatchOpen={setCatchOpen} />}

      <HistorySection
        history={historyQuery.data}
        isLoading={historyQuery.isLoading}
        onSelect={loadHistoryItem}
      />
    </div>
  );
}

function RiskIndicator({ level }: { level: string }) {
  switch (level) {
    case "safe":
      return (
        <div className="flex items-center gap-2" data-testid="risk-indicator-safe">
          <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            Safe
          </Badge>
        </div>
      );
    case "caution":
      return (
        <div className="flex items-center gap-2" data-testid="risk-indicator-caution">
          <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">
            Caution
          </Badge>
        </div>
      );
    case "danger":
      return (
        <div className="flex items-center gap-2" data-testid="risk-indicator-danger">
          <ShieldX className="h-5 w-5 text-red-600 dark:text-red-400" />
          <Badge variant="destructive">
            Danger
          </Badge>
        </div>
      );
    default:
      return null;
  }
}

function AnalysisResults({
  analysis,
  catchOpen,
  setCatchOpen,
}: {
  analysis: ScreenshotAnalysis;
  catchOpen: boolean;
  setCatchOpen: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4" data-testid="scan-result">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">Analysis</h2>
            <RiskIndicator level={analysis.riskLevel} />
          </div>

          <Section icon={<CheckCircle className="h-4 w-4 text-primary" />} title="What this is" data-testid="section-what-it-is">
            <p className="text-sm text-muted-foreground" data-testid="text-what-it-is">{analysis.whatItIs}</p>
          </Section>

          <Section icon={<AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />} title="Why it matters" data-testid="section-why-it-matters">
            <p className="text-sm text-muted-foreground" data-testid="text-why-it-matters">{analysis.whyItMatters}</p>
          </Section>

          <Section icon={<ArrowRight className="h-4 w-4 text-primary" />} title="What to do next" data-testid="section-what-to-do">
            <p className="text-sm text-muted-foreground" data-testid="text-what-to-do">{analysis.whatToDoNext}</p>
          </Section>

          {analysis.deadline && (
            <Section icon={<Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />} title="Deadline" data-testid="section-deadline">
              <p className="text-sm font-medium" data-testid="text-deadline">{analysis.deadline}</p>
            </Section>
          )}

          <Section icon={<Ban className="h-4 w-4 text-destructive" />} title="Consequence of ignoring" data-testid="section-consequence">
            <p className="text-sm text-muted-foreground" data-testid="text-consequence">{analysis.consequenceOfIgnoring}</p>
          </Section>

          {analysis.whatsTheCatch && (
            <Collapsible open={catchOpen} onOpenChange={setCatchOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between" data-testid="button-whats-the-catch">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    What&apos;s the Catch?
                  </span>
                  {catchOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 mt-1 rounded-md bg-muted text-sm text-muted-foreground" data-testid="text-whats-the-catch">
                  {analysis.whatsTheCatch}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {analysis.flags && analysis.flags.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Flags ({analysis.flags.length})
            </h3>
            {analysis.flags.map((flag, i) => (
              <div
                key={i}
                className="p-3 rounded-md bg-muted/50 space-y-1"
                data-testid={`flag-item-${i}`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" data-testid={`flag-issue-${i}`}>{flag.issue}</span>
                  <SeverityBadge severity={flag.severity} />
                </div>
                <p className="text-xs text-muted-foreground" data-testid={`flag-explanation-${i}`}>{flag.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  ...props
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div className="space-y-1" data-testid={props["data-testid"]}>
      <h3 className="text-sm font-medium flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case "High":
      return <Badge variant="destructive" className="text-xs">{severity}</Badge>;
    case "Medium":
      return <Badge variant="secondary" className="text-xs">{severity}</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{severity}</Badge>;
  }
}

function HistorySection({
  history,
  isLoading,
  onSelect,
}: {
  history: ScanResult[] | undefined;
  isLoading: boolean;
  onSelect: (item: ScanResult) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="history-loading">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          Recent Scans
        </h3>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!history || history.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="history-section">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <History className="h-4 w-4" />
        Recent Scans
      </h3>
      {history.map((item) => (
        <Card
          key={item.id}
          className="cursor-pointer hover-elevate"
          onClick={() => onSelect(item)}
          data-testid={`history-item-${item.id}`}
        >
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <RiskDot level={item.analysis?.riskLevel} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid={`history-summary-${item.id}`}>
                {item.analysis?.whatItIs || item.inputText?.slice(0, 80)}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {item.inputType === "image" ? "Photo" : item.inputType === "file" ? "File" : "Text"}
                </span>
                {item.sourceFileName && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {item.sourceFileName}
                  </span>
                )}
                {item.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RiskDot({ level }: { level?: string }) {
  const color =
    level === "safe"
      ? "bg-green-500"
      : level === "caution"
        ? "bg-yellow-500"
        : level === "danger"
          ? "bg-red-500"
          : "bg-muted-foreground";
  return <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${color}`} />;
}
