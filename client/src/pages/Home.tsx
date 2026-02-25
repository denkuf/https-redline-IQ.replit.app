import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, FileSearch, MessageSquare, Target } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { IndustryMode, RiskPreferences } from "@shared/schema";

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async ({ 
      file, 
      text, 
      industryMode, 
      riskPreferences 
    }: { 
      file: File | null; 
      text: string | null; 
      industryMode: IndustryMode;
      riskPreferences?: RiskPreferences;
    }) => {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("industryMode", industryMode);
        if (riskPreferences) {
          formData.append("riskPreferences", JSON.stringify(riskPreferences));
        }
        const response = await fetch("/api/contracts/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Upload failed");
        }
        return response.json();
      } else if (text) {
        const response = await apiRequest("POST", "/api/contracts", { 
          text, 
          industryMode, 
          riskPreferences 
        });
        return response.json();
      }
      throw new Error("No file or text provided");
    },
    onSuccess: (data) => {
      toast({
        title: "Contract uploaded",
        description: "Your contract is being analyzed...",
      });
      navigate(`/contract/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = (file: File | null, text: string | null, industryMode: IndustryMode, riskPreferences?: RiskPreferences) => {
    uploadMutation.mutate({ file, text, industryMode, riskPreferences });
  };

  const features = [
    {
      icon: Target,
      title: "Instant Verdict",
      description: "Clear risk score (0-100)",
    },
    {
      icon: FileSearch,
      title: "Deep Analysis",
      description: "Industry-specific insights",
    },
    {
      icon: MessageSquare,
      title: "Negotiation Help",
      description: "Know what to say",
    },
    {
      icon: Sparkles,
      title: "AI-Powered",
      description: "Grounded in your doc",
    },
  ];

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-5">
            <Logo size="hero" showText={false} iconOnly />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2.5">
            Know What You're Signing
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto leading-relaxed">
            Your digital lawyer in your pocket. Get instant verdicts, plain-English analysis, and negotiation scripts.
          </p>
        </div>

        <div className="w-full max-w-lg mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 justify-center flex-wrap px-2">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-secondary/40 border border-border/30 whitespace-nowrap backdrop-blur-sm transition-colors hover:bg-secondary/60"
                data-testid={`feature-pill-${i}`}
              >
                <feature.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-medium">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-lg px-2">
          <FileUpload onUpload={handleUpload} isLoading={uploadMutation.isPending} />
        </div>

        <div className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground/70">
          <span>Powered by</span>
          <Logo size="sm" />
        </div>
      </div>
    </div>
  );
}
