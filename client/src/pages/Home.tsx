import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle, AlertTriangle, FileText, MessageSquare, Scale } from "lucide-react";
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
      icon: Scale,
      title: "Should I Sign This?",
      description: "Get a clear verdict with risk score (0-100) and top concerns to negotiate",
    },
    {
      icon: AlertTriangle,
      title: "Industry-Specific Analysis",
      description: "Tailored analysis for leases, employment, freelance, insurance, and more",
    },
    {
      icon: MessageSquare,
      title: "Negotiation Scripts",
      description: "Know exactly what to say to negotiate fairer terms",
    },
    {
      icon: CheckCircle,
      title: "Grounded Analysis",
      description: "Every finding backed by exact quotes from your contract",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Know What You're Signing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload any contract and get an instant verdict: should you sign it? Plus plain-English analysis, 
          risk flags with negotiation scripts, and key terms. Your digital lawyer in your pocket.
        </p>
      </div>

      <FileUpload onUpload={handleUpload} isLoading={uploadMutation.isPending} />

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        {features.map((feature, i) => (
          <div
            key={i}
            className="text-center p-6 rounded-lg bg-card border border-card-border"
            data-testid={`feature-${i}`}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <feature.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
