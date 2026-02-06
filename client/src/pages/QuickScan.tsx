import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, AlertOctagon, Loader2, Zap, Copy, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface QuickScanResult {
  id: number;
  inputText: string;
  analysis: {
    riskLevel: "safe" | "caution" | "danger";
    flags: { issue: string; explanation: string; severity: string }[];
    summary: string;
  };
}

export default function QuickScan() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<QuickScanResult | null>(null);
  const [copied, setCopied] = useState(false);

  const scanMutation = useMutation({
    mutationFn: async (inputText: string) => {
      const response = await apiRequest("POST", "/api/quick-scan", { text: inputText });
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleScan = () => {
    if (text.trim()) {
      scanMutation.mutate(text);
    }
  };

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "safe":
        return <CheckCircle className="h-6 w-6 text-primary" />;
      case "caution":
        return <AlertTriangle className="h-6 w-6 text-muted-foreground" />;
      case "danger":
        return <AlertOctagon className="h-6 w-6 text-destructive" />;
      default:
        return <Shield className="h-6 w-6" />;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "safe":
        return <Badge variant="default" data-testid="badge-risk-safe">Safe</Badge>;
      case "caution":
        return <Badge variant="secondary" data-testid="badge-risk-caution">Caution</Badge>;
      case "danger":
        return <Badge variant="destructive" data-testid="badge-risk-danger">Danger</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Red Flag Shield</h1>
        </div>
        <p className="text-muted-foreground">
          Paste any clause, text, or message to instantly detect legal red flags.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Quick Scan</CardTitle>
          <CardDescription>
            Paste text from contracts, emails, WhatsApp, or anywhere else
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste any contract text, clause, or message here..."
            className="min-h-[150px]"
            data-testid="input-quick-scan"
          />
          <Button
            onClick={handleScan}
            disabled={!text.trim() || scanMutation.isPending}
            className="w-full"
            data-testid="button-scan"
          >
            {scanMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Scan for Red Flags
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && result.analysis && (
        <Card data-testid="scan-result">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {getRiskIcon(result.analysis.riskLevel)}
                <div>
                  <CardTitle>Analysis Result</CardTitle>
                  <CardDescription>{result.analysis.summary}</CardDescription>
                </div>
              </div>
              {getRiskBadge(result.analysis.riskLevel)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.analysis.flags.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium">Issues Found:</h4>
                {result.analysis.flags.map((flag, i) => (
                  <div
                    key={i}
                    className="p-3 bg-muted/50 rounded-lg border-l-2 border-destructive"
                    data-testid={`flag-${i}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-medium">{flag.issue}</span>
                      <Badge variant="outline" className="text-xs">
                        {flag.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{flag.explanation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-primary" data-testid="no-issues-message">
                <CheckCircle className="h-5 w-5" />
                <span>No concerning issues found in this text.</span>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(result.analysis.summary)}
                data-testid="button-copy-summary"
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copied" : "Copy Summary"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
