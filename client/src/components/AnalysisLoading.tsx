import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, AlertTriangle, ClipboardList } from "lucide-react";
import { logoImg } from "@/components/Logo";

export function AnalysisLoading() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2">
              <img src={logoImg} alt="RedlineIQ" className="h-10 w-10 object-contain mix-blend-multiply dark:mix-blend-normal animate-pulse-soft" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Analyzing Your Contract...</h3>
              <p className="text-sm text-muted-foreground">
                Our AI is reviewing the document for risks and key terms. This may take a moment.
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <Skeleton className="h-6 w-36" />
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-md bg-muted/50">
                <div className="flex items-center gap-3 mb-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
