import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Image, X, Settings2, Camera, Info, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { IndustryModeSelector } from "./IndustryModeSelector";
import { RiskPreferencesForm } from "./RiskPreferencesForm";
import type { IndustryMode, RiskPreferences } from "@shared/schema";

interface FileUploadProps {
  onUpload: (files: File[], text: string | null, industryMode: IndustryMode, riskPreferences?: RiskPreferences, context?: string) => void;
  isLoading?: boolean;
}

const ACCEPTED_TYPES: Record<string, string> = {
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

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function FileUpload({ onUpload, isLoading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [cameraFile, setCameraFile] = useState<File | null>(null);
  const [cameraPreviewUrl, setCameraPreviewUrl] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [industryMode, setIndustryMode] = useState<IndustryMode>("general");
  const [riskPreferences, setRiskPreferences] = useState<RiskPreferences>(defaultPreferences);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [context, setContext] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: File[]) => {
    setSelectedFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const fresh = incoming.filter(f => {
        if (!Object.keys(ACCEPTED_TYPES).includes(f.type)) return false;
        return !existing.has(f.name + f.size);
      });
      return [...prev, ...fresh].slice(0, 5);
    });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (cameraPreviewUrl) URL.revokeObjectURL(cameraPreviewUrl);
      setCameraFile(file);
      setCameraPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearCameraFile = () => {
    if (cameraPreviewUrl) URL.revokeObjectURL(cameraPreviewUrl);
    setCameraFile(null);
    setCameraPreviewUrl(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const prefs = showAdvanced ? riskPreferences : undefined;
    const ctx = context.trim() || undefined;
    if (activeTab === "upload" && selectedFiles.length > 0) {
      onUpload(selectedFiles, null, industryMode, prefs, ctx);
    } else if (activeTab === "camera" && cameraFile) {
      onUpload([cameraFile], null, industryMode, prefs, ctx);
    } else if (activeTab === "paste" && pastedText.trim()) {
      onUpload([], pastedText.trim(), industryMode, prefs, ctx);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-5 w-5 text-primary" />;
    return <FileText className="h-5 w-5 text-primary" />;
  };

  const canSubmit = !isLoading && (
    (activeTab === "upload" && selectedFiles.length > 0) ||
    (activeTab === "camera" && cameraFile !== null) ||
    (activeTab === "paste" && pastedText.trim().length > 0)
  );

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

        <TabsContent value="upload" className="space-y-3">
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-muted" data-testid={`file-item-${index}`}>
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeFile(index)}
                    disabled={isLoading}
                    data-testid={`button-remove-file-${index}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {selectedFiles.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  data-testid="button-add-more-files"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add exhibit or schedule ({selectedFiles.length}/5)
                </Button>
              )}
            </div>
          )}

          {selectedFiles.length === 0 && (
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
                multiple
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-testid="input-file-upload"
              />
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Drop your contract here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, JPG, PNG · Up to 5 files (main contract + exhibits)
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </TabsContent>

        <TabsContent value="camera" className="space-y-4">
          {cameraFile && cameraPreviewUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-border/50">
                <img
                  src={cameraPreviewUrl}
                  alt="Contract photo preview"
                  className="w-full max-h-48 object-contain bg-muted"
                  data-testid="img-camera-preview"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 rounded-full shadow"
                  onClick={clearCameraFile}
                  disabled={isLoading}
                  data-testid="button-clear-camera-file"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted">
                <Image className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cameraFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(cameraFile.size)}</p>
                </div>
              </div>
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                For best results, ensure the text is clearly visible and well-lit. Poor image quality may reduce analysis accuracy.
              </div>
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
                onChange={handleCameraChange}
                className="hidden"
                data-testid="input-camera-capture"
              />
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Take a photo of your contract</p>
                  <p className="text-sm text-muted-foreground mt-1">Tap to open camera</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Our AI will extract and analyse the text
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
            Paste the full contract text or the specific sections you want analysed
          </p>
        </TabsContent>
      </Tabs>

      <div className="mt-6 space-y-2">
        <Label htmlFor="context-field" className="flex items-center gap-1.5 text-sm font-medium">
          Your Context
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="context-field"
          placeholder={`Describe your situation — e.g. "This is a freelance web dev contract from a new client. I'm based in California and want to know if the payment terms and IP clauses are fair."`}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="min-h-[80px] resize-none text-sm"
          disabled={isLoading}
          data-testid="textarea-context"
        />
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          The AI uses this alongside the contract text to give you more relevant, personalised analysis.
        </p>
      </div>

      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="mt-4">
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
          disabled={!canSubmit}
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
