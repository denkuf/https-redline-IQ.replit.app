import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ClipboardList, 
  DollarSign, 
  Calendar, 
  XCircle, 
  RefreshCw, 
  Scale, 
  Handshake, 
  ScrollText, 
  Lock,
  FileText 
} from "lucide-react";
import type { KeyTerm } from "@shared/schema";
import type { LucideIcon } from "lucide-react";

interface KeyTermsTableProps {
  keyTerms: KeyTerm[];
}

const categoryIcons: Record<string, LucideIcon> = {
  "Payment/Price": DollarSign,
  "Term Length": Calendar,
  "Cancellation/Termination": XCircle,
  "Renewal": RefreshCw,
  "Liability/Indemnity": Scale,
  "Dispute Resolution": Handshake,
  "Governing Law": ScrollText,
  "Confidentiality/IP": Lock,
};

export function KeyTermsTable({ keyTerms }: KeyTermsTableProps) {
  if (!keyTerms.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Key Terms
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Category</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[250px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keyTerms.map((term, i) => (
                <TableRow key={i} data-testid={`row-key-term-${i}`}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {(() => {
                        const Icon = categoryIcons[term.category] || FileText;
                        return <Icon className="h-4 w-4 text-muted-foreground" />;
                      })()}
                      {term.category}
                    </span>
                  </TableCell>
                  <TableCell>{term.value}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {term.notes || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="md:hidden space-y-3">
          {keyTerms.map((term, i) => {
            const Icon = categoryIcons[term.category] || FileText;
            return (
              <div
                key={i}
                className="p-3 rounded-md bg-muted/30 border"
                data-testid={`row-key-term-mobile-${i}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{term.category}</span>
                </div>
                <p className="text-sm" style={{ overflowWrap: "break-word" }}>{term.value}</p>
                {term.notes && (
                  <p className="text-xs text-muted-foreground mt-1" style={{ overflowWrap: "break-word" }}>{term.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
