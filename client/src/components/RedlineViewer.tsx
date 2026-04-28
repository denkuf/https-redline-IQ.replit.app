import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, Copy, Check, FileEdit, ChevronUp, ChevronDown, Download, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Redline } from "@shared/schema";

interface RedlineViewerProps {
  contractId: number;
  contractText: string;
  redlines: Redline[];
  contractName: string;
  open: boolean;
  onClose: () => void;
}

interface Segment {
  type: "text" | "redline";
  content: string;
  redline?: Redline;
}

type EditStatus = "accepted" | "rejected" | "pending";

/**
 * Build inline diff segments using stable server-resolved positions (r.start / r.end).
 * Only redlines with non-empty originalText AND resolved positions appear inline;
 * the rest are shown in a fallback section — nothing is dropped.
 */
function buildSegments(contractText: string, redlines: Redline[]): Segment[] {
  const located = redlines
    .filter(r => r.originalText && r.originalText.trim() !== "" && r.start !== undefined && r.end !== undefined)
    .map(r => ({ redline: r, start: r.start!, end: r.end! }))
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let pos = 0;
  for (const loc of located) {
    if (loc.start < pos) continue;
    if (loc.start > pos) {
      segments.push({ type: "text", content: contractText.slice(pos, loc.start) });
    }
    segments.push({ type: "redline", content: contractText.slice(loc.start, loc.end), redline: loc.redline });
    pos = loc.end;
  }
  if (pos < contractText.length) {
    segments.push({ type: "text", content: contractText.slice(pos) });
  }
  return segments;
}

/**
 * Build the plain-text copy output including only accepted redlines.
 * If no redlines are accepted, returns empty string.
 */
function buildCleanCopy(
  contractText: string,
  redlines: Redline[],
  statusMap: Record<number, EditStatus>
): string {
  const acceptedIds = new Set(redlines.filter(r => statusMap[r.id] === "accepted").map(r => r.id));
  const acceptedRedlines = redlines.filter(r => acceptedIds.has(r.id));

  if (acceptedRedlines.length === 0) return "";

  const segments = buildSegments(contractText, acceptedRedlines);
  const insertions = acceptedRedlines.filter(r => !r.originalText || r.originalText.trim() === "");
  const unmatched = acceptedRedlines.filter(
    r => r.originalText && r.originalText.trim() !== "" && (r.start === undefined || r.end === undefined)
  );

  let output = "";
  for (const seg of segments) {
    if (seg.type === "text") {
      output += seg.content;
    } else if (seg.redline) {
      output += `[DELETED: ${seg.content}][ADDED: ${seg.redline.replacementText}]`;
    }
  }

  if (unmatched.length > 0) {
    output += "\n\n--- REPLACEMENT EDITS (see contract for location) ---\n";
    for (const r of unmatched) {
      output += `\n[EDIT ${r.id}${r.riskFlagTitle ? ` – ${r.riskFlagTitle}` : ""}]\n`;
      output += `[DELETED: ${r.originalText}]\n`;
      output += `[ADDED: ${r.replacementText}]\n`;
      output += `Reason: ${r.reason}\n`;
    }
  }

  if (insertions.length > 0) {
    output += "\n\n--- SUGGESTED ADDITIONS (missing clauses) ---\n";
    for (const r of insertions) {
      output += `\n[ADDED – ${r.riskFlagTitle || "New Clause"}]\n${r.replacementText}\n`;
    }
  }

  return output;
}

export function RedlineViewer({ contractId, contractText, redlines, contractName, open, onClose }: RedlineViewerProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeRedline, setActiveRedline] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(redlines.map(r => r.id)));
  const [statusMap, setStatusMap] = useState<Record<number, EditStatus>>({});
  const redlineRefs = useRef<Record<number, HTMLElement | null>>({});
  const { toast } = useToast();

  // Keep selectedIds in sync when redlines change (e.g. after regeneration)
  useEffect(() => {
    setSelectedIds(new Set(redlines.map(r => r.id)));
  }, [redlines]);

  const allSelected = selectedIds.size === redlines.length;
  const noneSelected = selectedIds.size === 0;

  const toggleId = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(redlines.map(r => r.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const handleDownloadDocx = async () => {
    setDownloading(true);
    try {
      // When all are selected, send no filter (include everything — fast path).
      // When a partial or empty selection is active, send the explicit ID list.
      // An empty ids array produces a clean docx with no tracked changes.
      const body: { ids?: number[] } = {};
      if (!allSelected) body.ids = Array.from(selectedIds);
      const res = await fetch(`/api/contracts/${contractId}/export/redlines`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contractName.replace(/[^a-zA-Z0-9_-]/g, "_")}_redlined.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: "Download failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const segments = buildSegments(contractText, redlines);
  const insertionRedlines = redlines.filter(r => !r.originalText || r.originalText.trim() === "");
  const unmatchedRedlines = redlines.filter(
    r => r.originalText && r.originalText.trim() !== "" && (r.start === undefined || r.end === undefined)
  );

  const allIds = redlines.map(r => r.id);
  const acceptedCount = redlines.filter(r => statusMap[r.id] === "accepted").length;

  const getStatus = (id: number): EditStatus => statusMap[id] ?? "pending";

  const toggleAccept = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setStatusMap(prev => ({
      ...prev,
      [id]: prev[id] === "accepted" ? "pending" : "accepted",
    }));
  };

  const toggleReject = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setStatusMap(prev => ({
      ...prev,
      [id]: prev[id] === "rejected" ? "pending" : "rejected",
    }));
  };

  const handleCopy = () => {
    const clean = buildCleanCopy(contractText, redlines, statusMap);
    if (!clean) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(clean).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(clean);
      });
    } else {
      fallbackCopy(clean);
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silently fail */ }
    document.body.removeChild(ta);
  };

  const scrollToRedline = (id: number) => {
    setActiveRedline(id);
    const el = redlineRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const navigateRedline = (direction: "prev" | "next") => {
    if (allIds.length === 0) return;
    if (activeRedline === null) {
      scrollToRedline(allIds[0]);
      return;
    }
    const currentIdx = allIds.indexOf(activeRedline);
    const nextIdx = direction === "next"
      ? (currentIdx + 1) % allIds.length
      : (currentIdx - 1 + allIds.length) % allIds.length;
    scrollToRedline(allIds[nextIdx]);
  };

  const statusBadge = (id: number) => {
    const status = getStatus(id);
    if (status === "accepted") return (
      <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-400 dark:border-green-700" data-testid={`status-accepted-${id}`}>
        Accepted
      </Badge>
    );
    if (status === "rejected") return (
      <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600" data-testid={`status-rejected-${id}`}>
        Rejected
      </Badge>
    );
    return null;
  };

  const acceptRejectButtons = (id: number) => {
    const status = getStatus(id);
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <Button
          size="icon"
          variant="ghost"
          className={`h-6 w-6 rounded-full transition-colors ${status === "accepted" ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400" : "text-muted-foreground hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20"}`}
          onClick={(e) => toggleAccept(id, e)}
          title={status === "accepted" ? "Undo accept" : "Accept this edit"}
          data-testid={`button-accept-${id}`}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={`h-6 w-6 rounded-full transition-colors ${status === "rejected" ? "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400" : "text-muted-foreground hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"}`}
          onClick={(e) => toggleReject(id, e)}
          title={status === "rejected" ? "Undo reject" : "Reject this edit"}
          data-testid={`button-reject-${id}`}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-screen max-w-none flex flex-col p-0 gap-0"
        data-testid="redline-viewer"
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileEdit className="h-5 w-5 text-primary shrink-0" />
            <SheetTitle className="text-base truncate">Redlined: {contractName}</SheetTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigateRedline("prev")}
                data-testid="button-redline-prev"
                title="Previous edit"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[4rem] text-center">
                {redlines.length} edit{redlines.length !== 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigateRedline("next")}
                data-testid="button-redline-next"
                title="Next edit"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadDocx}
              disabled={downloading}
              data-testid="button-download-docx"
              className="h-8 text-xs"
              title={noneSelected ? "Downloads a clean copy with no tracked changes" : undefined}
            >
              {downloading ? (
                <><Download className="h-3.5 w-3.5 mr-1.5 animate-bounce" />Downloading...</>
              ) : noneSelected ? (
                <><Download className="h-3.5 w-3.5 mr-1.5" />Download clean copy</>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download .docx
                  {!allSelected && (
                    <span className="ml-1 text-muted-foreground">({selectedIds.size}/{redlines.length})</span>
                  )}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={acceptedCount === 0}
              data-testid="button-copy-redlined-text"
              className="h-8 text-xs"
              title={acceptedCount === 0 ? "Accept at least one edit to copy" : `Copy ${acceptedCount} accepted edit${acceptedCount !== 1 ? "s" : ""}`}
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy{acceptedCount > 0 ? ` (${acceptedCount})` : ""}</>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} data-testid="button-close-redlines">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b text-xs shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="line-through text-red-600 dark:text-red-400">Deleted text</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="underline text-green-700 dark:text-green-400">Added text</span>
          </span>
          <span className="flex items-center gap-1.5 ml-2 text-muted-foreground">
            <ThumbsUp className="h-3 w-3" /> Accept &nbsp;/&nbsp; <ThumbsDown className="h-3 w-3" /> Reject each edit
          </span>
          <span className="text-muted-foreground ml-auto">
            {redlines.length} edit{redlines.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Contract body with inline diffs */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 font-mono text-sm leading-relaxed whitespace-pre-wrap" data-testid="redline-contract-body">
            {segments.map((seg, i) => {
              if (seg.type === "text") {
                return <span key={i}>{seg.content}</span>;
              }
              const r = seg.redline!;
              const isActive = activeRedline === r.id;
              const status = getStatus(r.id);
              return (
                <span
                  key={i}
                  ref={(el) => { redlineRefs.current[r.id] = el; }}
                  className={`relative cursor-pointer transition-colors rounded-sm ${isActive ? "outline outline-2 outline-primary/60 outline-offset-1" : ""} ${status === "accepted" ? "bg-green-50 dark:bg-green-950/30" : status === "rejected" ? "opacity-40" : ""}`}
                  onClick={() => setActiveRedline(isActive ? null : r.id)}
                  data-testid={`redline-edit-${r.id}`}
                >
                  {/* Deleted text */}
                  <span className="line-through text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-0.5">
                    {seg.content}
                  </span>
                  {/* Inserted text */}
                  <span className="underline text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-0.5">
                    {r.replacementText}
                  </span>
                  {/* Edit number badge */}
                  <sup className="ml-0.5 text-[10px] font-bold text-primary cursor-pointer select-none" title={r.reason}>
                    [{r.id}]
                  </sup>
                  {/* Tooltip on active */}
                  {isActive && (
                    <span className="absolute top-full left-0 z-10 mt-1 bg-popover border text-popover-foreground text-xs rounded-md px-3 py-2 shadow-md max-w-xs leading-snug space-y-2">
                      <strong className="block text-primary">Edit {r.id}{r.riskFlagTitle ? ` — ${r.riskFlagTitle}` : ""}</strong>
                      <span className="block">{r.reason}</span>
                      <span className="flex items-center gap-1 pt-1">
                        {acceptRejectButtons(r.id)}
                        {statusBadge(r.id)}
                      </span>
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {/* Unmatched replacements — originalText present but position couldn't be resolved */}
          {unmatchedRedlines.length > 0 && (
            <div className="px-5 pb-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-t pt-4">
                Additional Replacements
              </h3>
              {unmatchedRedlines.map((r) => {
                const status = getStatus(r.id);
                return (
                  <div
                    key={r.id}
                    ref={(el) => { redlineRefs.current[r.id] = el; }}
                    className={`rounded-md border p-3 space-y-2 cursor-pointer transition-colors ${activeRedline === r.id ? "border-primary/60 bg-primary/5" : status === "accepted" ? "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/20" : status === "rejected" ? "border-border opacity-40" : "border-border"}`}
                    onClick={() => setActiveRedline(activeRedline === r.id ? null : r.id)}
                    data-testid={`redline-edit-${r.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">[{r.id}]</Badge>
                        {r.riskFlagTitle && (
                          <span className="text-xs text-muted-foreground">{r.riskFlagTitle}</span>
                        )}
                        {statusBadge(r.id)}
                      </div>
                      {acceptRejectButtons(r.id)}
                    </div>
                    <p className="font-mono text-xs text-red-600 dark:text-red-400 line-through bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">
                      {r.originalText}
                    </p>
                    <p className="font-mono text-xs text-green-700 dark:text-green-400 underline bg-green-50 dark:bg-green-900/30 rounded px-2 py-1">
                      {r.replacementText}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Insertion-only redlines (missing clauses with no original text) */}
          {insertionRedlines.length > 0 && (
            <div className="px-5 pb-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground border-t pt-4">
                Suggested Additions (missing clauses)
              </h3>
              {insertionRedlines.map((r) => {
                const status = getStatus(r.id);
                return (
                  <div
                    key={r.id}
                    ref={(el) => { redlineRefs.current[r.id] = el; }}
                    className={`rounded-md border p-3 space-y-1 cursor-pointer transition-colors ${activeRedline === r.id ? "border-primary/60 bg-primary/5" : status === "accepted" ? "border-green-500 bg-green-100 dark:border-green-600 dark:bg-green-950/40" : status === "rejected" ? "border-border bg-muted opacity-40" : "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20"}`}
                    onClick={() => setActiveRedline(activeRedline === r.id ? null : r.id)}
                    data-testid={`redline-insertion-${r.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs text-green-700 dark:text-green-400 border-green-400">
                          Add [{r.id}]
                        </Badge>
                        {r.riskFlagTitle && (
                          <span className="text-xs text-muted-foreground">{r.riskFlagTitle}</span>
                        )}
                        {statusBadge(r.id)}
                      </div>
                      {acceptRejectButtons(r.id)}
                    </div>
                    <p className="font-mono text-sm text-green-700 dark:text-green-400 underline leading-relaxed">
                      {r.replacementText}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Edit summary (numbered list for all redlines) */}
          <div className="px-5 pb-8 space-y-2 border-t mt-2 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">
                Edit Summary
                {!allSelected && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {selectedIds.size} of {redlines.length} selected for download
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={allSelected ? deselectAll : selectAll}
                  className="text-xs text-primary hover:underline"
                  data-testid="button-select-all-redlines"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>
            </div>
            {redlines.map((r) => {
              const status = getStatus(r.id);
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs border transition-colors ${activeRedline === r.id ? "border-primary bg-primary/5" : status === "accepted" ? "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/20" : status === "rejected" ? "border-border opacity-40 bg-muted" : "border-border hover:bg-muted/50"}`}
                  data-testid={`redline-summary-${r.id}`}
                >
                  <Checkbox
                    id={`include-redline-${r.id}`}
                    checked={selectedIds.has(r.id)}
                    onCheckedChange={() => toggleId(r.id)}
                    className="mt-0.5 shrink-0"
                    data-testid={`checkbox-include-redline-${r.id}`}
                    title="Include in download"
                  />
                  <button
                    onClick={() => scrollToRedline(r.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <span className={`font-bold mr-2 ${!selectedIds.has(r.id) ? "text-muted-foreground" : ""}`}>[{r.id}]</span>
                    {r.riskFlagTitle && (
                      <span className={`font-medium mr-1 ${!selectedIds.has(r.id) ? "text-muted-foreground" : ""}`}>{r.riskFlagTitle} —</span>
                    )}
                    <span className="text-muted-foreground">{r.reason}</span>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {statusBadge(r.id)}
                    {acceptRejectButtons(r.id)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
