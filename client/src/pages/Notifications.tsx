import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ListChecks,
  Zap,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@shared/schema";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "deadline_reminder":
      return <Clock className="h-5 w-5 text-secondary-foreground" />;
    case "obligation_alert":
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case "contract_update":
      return <CheckCircle2 className="h-5 w-5 text-primary" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
}

function getNotificationColor(
  type: string
): "default" | "destructive" | "secondary" {
  switch (type) {
    case "deadline_reminder":
      return "secondary";
    case "obligation_alert":
      return "destructive";
    case "contract_update":
      return "default";
    default:
      return "default";
  }
}

function getNotificationLabel(type: string): string {
  switch (type) {
    case "deadline_reminder":
      return "Deadline";
    case "obligation_alert":
      return "Alert";
    case "contract_update":
      return "Update";
    default:
      return "Notification";
  }
}

function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return then.toLocaleDateString();
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive",
      });
    },
  });

  const generateRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/notifications/generate-reminders"
      );
      return await response.json();
    },
    onSuccess: (data: { created: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: `Generated ${data.created} deadline reminder${data.created !== 1 ? "s" : ""}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate reminders",
        variant: "destructive",
      });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <Bell className="h-8 w-8 text-primary" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs" data-testid="badge-unread-count">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">Notifications</h1>
          </div>
          <p className="text-muted-foreground">
            {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateRemindersMutation.mutate()}
            disabled={generateRemindersMutation.isPending}
            data-testid="button-generate-reminders"
          >
            <Zap className="h-4 w-4 mr-2" />
            Generate Reminders
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            data-testid="button-mark-all-read"
          >
            <ListChecks className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" data-testid={`skeleton-notification-${i}`} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card data-testid="card-empty-state">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              You'll see contract deadlines, obligation reminders, and other alerts here
            </p>
            <Button
              onClick={() => generateRemindersMutation.mutate()}
              disabled={generateRemindersMutation.isPending}
              data-testid="button-generate-first-reminders"
            >
              <Zap className="h-4 w-4 mr-2" />
              Generate Reminders
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors ${
                !notification.isRead
                  ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                  : "hover:bg-muted/50"
              }`}
              onClick={() =>
                !notification.isRead &&
                markReadMutation.mutate(notification.id)
              }
              data-testid={`card-notification-${notification.id}`}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    notification.type === "obligation_alert"
                      ? "bg-destructive/10"
                      : notification.type === "deadline_reminder"
                      ? "bg-secondary/10"
                      : "bg-primary/10"
                  }`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm" data-testid={`text-notification-title-${notification.id}`}>
                      {notification.title}
                    </h3>
                    {!notification.isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" data-testid={`indicator-unread-${notification.id}`} />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2" data-testid={`text-notification-message-${notification.id}`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground" data-testid={`text-time-ago-${notification.id}`}>
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                    <Badge
                      variant={getNotificationColor(notification.type)}
                      className="text-xs flex-shrink-0 no-default-hover-elevate"
                      data-testid={`badge-type-${notification.id}`}
                    >
                      {getNotificationLabel(notification.type)}
                    </Badge>
                  </div>
                </div>

                {!notification.isRead && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(notification.id);
                    }}
                    disabled={markReadMutation.isPending}
                    data-testid={`button-mark-read-${notification.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
