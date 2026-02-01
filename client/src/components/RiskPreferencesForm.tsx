import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Settings2 } from "lucide-react";
import type { RiskPreferences } from "@shared/schema";

interface RiskPreferencesFormProps {
  preferences: RiskPreferences;
  onChange: (preferences: RiskPreferences) => void;
}

export function RiskPreferencesForm({ preferences, onChange }: RiskPreferencesFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5" />
          Your Risk Preferences
        </CardTitle>
        <CardDescription>
          Customize how we analyze contracts based on your priorities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Risk Tolerance</Label>
          <RadioGroup
            value={preferences.riskTolerance}
            onValueChange={(v) => onChange({ ...preferences, riskTolerance: v as any })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="risk_averse" id="risk_averse" />
              <Label htmlFor="risk_averse" className="font-normal cursor-pointer">
                <span className="font-medium">Risk Averse</span>
                <span className="text-muted-foreground"> - Flag even minor concerns</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="moderate" id="moderate" />
              <Label htmlFor="moderate" className="font-normal cursor-pointer">
                <span className="font-medium">Moderate</span>
                <span className="text-muted-foreground"> - Balanced approach</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="risk_tolerant" id="risk_tolerant" />
              <Label htmlFor="risk_tolerant" className="font-normal cursor-pointer">
                <span className="font-medium">Risk Tolerant</span>
                <span className="text-muted-foreground"> - Focus on major issues only</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="flexibility">Prioritize Flexibility</Label>
              <p className="text-sm text-muted-foreground">
                Flag clauses that limit your options
              </p>
            </div>
            <Switch
              id="flexibility"
              checked={preferences.prioritizeFlexibility}
              onCheckedChange={(v) => onChange({ ...preferences, prioritizeFlexibility: v })}
              data-testid="switch-flexibility"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="arbitration">Can Tolerate Arbitration</Label>
              <p className="text-sm text-muted-foreground">
                Arbitration clauses won't be flagged as high risk
              </p>
            </div>
            <Switch
              id="arbitration"
              checked={preferences.tolerateArbitration}
              onCheckedChange={(v) => onChange({ ...preferences, tolerateArbitration: v })}
              data-testid="switch-arbitration"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="termination">Want Easy Termination</Label>
              <p className="text-sm text-muted-foreground">
                Prioritize finding exit clauses and termination fees
              </p>
            </div>
            <Switch
              id="termination"
              checked={preferences.wantEasyTermination}
              onCheckedChange={(v) => onChange({ ...preferences, wantEasyTermination: v })}
              data-testid="switch-termination"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
