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
      </CardContent>
    </Card>
  );
}
