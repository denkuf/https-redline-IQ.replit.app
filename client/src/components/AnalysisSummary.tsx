import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import type { Summary } from "@shared/schema";

interface AnalysisSummaryProps {
  summary: Summary;
}

export function AnalysisSummary({ summary }: AnalysisSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Plain-English Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            What This Contract Is
          </h4>
          <p className="text-muted-foreground" data-testid="text-what-it-is">
            {summary.whatItIs}
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Parties Involved
          </h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            {summary.partiesInvolved.map((party, i) => (
              <li key={i} data-testid={`text-party-${i}`}>{party}</li>
            ))}
          </ul>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Your Obligations
            </h4>
            <ul className="space-y-2">
              {summary.userObligations.map((obligation, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                  data-testid={`text-user-obligation-${i}`}
                >
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  {obligation}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Other Party's Obligations
            </h4>
            <ul className="space-y-2">
              {summary.otherPartyObligations.map((obligation, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                  data-testid={`text-other-obligation-${i}`}
                >
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  {obligation}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {summary.datesAndTerms && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Key Dates & Terms
            </h4>
            <p className="text-muted-foreground" data-testid="text-dates-terms">
              {summary.datesAndTerms}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
