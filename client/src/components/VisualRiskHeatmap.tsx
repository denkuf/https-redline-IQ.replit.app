import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map } from "lucide-react";
import type { RiskFlag } from "@shared/schema";

interface VisualRiskHeatmapProps {
  contractText: string;
  riskFlags: RiskFlag[];
}

interface Section {
  title: string;
  content: string;
  riskLevel: "safe" | "caution" | "danger";
  matchingRisks: RiskFlag[];
}

export function VisualRiskHeatmap({ contractText, riskFlags }: VisualRiskHeatmapProps) {
  const sections = parseContractSections(contractText, riskFlags);

  if (sections.length === 0) {
    return null;
  }

  return (
    <Card data-testid="risk-heatmap">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Map className="h-5 w-5 text-primary" />
          Visual Risk Map
        </CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary/50" />
            Safe
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-secondary" />
            Caution
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-destructive" />
            Danger
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sections.map((section, i) => (
            <div
              key={i}
              className={`p-3 rounded-md border-l-4 cursor-pointer hover-elevate ${
                section.riskLevel === "safe"
                  ? "bg-primary/5 border-primary"
                  : section.riskLevel === "caution"
                  ? "bg-secondary/30 border-secondary"
                  : "bg-destructive/10 border-destructive"
              }`}
              data-testid={`heatmap-section-${i}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-sm truncate min-w-0">{section.title}</span>
                {section.matchingRisks.length > 0 && (
                  <Badge variant={section.riskLevel === "danger" ? "destructive" : "secondary"} className="text-xs shrink-0">
                    {section.matchingRisks.length} {section.matchingRisks.length === 1 ? "Risk" : "Risks"}
                  </Badge>
                )}
              </div>
              {section.matchingRisks.length > 0 && (
                <div className="text-xs text-muted-foreground break-words">
                  {section.matchingRisks.map(r => r.title).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function parseContractSections(text: string, riskFlags: RiskFlag[]): Section[] {
  const sectionPatterns = [
    /(?:^|\n)(\d+\.?\s*[A-Z][A-Z\s]+)(?:\n|$)/gm,
    /(?:^|\n)((?:SECTION|ARTICLE|CLAUSE)\s+\d+[:\.\s]+.+?)(?:\n|$)/gim,
  ];

  const sections: Section[] = [];
  const lines = text.split("\n");
  let currentSection = "";
  let currentContent = "";

  for (const line of lines) {
    const isSectionHeader = 
      /^\d+\.?\s*[A-Z][A-Z\s]{2,}/.test(line.trim()) ||
      /^(?:SECTION|ARTICLE|CLAUSE)\s+\d+/i.test(line.trim());

    if (isSectionHeader && currentSection) {
      const matchingRisks = findMatchingRisks(currentContent, riskFlags);
      sections.push({
        title: currentSection,
        content: currentContent,
        riskLevel: determineRiskLevel(matchingRisks),
        matchingRisks,
      });
      currentSection = line.trim();
      currentContent = "";
    } else if (isSectionHeader) {
      currentSection = line.trim();
    } else {
      currentContent += line + "\n";
    }
  }

  if (currentSection) {
    const matchingRisks = findMatchingRisks(currentContent, riskFlags);
    sections.push({
      title: currentSection,
      content: currentContent,
      riskLevel: determineRiskLevel(matchingRisks),
      matchingRisks,
    });
  }

  if (sections.length === 0) {
    const commonSections = [
      "Payment", "Term", "Termination", "Liability", "Confidentiality",
      "Dispute", "Renewal", "Warranty", "Indemnification"
    ];

    for (const sectionName of commonSections) {
      const regex = new RegExp(`(?:^|\\n).*${sectionName}.*(?:\\n|$)`, "gi");
      const matches = text.match(regex);
      if (matches) {
        const matchingRisks = riskFlags.filter(r => 
          r.clauseReference?.toLowerCase().includes(sectionName.toLowerCase()) ||
          r.title.toLowerCase().includes(sectionName.toLowerCase())
        );
        sections.push({
          title: sectionName,
          content: matches.join("\n"),
          riskLevel: determineRiskLevel(matchingRisks),
          matchingRisks,
        });
      }
    }
  }

  return sections.slice(0, 12);
}

function findMatchingRisks(content: string, riskFlags: RiskFlag[]): RiskFlag[] {
  return riskFlags.filter(risk => {
    const quoteWords = risk.clauseQuote.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matchCount = quoteWords.filter(word => content.toLowerCase().includes(word)).length;
    return matchCount >= Math.min(3, quoteWords.length);
  });
}

function determineRiskLevel(risks: RiskFlag[]): "safe" | "caution" | "danger" {
  if (risks.length === 0) return "safe";
  if (risks.some(r => r.severity === "High")) return "danger";
  if (risks.some(r => r.severity === "Medium")) return "caution";
  return "safe";
}
