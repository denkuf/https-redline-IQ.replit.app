import { jsPDF } from "jspdf";
import type { Contract, AnalysisResult, RiskFlag } from "@shared/schema";

export function generatePdfExport(contract: Contract): Buffer {
  const doc = new jsPDF();
  const analysis = contract.analysis as AnalysisResult | null;
  
  let y = 20;
  const marginLeft = 20;
  const maxWidth = 170;
  const lineHeight = 7;
  
  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Contract Analysis Report", marginLeft, y);
  y += 12;
  
  // Contract name
  doc.setFontSize(14);
  doc.text(contract.name, marginLeft, y);
  y += 8;
  
  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, marginLeft, y);
  y += 15;
  
  if (!analysis) {
    doc.text("Analysis not available.", marginLeft, y);
    return Buffer.from(doc.output("arraybuffer"));
  }
  
  // Disclaimer
  doc.setFontSize(9);
  doc.setTextColor(100);
  const disclaimer = "DISCLAIMER: This is informational, not legal advice. For important decisions, consult a qualified attorney.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, maxWidth);
  doc.text(disclaimerLines, marginLeft, y);
  y += disclaimerLines.length * 5 + 10;
  doc.setTextColor(0);
  
  // Overall Assessment
  if (analysis.overallAssessment) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Overall Assessment", marginLeft, y);
    y += lineHeight;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const assessmentLines = doc.splitTextToSize(analysis.overallAssessment, maxWidth);
    doc.text(assessmentLines, marginLeft, y);
    y += assessmentLines.length * 5 + 10;
  }
  
  // Summary Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", marginLeft, y);
  y += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // What it is
  doc.setFont("helvetica", "bold");
  doc.text("What this contract is:", marginLeft, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const whatItIsLines = doc.splitTextToSize(analysis.summary.whatItIs, maxWidth);
  doc.text(whatItIsLines, marginLeft, y);
  y += whatItIsLines.length * 5 + 5;
  
  // Check for page break
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  
  // Risk Flags
  if (analysis.riskFlags && analysis.riskFlags.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Risk Flags", marginLeft, y);
    y += lineHeight;
    
    for (const risk of analysis.riskFlags as RiskFlag[]) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(10);
      const severityColor = {
        High: [220, 50, 50],
        Medium: [220, 150, 50],
        Low: [50, 150, 50],
      };
      const color = severityColor[risk.severity] || [100, 100, 100];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont("helvetica", "bold");
      doc.text(`[${risk.severity}] ${risk.title}`, marginLeft, y);
      y += 5;
      
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      const explanationLines = doc.splitTextToSize(risk.explanation, maxWidth);
      doc.text(explanationLines, marginLeft, y);
      y += explanationLines.length * 5 + 3;
      
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Reference: ${risk.clauseReference}`, marginLeft, y);
      y += 8;
      doc.setTextColor(0);
    }
  }
  
  // Key Terms
  if (analysis.keyTerms && analysis.keyTerms.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Key Terms", marginLeft, y);
    y += lineHeight;
    
    doc.setFontSize(10);
    for (const term of analysis.keyTerms) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text(`${term.category}:`, marginLeft, y);
      doc.setFont("helvetica", "normal");
      const valueLines = doc.splitTextToSize(term.value, maxWidth - 40);
      doc.text(valueLines, marginLeft + 40, y);
      y += Math.max(valueLines.length * 5, 5) + 3;
    }
  }
  
  return Buffer.from(doc.output("arraybuffer"));
}

export function generateTextExport(contract: Contract): string {
  const analysis = contract.analysis as AnalysisResult | null;
  const lines: string[] = [];
  
  lines.push("═".repeat(60));
  lines.push("CONTRACT ANALYSIS REPORT");
  lines.push("═".repeat(60));
  lines.push("");
  lines.push(`Contract: ${contract.name}`);
  lines.push(`Generated: ${new Date().toLocaleDateString()}`);
  lines.push("");
  lines.push("─".repeat(60));
  lines.push("DISCLAIMER: This is informational, not legal advice.");
  lines.push("For important decisions, consult a qualified attorney.");
  lines.push("─".repeat(60));
  lines.push("");
  
  if (!analysis) {
    lines.push("Analysis not available.");
    return lines.join("\n");
  }
  
  // Overall Assessment
  if (analysis.overallAssessment) {
    lines.push("OVERALL ASSESSMENT");
    lines.push("─".repeat(40));
    lines.push(analysis.overallAssessment);
    lines.push("");
  }
  
  // Summary
  lines.push("SUMMARY");
  lines.push("─".repeat(40));
  lines.push("");
  lines.push("What this contract is:");
  lines.push(analysis.summary.whatItIs);
  lines.push("");
  
  if (analysis.summary.partiesInvolved.length > 0) {
    lines.push("Parties involved:");
    analysis.summary.partiesInvolved.forEach((p) => lines.push(`  • ${p}`));
    lines.push("");
  }
  
  if (analysis.summary.userObligations.length > 0) {
    lines.push("Your obligations:");
    analysis.summary.userObligations.forEach((o) => lines.push(`  • ${o}`));
    lines.push("");
  }
  
  if (analysis.summary.otherPartyObligations.length > 0) {
    lines.push("Other party's obligations:");
    analysis.summary.otherPartyObligations.forEach((o) => lines.push(`  • ${o}`));
    lines.push("");
  }
  
  if (analysis.summary.datesAndTerms) {
    lines.push("Key dates and terms:");
    lines.push(analysis.summary.datesAndTerms);
    lines.push("");
  }
  
  // Risk Flags
  if (analysis.riskFlags && analysis.riskFlags.length > 0) {
    lines.push("");
    lines.push("RISK FLAGS");
    lines.push("─".repeat(40));
    lines.push("");
    
    for (const risk of analysis.riskFlags as RiskFlag[]) {
      lines.push(`[${risk.severity.toUpperCase()}] ${risk.title}`);
      lines.push(risk.explanation);
      lines.push(`Reference: ${risk.clauseReference}`);
      lines.push(`Confidence: ${Math.round(risk.confidence * 100)}%`);
      lines.push("");
    }
  }
  
  // Key Terms
  if (analysis.keyTerms && analysis.keyTerms.length > 0) {
    lines.push("");
    lines.push("KEY TERMS");
    lines.push("─".repeat(40));
    lines.push("");
    
    for (const term of analysis.keyTerms) {
      lines.push(`${term.category}: ${term.value}`);
      if (term.notes) {
        lines.push(`  Note: ${term.notes}`);
      }
    }
  }
  
  lines.push("");
  lines.push("═".repeat(60));
  lines.push("Generated by Redline IQ - Know What You're Signing");
  lines.push("═".repeat(60));
  
  return lines.join("\n");
}

export function generateNegotiationPackPdf(contract: Contract): Buffer {
  const doc = new jsPDF();
  const analysis = contract.analysis as AnalysisResult | null;
  
  let y = 20;
  const marginLeft = 20;
  const maxWidth = 170;
  const lineHeight = 7;
  
  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Negotiation Pack", marginLeft, y);
  y += 12;
  
  // Contract name
  doc.setFontSize(14);
  doc.text(contract.name, marginLeft, y);
  y += 8;
  
  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, marginLeft, y);
  y += 15;
  
  if (!analysis) {
    doc.text("Analysis not available.", marginLeft, y);
    return Buffer.from(doc.output("arraybuffer"));
  }
  
  // Disclaimer
  doc.setFontSize(9);
  doc.setTextColor(100);
  const disclaimer = "DISCLAIMER: This is informational, not legal advice. Use these suggestions as starting points for discussion.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, maxWidth);
  doc.text(disclaimerLines, marginLeft, y);
  y += disclaimerLines.length * 5 + 10;
  doc.setTextColor(0);
  
  // Verdict Section
  if (analysis.verdict) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const verdictColor = {
      "Safe": [50, 150, 50],
      "Caution": [220, 150, 50],
      "High Risk": [220, 100, 50],
      "Do Not Sign": [220, 50, 50],
    };
    const color = verdictColor[analysis.verdict.verdict] || [100, 100, 100];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`Verdict: ${analysis.verdict.verdict} (Risk Score: ${analysis.verdict.riskScore}/100)`, marginLeft, y);
    y += 10;
    doc.setTextColor(0);
    
    // Negotiation Priorities
    if (analysis.verdict.negotiationPriorities && analysis.verdict.negotiationPriorities.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("What to Negotiate First", marginLeft, y);
      y += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      analysis.verdict.negotiationPriorities.forEach((priority, i) => {
        doc.text(`${i + 1}. ${priority}`, marginLeft, y);
        y += 6;
      });
      y += 5;
    }
  }
  
  // Risk-by-Risk Negotiation Suggestions
  const risksWithNegotiation = (analysis.riskFlags as RiskFlag[]).filter(r => r.negotiation);
  
  if (risksWithNegotiation.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Clause-by-Clause Negotiation Guide", marginLeft, y);
    y += 12;
    
    for (const risk of risksWithNegotiation) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      
      // Risk title
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const severityColor = {
        High: [220, 50, 50],
        Medium: [220, 150, 50],
        Low: [50, 150, 50],
      };
      const sColor = severityColor[risk.severity] || [100, 100, 100];
      doc.setTextColor(sColor[0], sColor[1], sColor[2]);
      doc.text(`[${risk.severity}] ${risk.title}`, marginLeft, y);
      y += 7;
      doc.setTextColor(0);
      
      if (risk.negotiation) {
        doc.setFontSize(9);
        
        // What it does
        doc.setFont("helvetica", "bold");
        doc.text("What this clause does:", marginLeft, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const whatLines = doc.splitTextToSize(risk.negotiation.whatItDoes, maxWidth);
        doc.text(whatLines, marginLeft, y);
        y += whatLines.length * 4 + 3;
        
        // Why it's risky
        doc.setFont("helvetica", "bold");
        doc.text("Why it's risky:", marginLeft, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const whyLines = doc.splitTextToSize(risk.negotiation.whyItsRisky, maxWidth);
        doc.text(whyLines, marginLeft, y);
        y += whyLines.length * 4 + 3;
        
        // Suggested change
        doc.setFont("helvetica", "bold");
        doc.text("Suggested change:", marginLeft, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const suggLines = doc.splitTextToSize(risk.negotiation.suggestedChangePlain, maxWidth);
        doc.text(suggLines, marginLeft, y);
        y += suggLines.length * 4 + 3;
        
        // Negotiation script
        doc.setFont("helvetica", "bold");
        doc.text("What to say:", marginLeft, y);
        y += 5;
        doc.setFont("helvetica", "italic");
        const scriptLines = doc.splitTextToSize(`"${risk.negotiation.negotiationScript}"`, maxWidth);
        doc.text(scriptLines, marginLeft, y);
        y += scriptLines.length * 4 + 8;
        doc.setFont("helvetica", "normal");
      }
    }
  }
  
  // Questions to Ask section
  if (analysis.clarifyingQuestions && analysis.clarifyingQuestions.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Questions to Ask the Other Party", marginLeft, y);
    y += lineHeight;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    analysis.clarifyingQuestions.forEach((q, i) => {
      const qLines = doc.splitTextToSize(`${i + 1}. ${q.question}`, maxWidth);
      doc.text(qLines, marginLeft, y);
      y += qLines.length * 5 + 3;
    });
  }
  
  return Buffer.from(doc.output("arraybuffer"));
}
