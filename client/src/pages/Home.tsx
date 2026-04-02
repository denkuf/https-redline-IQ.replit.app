import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, FileSearch, MessageSquare, Target } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { IndustryMode, RiskPreferences } from "@shared/schema";
import type { SituationProfile } from "@/components/JurisdictionSituationProfile";

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async ({
      files,
      text,
      industryMode,
      riskPreferences,
      context,
      jurisdiction,
      situation,
    }: {
      files: File[];
      text: string | null;
      industryMode: IndustryMode;
      riskPreferences?: RiskPreferences;
      context?: string;
      jurisdiction?: string;
      situation?: SituationProfile;
    }) => {
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(f => formData.append("files", f));
        formData.append("industryMode", industryMode);
        if (riskPreferences) formData.append("riskPreferences", JSON.stringify(riskPreferences));
        if (context) formData.append("context", context);
        if (jurisdiction) formData.append("jurisdiction", jurisdiction);
        if (situation) formData.append("situation", JSON.stringify(situation));
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
        const response = await fetch("/api/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, industryMode, riskPreferences, context, jurisdiction, situation }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create contract");
        }
        return response.json();
      }
      throw new Error("No file or text provided");
    },
    onSuccess: (data) => {
      if (data.lowQualityWarning) {
        toast({
          title: "Low image quality detected",
          description: "The photo may be hard to read. If results look wrong, retake in better lighting.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Contract uploaded",
          description: "Your contract is being analysed...",
        });
      }
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

  const handleUpload = (
    files: File[],
    text: string | null,
    industryMode: IndustryMode,
    riskPreferences?: RiskPreferences,
    context?: string,
    jurisdiction?: string,
    situation?: SituationProfile
  ) => {
    uploadMutation.mutate({ files, text, industryMode, riskPreferences, context, jurisdiction, situation });
  };

  const features = [
    { icon: Target, title: "Instant Verdict", description: "Clear risk score (0-100)" },
    { icon: FileSearch, title: "Deep Analysis", description: "Industry-specific insights" },
    { icon: MessageSquare, title: "Negotiation Help", description: "Know what to say" },
    { icon: Sparkles, title: "AI-Powered", description: "Grounded in your doc" },
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
