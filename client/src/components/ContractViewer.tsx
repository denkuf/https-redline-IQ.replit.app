import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, MessageSquareText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ContractViewerProps {
  text: string;
  onExplainSelection?: (text: string) => void;
  isExplaining?: boolean;
  explanation?: string;
}

export function ContractViewer({
  text,
  onExplainSelection,
  isExplaining,
  explanation,
}: ContractViewerProps) {
  const [selectedText, setSelectedText] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim() || "";
    if (selected.length > 10) {
      setSelectedText(selected);
    }
  };

  const handleExplain = () => {
    if (selectedText && onExplainSelection) {
      onExplainSelection(selectedText);
      setPopoverOpen(true);
    }
  };

  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Contract Text
          </CardTitle>
          {selectedText && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleExplain}
                  disabled={isExplaining}
                  data-testid="button-explain-selection"
                >
                  <MessageSquareText className="h-4 w-4 mr-2" />
                  Explain Selection
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium">Explanation</h4>
                  {isExplaining ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Analyzing...</span>
                    </div>
                  ) : explanation ? (
                    <p className="text-sm text-muted-foreground">{explanation}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select some text and click "Explain Selection" to get a plain-English explanation.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Select any text to get a plain-English explanation
        </p>
        <ScrollArea className="h-[500px] rounded-md border p-4">
          <div
            className="prose prose-sm dark:prose-invert max-w-none select-text"
            onMouseUp={handleTextSelection}
            data-testid="contract-text-content"
          >
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="mb-4 last:mb-0 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
