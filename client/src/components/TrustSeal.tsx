import { Card, CardContent } from "@/components/ui/card";
import { Check, FileText } from "lucide-react";
import { logoImg } from "@/components/Logo";

interface TrustSealProps {
  className?: string;
}

export function TrustSeal({ className }: TrustSealProps) {
  return (
    <Card className={className} data-testid="trust-seal">
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12">
            <img src={logoImg} alt="RedlineIQ" className="h-10 w-10 object-contain mix-blend-multiply dark:mix-blend-normal" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">Reviewed by Contract Advocate AI</span>
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Grounded in your document
              </span>
              <span>No laws invented</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
