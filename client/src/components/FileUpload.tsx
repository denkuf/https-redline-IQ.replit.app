import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Image, X, Settings2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { IndustryModeSelector } from "./IndustryModeSelector";
import { RiskPreferencesForm } from "./RiskPreferencesForm";
import type { IndustryMode, RiskPreferences } from "@shared/schema";

interface FileUploadProps {
  onUpload: (file: File | null, text: string | null, industryMode: IndustryMode, riskPreferences?: RiskPreferences) => void;
  isLoading?: boolean;
}

const ACCEPTED_TYPES = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/msword": "DOC",
  "image/jpeg": "JPG",
  "image/png": "PNG",
};

const defaultPreferences: RiskPreferences = {
  riskTolerance: "moderate",
  prioritizeFlexibility: false,
  tolerateArbitration: false,
  wantEasyTermination: true,
};

export function FileUpload({ onUpload, isLoading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [industryMode, setIndustryMode] = useState<IndustryMode>("general");
  const [riskPreferences, setRiskPreferences] = useState<RiskPreferences>(defaultPreferences);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (Object.keys(ACCEPTED_TYPES).includes(file.type)) {
        setSelectedFile(file);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    const prefs = showAdvanced ? riskPreferences : undefined;
    if ((activeTab === "upload" || activeTab === "camera") && selectedFile) {
      onUpload(selectedFile, null, industryMode, prefs);
    } else if (activeTab === "paste" && pastedText.trim()) {
      onUpload(null, pastedText.trim(), industryMode, prefs);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-8 w-8 text-primary" />;
    return <FileText className="h-8 w-8 text-primary" />;
  };

  return (
    <Card className="p-6 border-border/40">
      <div className="mb-6">
        <IndustryModeSelector value={industryMode} onChange={setIndustryMode} disabled={isLoading} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Upload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Upload</span>
            <span className="sm:hidden">File</span>
          </TabsTrigger>
          <TabsTrigger value="camera" data-testid="tab-camera">
            <Camera className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Take Photo</span>
            <span className="sm:hidden">Photo</span>
          </TabsTrigger>
          <TabsTrigger value="paste" data-testid="tab-paste">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Paste</span>
            <span className="sm:hidden">Text</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          {selectedFile ? (
            <div className="flex items-center gap-4 p-4 rounded-md bg-muted">
              {getFileIcon(selectedFile.type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFile}
                data-testid="button-clear-file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-file-upload"
              />
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Drop your contract here</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports PDF, DOC, DOCX, JPG, PNG
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="camera" className="space-y-4">
          {selectedFile && selectedFile.type.startsWith("image/") ? (
            <div className="flex items-center gap-4 p-4 rounded-md bg-muted">
              <Image className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFile}
                data-testid="button-clear-camera-file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="relative border-2 border-dashed rounded-lg p-12 transition-colors border-primary/50 bg-primary/5 cursor-pointer"
              onClick={() => cameraInputRef.current?.click()}
            >
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-camera-capture"
              />
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Take a photo of your contract</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tap to open camera
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Our AI will extract and analyze the text
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paste" className="space-y-4">
          <Textarea
            placeholder="Paste your contract text here..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            className="min-h-[300px] resize-none"
            data-testid="textarea-paste-contract"
          />
          <p className="text-xs text-muted-foreground">
            Paste the full contract text or the specific sections you want analyzed
          </p>
        </TabsContent>
      </Tabs>

      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="mt-6">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start" data-testid="button-advanced-options">
            <Settings2 className="h-4 w-4 mr-2" />
            {showAdvanced ? "Hide" : "Show"} Advanced Options
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <RiskPreferencesForm preferences={riskPreferences} onChange={setRiskPreferences} />
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-6">
        <Button
          onClick={handleSubmit}
          disabled={
            isLoading ||
            ((activeTab === "upload" || activeTab === "camera") && !selectedFile) ||
            (activeTab === "paste" && !pastedText.trim())
          }
          className="w-full rounded-lg h-11"
          data-testid="button-analyze"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze Contract"
          )}
        </Button>
      </div>
    </Card>
  );
}
