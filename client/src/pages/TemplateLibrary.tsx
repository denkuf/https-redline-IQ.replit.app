import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BookOpen, FileText, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContractTemplate, Contract } from "@shared/schema";

export default function TemplateLibrary() {
  const [, navigate] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery<ContractTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest("POST", `/api/templates/${templateId}/use`);
      return (await response.json()) as Contract;
    },
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Template loaded",
        description: "Contract created from template. Starting analysis...",
      });
      navigate(`/contract/${contract.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const categories = templates
    ? Array.from(new Set(templates.map((t) => t.category)))
    : [];

  const filteredTemplates = templates?.filter(
    (t) => selectedCategory === "all" || t.category === selectedCategory
  ) || [];

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case "safe":
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "caution":
      case "medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Template Library</h1>
        </div>
        <p className="text-muted-foreground">
          Learn from pre-annotated contract templates to understand what to look for in different contract types.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="w-full justify-start overflow-x-auto" data-testid="tabs-category-filter">
              <TabsTrigger value="all" data-testid="tab-all">
                All Categories
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} data-testid={`tab-${category}`}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">No templates in this category</h3>
              <p className="text-muted-foreground">Select another category to view templates</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover-elevate transition-all"
                  onClick={() => setSelectedTemplate(template)}
                  data-testid={`card-template-${template.id}`}
                >
                  <CardHeader>
                    <div className="space-y-3">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" data-testid={`badge-category-${template.id}`}>
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" data-testid={`badge-industry-${template.id}`}>
                          {template.industryMode || "General"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4 line-clamp-3">
                      {template.description}
                    </CardDescription>
                    {template.commonRedFlags && template.commonRedFlags.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Red flags included
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {template.commonRedFlags.length} item{template.commonRedFlags.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold mb-2">No templates available</h3>
          <p className="text-muted-foreground">Templates will be added soon</p>
        </div>
      )}

      <Dialog open={selectedTemplate !== null} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-template-detail">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTemplate.name}</DialogTitle>
                <DialogDescription className="space-y-2 mt-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{selectedTemplate.category}</Badge>
                    <Badge variant="secondary">{selectedTemplate.industryMode || "General"}</Badge>
                  </div>
                  <p>{selectedTemplate.description}</p>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {selectedTemplate.commonRedFlags && selectedTemplate.commonRedFlags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Common Red Flags
                    </h3>
                    <ul className="space-y-2">
                      {selectedTemplate.commonRedFlags.map((flag, idx) => (
                        <li
                          key={idx}
                          className="text-sm p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800"
                          data-testid={`item-red-flag-${idx}`}
                        >
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTemplate.annotations && selectedTemplate.annotations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Annotated Sections</h3>
                    <div className="space-y-3">
                      {selectedTemplate.annotations.map((annotation, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-md border-l-4 ${getRiskColor(
                            annotation.riskLevel
                          )}`}
                          data-testid={`annotation-${idx}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-semibold text-sm">{annotation.section}</p>
                            <Badge className={`text-xs ${getRiskColor(annotation.riskLevel)}`}>
                              {annotation.riskLevel}
                            </Badge>
                          </div>
                          <p className="text-sm">{annotation.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3">Full Template Content</h3>
                  <div className="bg-muted p-4 rounded-md max-h-64 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap break-words font-mono text-muted-foreground" data-testid="content-template">
                      {selectedTemplate.content}
                    </pre>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    useTemplateMutation.mutate(selectedTemplate.id);
                  }}
                  disabled={useTemplateMutation.isPending}
                  data-testid="button-use-template"
                >
                  {useTemplateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading Template...
                    </>
                  ) : (
                    "Use This Template"
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
