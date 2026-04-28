import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { Contract, AnalysisResult, RiskFlag, Redline } from "@shared/schema";

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

// ─── Smart Redline .docx Generator ─────────────────────────────────────────
// Generates a Word-compatible .docx file with native track-changes markup
// (<w:ins> for insertions, <w:del> for deletions) so Word and Google Docs
// can show Accept/Reject controls per edit.

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface DocSegment {
  type: "text" | "redline";
  content: string;
  redline?: Redline;
}

function buildDocSegments(contractText: string, redlines: Redline[]): DocSegment[] {
  const located = redlines
    .filter(r => r.originalText && r.originalText.trim() !== "" && r.start !== undefined && r.end !== undefined)
    .map(r => ({ redline: r, start: r.start!, end: r.end! }))
    .sort((a, b) => a.start - b.start);

  const segments: DocSegment[] = [];
  let pos = 0;
  for (const loc of located) {
    if (loc.start < pos) continue;
    if (loc.start > pos) segments.push({ type: "text", content: contractText.slice(pos, loc.start) });
    segments.push({ type: "redline", content: contractText.slice(loc.start, loc.end), redline: loc.redline });
    pos = loc.end;
  }
  if (pos < contractText.length) segments.push({ type: "text", content: contractText.slice(pos) });
  return segments;
}

function buildRevisionRun(
  text: string,
  type: "del" | "ins",
  revId: number,
  author: string,
  date: string
): string {
  // Split on \n; within a del/ins run, line breaks become <w:br/>
  const lines = text.split("\n");
  const parts = lines
    .map((line, i) => {
      const br = i > 0 ? "<w:br/>" : "";
      const esc = xmlEscape(line);
      if (type === "del") {
        return `${br}${esc ? `<w:delText xml:space="preserve">${esc}</w:delText>` : ""}`;
      } else {
        return `${br}${esc ? `<w:t xml:space="preserve">${esc}</w:t>` : ""}`;
      }
    })
    .join("");

  if (type === "del") {
    return (
      `<w:del w:id="${revId}" w:author="${xmlEscape(author)}" w:date="${date}">` +
      `<w:r><w:rPr><w:color w:val="CC0000"/><w:strike/></w:rPr>${parts}</w:r>` +
      `</w:del>`
    );
  } else {
    return (
      `<w:ins w:id="${revId}" w:author="${xmlEscape(author)}" w:date="${date}">` +
      `<w:r><w:rPr><w:color w:val="008000"/><w:u w:val="single"/></w:rPr>${parts}</w:r>` +
      `</w:ins>`
    );
  }
}

function buildDocumentXml(contractText: string, redlines: Redline[], contractName: string): string {
  const segments = buildDocSegments(contractText, redlines);
  const insertionRedlines = redlines.filter(r => !r.originalText || r.originalText.trim() === "");
  const unmatchedRedlines = redlines.filter(
    r => r.originalText && r.originalText.trim() !== "" && (r.start === undefined || r.end === undefined)
  );

  const author = "RedlineIQ";
  const date = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  let revId = 1;
  const paragraphs: string[] = [];
  let currentRuns: string[] = [];

  const flushParagraph = () => {
    paragraphs.push(`<w:p>${currentRuns.join("")}</w:p>`);
    currentRuns = [];
  };

  // Title
  paragraphs.push(
    `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>` +
    `<w:r><w:t xml:space="preserve">Redlined: ${xmlEscape(contractName)}</w:t></w:r></w:p>`
  );
  // Disclaimer subtitle
  paragraphs.push(
    `<w:p><w:r><w:rPr><w:i/><w:color w:val="666666"/></w:rPr>` +
    `<w:t>Generated by RedlineIQ. Strikethrough (red) = suggested deletion. Underline (green) = suggested insertion. This is informational, not legal advice.</w:t></w:r></w:p>`
  );
  paragraphs.push(`<w:p/>`);

  // Process inline segments
  for (const seg of segments) {
    if (seg.type === "text") {
      const lines = seg.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) flushParagraph();
        if (lines[i]) {
          currentRuns.push(`<w:r><w:t xml:space="preserve">${xmlEscape(lines[i])}</w:t></w:r>`);
        }
      }
    } else if (seg.type === "redline" && seg.redline) {
      const r = seg.redline;
      currentRuns.push(buildRevisionRun(seg.content, "del", revId++, author, date));
      currentRuns.push(buildRevisionRun(r.replacementText, "ins", revId++, author, date));
    }
  }
  flushParagraph();

  // Unmatched redlines (position unresolved — shown as separate paragraphs)
  if (unmatchedRedlines.length > 0) {
    paragraphs.push(`<w:p/>`);
    paragraphs.push(
      `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>` +
      `<w:r><w:t>Additional Replacements</w:t></w:r></w:p>`
    );
    for (const r of unmatchedRedlines) {
      paragraphs.push(
        `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${xmlEscape(r.riskFlagTitle || `Edit ${r.id}`)}</w:t></w:r></w:p>`
      );
      paragraphs.push(
        `<w:p>` +
        buildRevisionRun(r.originalText, "del", revId++, author, date) +
        buildRevisionRun(r.replacementText, "ins", revId++, author, date) +
        `</w:p>`
      );
      paragraphs.push(
        `<w:p><w:r><w:rPr><w:i/><w:color w:val="666666"/></w:rPr>` +
        `<w:t xml:space="preserve">${xmlEscape(r.reason)}</w:t></w:r></w:p>`
      );
    }
  }

  // Insertion-only clauses (suggested additions)
  if (insertionRedlines.length > 0) {
    paragraphs.push(`<w:p/>`);
    paragraphs.push(
      `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>` +
      `<w:r><w:t>Suggested Additions</w:t></w:r></w:p>`
    );
    for (const r of insertionRedlines) {
      paragraphs.push(
        `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${xmlEscape(r.riskFlagTitle || `Addition ${r.id}`)}</w:t></w:r></w:p>`
      );
      paragraphs.push(
        `<w:p>` +
        buildRevisionRun(r.replacementText, "ins", revId++, author, date) +
        `</w:p>`
      );
      paragraphs.push(
        `<w:p><w:r><w:rPr><w:i/><w:color w:val="666666"/></w:rPr>` +
        `<w:t xml:space="preserve">${xmlEscape(r.reason)}</w:t></w:r></w:p>`
      );
    }
  }

  const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${NS_W}" xmlns:r="${NS_R}">` +
    `<w:body>` +
    paragraphs.join("") +
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>` +
    `</w:body></w:document>`
  );
}

export async function generateRedlineDocx(
  contractText: string,
  redlines: Redline[],
  contractName: string
): Promise<Buffer> {
  const documentXml = buildDocumentXml(contractText, redlines, contractName);

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

  const relsMain = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const relsDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;

  const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:trackChanges/>
  <w:defaultTabStop w:val="720"/>
</w:settings>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:rPr><w:b/><w:sz w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
</w:styles>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")!.file(".rels", relsMain);
  const wordFolder = zip.folder("word")!;
  wordFolder.file("document.xml", documentXml);
  wordFolder.file("styles.xml", stylesXml);
  wordFolder.file("settings.xml", settingsXml);
  wordFolder.folder("_rels")!.file("document.xml.rels", relsDoc);

  const arrayBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  return Buffer.from(arrayBuffer);
}
