import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  CreditCard,
  Shield,
  GraduationCap,
  Users,
  Home,
  Wrench,
  Briefcase,
  FileText,
  AlertTriangle,
  Clock,
  Trash2,
  Pencil,
  RefreshCw,
  Loader2,
  Bell,
  CalendarClock,
  CircleDot,
  Pause,
  XCircle,
} from "lucide-react";
import type { RecurringObligation } from "@shared/schema";

const CATEGORIES = [
  { value: "subscription", label: "Subscription", icon: CreditCard },
  { value: "insurance", label: "Insurance", icon: Shield },
  { value: "school_fees", label: "School Fees", icon: GraduationCap },
  { value: "membership", label: "Membership", icon: Users },
  { value: "lease", label: "Lease", icon: Home },
  { value: "service_contract", label: "Service Contract", icon: Wrench },
  { value: "business", label: "Business", icon: Briefcase },
  { value: "other", label: "Other", icon: FileText },
] as const;

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

function getCategoryIcon(category: string) {
  const found = CATEGORIES.find((c) => c.value === category);
  return found ? found.icon : FileText;
}

function getCategoryLabel(category: string) {
  const found = CATEGORIES.find((c) => c.value === category);
  return found ? found.label : category;
}

function getDaysUntilDue(dateStr: string | Date | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyClass(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days <= 0) return "text-destructive font-semibold";
  if (days <= 3) return "text-destructive";
  if (days <= 14) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

function getStatusIcon(status: string | null) {
  switch (status) {
    case "active":
      return <CircleDot className="h-3 w-3 text-green-500" />;
    case "paused":
      return <Pause className="h-3 w-3 text-yellow-500" />;
    case "cancelled":
      return <XCircle className="h-3 w-3 text-muted-foreground" />;
    default:
      return <CircleDot className="h-3 w-3 text-green-500" />;
  }
}

interface AlertItem {
  id: number;
  title: string;
  alertReason: string;
  itemType: string;
  category?: string;
  provider?: string;
}

interface GuardianAlerts {
  urgent: AlertItem[];
  dueSoon: AlertItem[];
  safe: AlertItem[];
}

interface ObligationFormData {
  title: string;
  category: string;
  amount: string;
  frequency: string;
  nextDueDate: string;
  provider: string;
  autoRenew: boolean;
  cancellationNoticeDays: string;
  notes: string;
  status: string;
}

const defaultFormData: ObligationFormData = {
  title: "",
  category: "",
  amount: "",
  frequency: "",
  nextDueDate: "",
  provider: "",
  autoRenew: false,
  cancellationNoticeDays: "",
  notes: "",
  status: "active",
};

function ObligationForm({
  initialData,
  onSubmit,
  isPending,
  onClose,
  isEdit,
}: {
  initialData: ObligationFormData;
  onSubmit: (data: ObligationFormData) => void;
  isPending: boolean;
  onClose: () => void;
  isEdit: boolean;
}) {
  const [form, setForm] = useState<ObligationFormData>(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category || !form.frequency) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="obligation-title">Title *</Label>
        <Input
          id="obligation-title"
          data-testid="input-obligation-title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Netflix, Car Insurance, Gym"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={form.category}
            onValueChange={(val) => setForm({ ...form, category: val })}
          >
            <SelectTrigger data-testid="select-obligation-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Frequency *</Label>
          <Select
            value={form.frequency}
            onValueChange={(val) => setForm({ ...form, frequency: val })}
          >
            <SelectTrigger data-testid="select-obligation-frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((freq) => (
                <SelectItem key={freq.value} value={freq.value} data-testid={`option-frequency-${freq.value}`}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="obligation-amount">Amount</Label>
          <Input
            id="obligation-amount"
            data-testid="input-obligation-amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="e.g. $49.99"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obligation-due-date">Next Due Date</Label>
          <Input
            id="obligation-due-date"
            data-testid="input-obligation-due-date"
            type="date"
            value={form.nextDueDate}
            onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="obligation-provider">Provider / Company</Label>
        <Input
          id="obligation-provider"
          data-testid="input-obligation-provider"
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
          placeholder="e.g. Netflix Inc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <Switch
            id="obligation-auto-renew"
            data-testid="switch-obligation-auto-renew"
            checked={form.autoRenew}
            onCheckedChange={(checked) =>
              setForm({ ...form, autoRenew: checked })
            }
          />
          <Label htmlFor="obligation-auto-renew">Auto-renew</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="obligation-cancel-days">Cancel Notice (days)</Label>
          <Input
            id="obligation-cancel-days"
            data-testid="input-obligation-cancel-days"
            type="number"
            min="0"
            value={form.cancellationNoticeDays}
            onChange={(e) =>
              setForm({ ...form, cancellationNoticeDays: e.target.value })
            }
            placeholder="e.g. 30"
          />
        </div>
      </div>

      {isEdit && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(val) => setForm({ ...form, status: val })}
          >
            <SelectTrigger data-testid="select-obligation-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="obligation-notes">Notes</Label>
        <Textarea
          id="obligation-notes"
          data-testid="input-obligation-notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any additional notes..."
          className="resize-none"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          data-testid="button-cancel-obligation"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !form.title.trim() || !form.category || !form.frequency}
          data-testid="button-save-obligation"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Update" : "Add Obligation"}
        </Button>
      </div>
    </form>
  );
}

export default function RecurringObligations() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObligation, setEditingObligation] = useState<RecurringObligation | null>(null);

  const { data: obligations = [], isLoading } = useQuery<RecurringObligation[]>({
    queryKey: ["/api/recurring-obligations"],
  });

  const { data: alerts } = useQuery<GuardianAlerts>({
    queryKey: ["/api/guardian-alerts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ObligationFormData) => {
      const body: any = {
        title: data.title,
        category: data.category,
        frequency: data.frequency,
        autoRenew: data.autoRenew,
      };
      if (data.amount) body.amount = data.amount;
      if (data.nextDueDate) body.nextDueDate = new Date(data.nextDueDate).toISOString();
      if (data.provider) body.provider = data.provider;
      if (data.cancellationNoticeDays) body.cancellationNoticeDays = parseInt(data.cancellationNoticeDays);
      if (data.notes) body.notes = data.notes;
      await apiRequest("POST", "/api/recurring-obligations", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-obligations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guardian-alerts"] });
      setDialogOpen(false);
      toast({ title: "Obligation added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add obligation", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ObligationFormData }) => {
      const body: any = {
        title: data.title,
        category: data.category,
        frequency: data.frequency,
        autoRenew: data.autoRenew,
        status: data.status,
      };
      if (data.amount) body.amount = data.amount;
      else body.amount = null;
      if (data.nextDueDate) body.nextDueDate = new Date(data.nextDueDate).toISOString();
      else body.nextDueDate = null;
      if (data.provider) body.provider = data.provider;
      else body.provider = null;
      if (data.cancellationNoticeDays) body.cancellationNoticeDays = parseInt(data.cancellationNoticeDays);
      else body.cancellationNoticeDays = null;
      if (data.notes) body.notes = data.notes;
      else body.notes = null;
      await apiRequest("PATCH", `/api/recurring-obligations/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-obligations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guardian-alerts"] });
      setEditingObligation(null);
      setDialogOpen(false);
      toast({ title: "Obligation updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update obligation", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/recurring-obligations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-obligations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guardian-alerts"] });
      toast({ title: "Obligation deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete obligation", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditingObligation(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (obl: RecurringObligation) => {
    setEditingObligation(obl);
    setDialogOpen(true);
  };

  const handleFormSubmit = (data: ObligationFormData) => {
    if (editingObligation) {
      updateMutation.mutate({ id: editingObligation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const editFormData: ObligationFormData = editingObligation
    ? {
        title: editingObligation.title,
        category: editingObligation.category,
        amount: editingObligation.amount || "",
        frequency: editingObligation.frequency,
        nextDueDate: editingObligation.nextDueDate
          ? new Date(editingObligation.nextDueDate).toISOString().split("T")[0]
          : "",
        provider: editingObligation.provider || "",
        autoRenew: editingObligation.autoRenew || false,
        cancellationNoticeDays: editingObligation.cancellationNoticeDays?.toString() || "",
        notes: editingObligation.notes || "",
        status: editingObligation.status || "active",
      }
    : defaultFormData;

  const urgentAlerts = alerts?.urgent || [];
  const dueSoonAlerts = alerts?.dueSoon || [];

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4" data-testid="page-recurring-obligations">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Recurring Obligations</h1>
            <p className="text-sm text-muted-foreground">
              Track subscriptions, fees, insurance & more
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingObligation(null);
        }}>
          <DialogTrigger asChild>
            <Button size="icon" onClick={handleOpenCreate} data-testid="button-add-obligation">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingObligation ? "Edit Obligation" : "Add New Obligation"}
              </DialogTitle>
            </DialogHeader>
            <ObligationForm
              key={editingObligation?.id ?? "new"}
              initialData={editFormData}
              onSubmit={handleFormSubmit}
              isPending={createMutation.isPending || updateMutation.isPending}
              onClose={() => {
                setDialogOpen(false);
                setEditingObligation(null);
              }}
              isEdit={!!editingObligation}
            />
          </DialogContent>
        </Dialog>
      </div>

      {(urgentAlerts.length > 0 || dueSoonAlerts.length > 0) && (
        <div className="space-y-3 mb-6" data-testid="section-guardian-alerts">
          {urgentAlerts.length > 0 && (
            <Card className="border-destructive/50" data-testid="alert-urgent-section">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">
                    Urgent ({urgentAlerts.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {urgentAlerts.map((alert, i) => (
                    <div
                      key={`urgent-${alert.id}-${alert.itemType}-${i}`}
                      className="flex items-center justify-between gap-2 text-sm"
                      data-testid={`alert-urgent-${alert.id}`}
                    >
                      <span className="font-medium">{alert.title}</span>
                      <Badge variant="destructive" className="text-xs">
                        {alert.alertReason}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {dueSoonAlerts.length > 0 && (
            <Card className="border-yellow-500/50" data-testid="alert-due-soon-section">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    Due Soon ({dueSoonAlerts.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {dueSoonAlerts.map((alert, i) => (
                    <div
                      key={`soon-${alert.id}-${alert.itemType}-${i}`}
                      className="flex items-center justify-between gap-2 text-sm"
                      data-testid={`alert-due-soon-${alert.id}`}
                    >
                      <span className="font-medium">{alert.title}</span>
                      <Badge variant="outline" className="text-xs text-yellow-600 dark:text-yellow-400 border-yellow-500/50">
                        {alert.alertReason}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {obligations.length === 0 ? (
        <Card data-testid="empty-state">
          <CardContent className="py-16 text-center">
            <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Obligations Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start tracking your recurring payments, subscriptions, and commitments.
            </p>
            <Button onClick={handleOpenCreate} data-testid="button-add-first-obligation">
              <Plus className="h-4 w-4" />
              Add Your First Obligation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="obligations-list">
          {obligations.map((obl) => {
            const CategoryIcon = getCategoryIcon(obl.category);
            const daysUntil = getDaysUntilDue(obl.nextDueDate);
            const urgencyClass = getUrgencyClass(daysUntil);

            return (
              <Card key={obl.id} data-testid={`obligation-card-${obl.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate" data-testid={`text-obligation-title-${obl.id}`}>
                            {obl.title}
                          </span>
                          {getStatusIcon(obl.status)}
                          {obl.autoRenew && (
                            <RefreshCw
                              className="h-3 w-3 text-yellow-600 dark:text-yellow-400"
                              data-testid={`icon-auto-renew-${obl.id}`}
                            />
                          )}
                        </div>
                        {obl.provider && (
                          <p className="text-xs text-muted-foreground truncate" data-testid={`text-obligation-provider-${obl.id}`}>
                            {obl.provider}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${obl.id}`}>
                            {getCategoryLabel(obl.category)}
                          </Badge>
                          {obl.amount && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-amount-${obl.id}`}>
                              {obl.amount} / {obl.frequency}
                            </Badge>
                          )}
                          {!obl.amount && (
                            <Badge variant="outline" className="text-xs">
                              {obl.frequency}
                            </Badge>
                          )}
                          {obl.status && obl.status !== "active" && (
                            <Badge
                              variant={obl.status === "cancelled" ? "destructive" : "outline"}
                              className="text-xs"
                              data-testid={`badge-status-${obl.id}`}
                            >
                              {obl.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {obl.nextDueDate && (
                        <div className={`text-xs flex items-center gap-1 ${urgencyClass}`} data-testid={`text-due-date-${obl.id}`}>
                          <Bell className="h-3 w-3" />
                          {daysUntil !== null && daysUntil <= 0
                            ? "Overdue"
                            : new Date(obl.nextDueDate).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex items-center gap-1" style={{ visibility: "visible" }}>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenEdit(obl)}
                          data-testid={`button-edit-obligation-${obl.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(obl.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-obligation-${obl.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
