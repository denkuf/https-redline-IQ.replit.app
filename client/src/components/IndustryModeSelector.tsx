import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Home, 
  Briefcase, 
  Laptop, 
  ShieldCheck, 
  Cloud, 
  Building2,
  FileText
} from "lucide-react";
import { industryModes, industryModeLabels, type IndustryMode } from "@shared/schema";

interface IndustryModeSelectorProps {
  value: IndustryMode;
  onChange: (mode: IndustryMode) => void;
  disabled?: boolean;
}

const modeIcons: Record<IndustryMode, React.ReactNode> = {
  general: <FileText className="h-4 w-4" />,
  rent_lease: <Home className="h-4 w-4" />,
  employment: <Briefcase className="h-4 w-4" />,
  freelance: <Laptop className="h-4 w-4" />,
  insurance: <ShieldCheck className="h-4 w-4" />,
  saas_subscription: <Cloud className="h-4 w-4" />,
  small_business: <Building2 className="h-4 w-4" />,
};

const modeDescriptions: Record<IndustryMode, string> = {
  general: "General contract analysis",
  rent_lease: "Apartments, houses, commercial spaces",
  employment: "Job offers, employment agreements",
  freelance: "Contractor and freelance work",
  insurance: "Insurance policies and claims",
  saas_subscription: "Software subscriptions and SaaS",
  small_business: "Vendor contracts and B2B deals",
};

export function IndustryModeSelector({ value, onChange, disabled }: IndustryModeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="industry-mode">Contract Type</Label>
      <Select 
        value={value} 
        onValueChange={(v) => onChange(v as IndustryMode)}
        disabled={disabled}
      >
        <SelectTrigger id="industry-mode" className="w-full" data-testid="select-industry-mode">
          <SelectValue placeholder="Select contract type" />
        </SelectTrigger>
        <SelectContent>
          {industryModes.map((mode) => (
            <SelectItem key={mode} value={mode} data-testid={`mode-${mode}`}>
              <div className="flex items-center gap-2">
                {modeIcons[mode]}
                <div className="text-left">
                  <div>{industryModeLabels[mode]}</div>
                  <div className="text-xs text-muted-foreground">{modeDescriptions[mode]}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Selecting the right type helps identify industry-specific risks and what's commonly seen vs unusual.
      </p>
    </div>
  );
}
