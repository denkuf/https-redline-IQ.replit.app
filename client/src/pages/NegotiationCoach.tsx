import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2, Copy, Check, Lightbulb, Upload, X, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface NegotiationResult {
  strategy: string;
  replies: { tone: string; message: string }[];
}

export default function NegotiationCoach() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<NegotiationResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const coachMutation = useMutation({
    mutationFn: async ({ text, file }: { text: string; file: File | null }) => {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (text.trim()) formData.append("message", text);
        const res = await fetch("/api/negotiation-coach", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to generate replies");
        return res.json();
      }
      const response = await apiRequest("POST", "/api/negotiation-coach", { message: text });
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const handleSubmit = () => {
    if (message.trim() || uploadedFile) {
      coachMutation.mutate({ text: message, file: uploadedFile });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const copyReply = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getToneBadgeVariant = (tone: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (tone.toLowerCase()) {
      case "firm":
        return "destructive";
      case "friendly":
        return "default";
      case "professional":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Negotiation Coach</h1>
        </div>
        <p className="text-muted-foreground">
          Paste what the other party said, and get strategic responses in different tones.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">What did they say?</CardTitle>
          <CardDescription>
            Paste the other party's message, email, or response
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g., We cannot change that clause, it is our standard policy..."
            className="min-h-[120px]"
            data-testid="input-counterparty-message"
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
            Paste text above or upload a file (PDF, DOCX, image) containing their message
          </p>

          <Button
            onClick={handleSubmit}
            disabled={(!message.trim() && !uploadedFile) || coachMutation.isPending}
            data-testid="button-get-replies"
          >
            {coachMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Responses...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Get Response Options
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6" data-testid="negotiation-result">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-primary" />
                Strategy Advice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{result.strategy}</p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="font-semibold">Choose Your Response:</h3>
            {result.replies.map((reply, index) => (
              <Card key={index} className="hover-elevate" data-testid={`reply-${reply.tone.toLowerCase()}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant={getToneBadgeVariant(reply.tone)} data-testid={`badge-tone-${reply.tone.toLowerCase()}`}>{reply.tone}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyReply(reply.message, index)}
                      data-testid={`button-copy-reply-${index}`}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{reply.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
