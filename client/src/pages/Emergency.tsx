import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, Loader2, FileText, ArrowRight, Copy, Check, Upload, X, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface EmergencyResult {
  relevantContracts: { id: number; name: string; relevance: string }[];
  relevantClauses: { contractId: number; clause: string; implication: string }[];
  immediateSteps: string[];
  lawyerSummary: string;
}

export default function Emergency() {
  const [issue, setIssue] = useState("");
  const [result, setResult] = useState<EmergencyResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const emergencyMutation = useMutation({
    mutationFn: async ({ text, file }: { text: string; file: File | null }) => {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (text.trim()) formData.append("issue", text);
        const res = await fetch("/api/emergency", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to analyze");
        return res.json();
      }
      const response = await apiRequest("POST", "/api/emergency", { issue: text });
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleSubmit = () => {
    if (issue.trim() || uploadedFile) {
      emergencyMutation.mutate({ text: issue, file: uploadedFile });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const copyLawyerSummary = async () => {
    if (result?.lawyerSummary) {
      await navigator.clipboard.writeText(result.lawyerSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-1 shrink-0"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertOctagon className="h-5 w-5 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Emergency Mode</h1>
        </div>
        <p className="text-muted-foreground">
          Tell us what happened. We'll find the relevant contracts and clauses, and suggest next steps.
        </p>
      </div>

      <Card className="mb-6 border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg">What's the problem?</CardTitle>
          <CardDescription>
            Describe your situation in plain language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="e.g., 'My landlord is refusing to return my security deposit even though I left the apartment in good condition...'"
            className="min-h-[150px]"
            data-testid="input-emergency-issue"
          />

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
              data-testid="input-file-upload"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-file"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            {uploadedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{uploadedFile.name}</span>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="hover:text-foreground"
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Describe your situation above or upload a document (PDF, DOCX, image) related to the issue
          </p>

          <Button
            onClick={handleSubmit}
            disabled={(!issue.trim() && !uploadedFile) || emergencyMutation.isPending}
            variant="destructive"
            data-testid="button-get-help"
          >
            {emergencyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <AlertOctagon className="mr-2 h-4 w-4" />
                Get Help Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6" data-testid="emergency-result">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Immediate Steps</CardTitle>
              <CardDescription>What you should do right now</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {result.immediateSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3" data-testid={`step-${index}`}>
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {result.relevantContracts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Relevant Contracts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.relevantContracts.map((contract, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/50 rounded-lg"
                    data-testid={`relevant-contract-${index}`}
                  >
                    <div className="font-medium">{contract.name}</div>
                    <div className="text-sm text-muted-foreground">{contract.relevance}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.relevantClauses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Clauses</CardTitle>
                <CardDescription>Important contract language that applies to your situation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.relevantClauses.map((clause, index) => (
                  <div
                    key={index}
                    className="border-l-2 border-primary pl-4 py-2"
                    data-testid={`relevant-clause-${index}`}
                  >
                    <p className="italic text-sm mb-2">"{clause.clause}"</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-sm">{clause.implication}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/30" data-testid="card-lawyer-summary">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg">Lawyer Summary</CardTitle>
                  <CardDescription>Share this with a lawyer if you need professional help</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={copyLawyerSummary} data-testid="button-copy-lawyer-summary">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Summary
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-lawyer-summary">{result.lawyerSummary}</p>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center">
                This analysis is informational only, not legal advice. For serious legal matters, please consult with a qualified attorney.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
