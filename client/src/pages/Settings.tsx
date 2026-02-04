import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings as SettingsIcon, Shield, Trash2, Bell, AlertTriangle, UserX } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Disclaimer } from "@/components/Disclaimer";
import { useAuth } from "@/hooks/use-auth";

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [autoDeleteDays, setAutoDeleteDays] = useState("30");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const purgeAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/contracts/purge-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "All data deleted",
        description: "All your contracts have been permanently removed.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Unable to delete data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/auth/account");
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently removed.",
      });
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Unable to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your privacy and notification preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Control how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about your contract analyses
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
                data-testid="switch-notifications"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Controls
            </CardTitle>
            <CardDescription>
              Manage your data and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="auto-delete">Auto-delete contracts after</Label>
              <Select value={autoDeleteDays} onValueChange={setAutoDeleteDays}>
                <SelectTrigger className="w-[200px]" data-testid="select-auto-delete">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Automatically remove old contracts for your privacy
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <Label className="text-destructive flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete All Data
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently remove all your contracts and analysis history
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" data-testid="button-delete-all">
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Delete All Data?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your contracts and analysis history.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => purgeAllMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Delete Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <UserX className="h-5 w-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-sm text-muted-foreground">
                  This will permanently delete your account ({user?.email}), all your contracts, 
                  analysis history, and any other data associated with your account. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" data-testid="button-delete-account">
                    <UserX className="h-4 w-4 mr-2" />
                    Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Delete Your Account?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all associated data including 
                      contracts, analysis history, and settings. You will be logged out immediately.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAccountMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-delete-account"
                    >
                      Yes, Delete My Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Legal Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground">
                Redline IQ provides informational analysis of contracts using artificial intelligence.
                This service is not a substitute for professional legal advice.
              </p>
              <ul className="text-muted-foreground space-y-2 mt-4">
                <li>Our analysis is for informational purposes only</li>
                <li>We do not provide legal advice or representation</li>
                <li>Important decisions should be reviewed by a qualified attorney</li>
                <li>AI analysis may contain errors or miss context-specific issues</li>
                <li>We are not liable for decisions made based on our analysis</li>
              </ul>
            </div>
            <Disclaimer className="mt-6" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
