import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle, AlertTriangle, FileText } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, text }: { file: File | null; text: string | null }) => {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
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
        const response = await apiRequest("POST", "/api/contracts", { text });
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

  const handleUpload = (file: File | null, text: string | null) => {
    uploadMutation.mutate({ file, text });
  };

  const features = [
    {
      icon: FileText,
      title: "Plain-English Summaries",
      description: "Complex legal jargon translated into simple language you can understand",
    },
    {
      icon: AlertTriangle,
      title: "Risk Detection",
      description: "Identify hidden traps, unfair terms, and potential issues before signing",
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
          Upload any contract and get an instant, plain-English analysis with risk flags and key terms.
          Before you sign, run it through us.
        </p>
      </div>

      <FileUpload onUpload={handleUpload} isLoading={uploadMutation.isPending} />

      <div className="grid md:grid-cols-3 gap-6 mt-12">
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
