import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationData {
  notifications: Array<{ id: number; title: string; isRead: boolean }>;
  unreadCount: number;
}

export function NotificationBell() {
  const { data } = useQuery<NotificationData>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const unreadCount = data?.unreadCount || 0;

  return (
    <Link href="/notifications">
      <Button variant="ghost" size="icon" className="relative" data-testid="button-notification-bell">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1"
            data-testid="badge-notification-count"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
