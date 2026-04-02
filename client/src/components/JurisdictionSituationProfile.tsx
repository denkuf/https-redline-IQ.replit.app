import { MapPin, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface SituationProfile {
  role: string;
  leverage: string;
  concern: string;
}

interface JurisdictionSituationProfileProps {
  country: string;
  state: string;
  situation: SituationProfile;
  onCountryChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onSituationChange: (s: SituationProfile) => void;
  disabled?: boolean;
}

const PRIORITY_COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
];

const OTHER_COUNTRIES = [
  { code: "AT", label: "Austria" },
  { code: "BE", label: "Belgium" },
  { code: "BR", label: "Brazil" },
  { code: "CN", label: "China" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "HK", label: "Hong Kong" },
  { code: "IN", label: "India" },
  { code: "IE", label: "Ireland" },
  { code: "IL", label: "Israel" },
  { code: "IT", label: "Italy" },
  { code: "JP", label: "Japan" },
  { code: "MX", label: "Mexico" },
  { code: "NL", label: "Netherlands" },
  { code: "NZ", label: "New Zealand" },
  { code: "NG", label: "Nigeria" },
  { code: "NO", label: "Norway" },
  { code: "PK", label: "Pakistan" },
  { code: "PH", label: "Philippines" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "SG", label: "Singapore" },
  { code: "ZA", label: "South Africa" },
  { code: "KR", label: "South Korea" },
  { code: "ES", label: "Spain" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "TW", label: "Taiwan" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "OTHER", label: "Other" },
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "Washington D.C.",
];

const ROLES = [
  { value: "employee", label: "Employee (signing with employer)" },
  { value: "freelancer", label: "Freelancer / Contractor" },
  { value: "tenant", label: "Tenant / Renter" },
  { value: "business_owner", label: "Business Owner" },
  { value: "consumer", label: "Consumer / Customer" },
  { value: "other", label: "Other" },
];

const LEVERAGE_OPTIONS = [
  { value: "strong", label: "Strong — I have good options elsewhere" },
  { value: "balanced", label: "Balanced — I can negotiate somewhat" },
  { value: "weak", label: "Weak — I need this deal" },
  { value: "no_choice", label: "No choice — Take it or leave it" },
];

export function JurisdictionSituationProfile({
  country,
  state,
  situation,
  onCountryChange,
  onStateChange,
  onSituationChange,
  disabled,
}: JurisdictionSituationProfileProps) {
  const isUS = country === "US";

  return (
    <div className="space-y-4 rounded-lg border border-border/40 bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Jurisdiction &amp; Your Situation</span>
        <span className="text-xs text-muted-foreground font-normal">(optional)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Country</Label>
          <Select value={country} onValueChange={onCountryChange} disabled={disabled}>
            <SelectTrigger className="h-9 text-sm" data-testid="select-jurisdiction-country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-xs">Common</SelectLabel>
                {PRIORITY_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code} data-testid={`country-${c.code}`}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-xs">Other Countries</SelectLabel>
                {OTHER_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {isUS && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">State</Label>
            <Select value={state} onValueChange={onStateChange} disabled={disabled}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-jurisdiction-state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">I am the…</Label>
          <Select
            value={situation.role}
            onValueChange={(v) => onSituationChange({ ...situation, role: v })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm" data-testid="select-situation-role">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value} data-testid={`role-${r.value}`}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">My negotiating position</Label>
          <Select
            value={situation.leverage}
            onValueChange={(v) => onSituationChange({ ...situation, leverage: v })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-sm" data-testid="select-situation-leverage">
              <SelectValue placeholder="Select leverage" />
            </SelectTrigger>
            <SelectContent>
              {LEVERAGE_OPTIONS.map((l) => (
                <SelectItem key={l.value} value={l.value} data-testid={`leverage-${l.value}`}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">My biggest concern (optional)</Label>
        <Input
          className="h-9 text-sm"
          placeholder='e.g. "IP ownership", "termination terms", "payment schedule"'
          value={situation.concern}
          onChange={(e) => onSituationChange({ ...situation, concern: e.target.value })}
          disabled={disabled}
          maxLength={120}
          data-testid="input-situation-concern"
        />
      </div>
    </div>
  );
}

export function formatJurisdiction(country: string, state: string): string {
  if (!country) return "";
  const countryLabel = [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES].find(c => c.code === country)?.label || country;
  if (country === "US" && state) return `United States — ${state}`;
  return countryLabel;
}
