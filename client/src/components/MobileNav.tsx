import { Link, useLocation } from "wouter";
import { FileUp, LayoutDashboard, Camera, History, Settings, MoreHorizontal, MessageSquare, FileCheck, AlertOctagon, LogOut, Bot, CalendarClock, Bell, BookOpen, GitCompare, BarChart3, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

const primaryTabs = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Scan", url: "/quick-scan", icon: Camera },
  { title: "Chat", url: "/advocate", icon: Bot },
  { title: "History", url: "/history", icon: History },
];

const moreItems = [
  { title: "Upload Contract", url: "/", icon: FileUp },
  { title: "Obligations", url: "/recurring-obligations", icon: CalendarClock },
  { title: "Signed Contracts", url: "/signed-contracts", icon: FileCheck },
  { title: "Templates", url: "/templates", icon: BookOpen },
  { title: "Compare", url: "/compare", icon: GitCompare },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Weekly Digest", url: "/weekly-digest", icon: BarChart3 },
  { title: "Negotiation Coach", url: "/negotiation-coach", icon: MessageSquare },
  { title: "Emergency Mode", url: "/emergency", icon: AlertOctagon },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function MobileNav() {
  const [location] = useLocation();
  const { logout, isLoggingOut } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") return location === "/" || location === "";
    return location.startsWith(url);
  };

  const isMoreActive = moreItems.some(item => isActive(item.url));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="bg-muted/60 backdrop-blur-sm border-t border-border/50 px-4 py-1.5">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Scale className="h-3 w-3 shrink-0" />
          <span>Informational only, not legal advice.</span>
        </div>
      </div>
      <div className="bg-background/95 backdrop-blur-md border-t flex items-center justify-around h-16">
        {primaryTabs.map((item) => (
          <Link key={item.url} href={item.url}>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] transition-all duration-200",
                isActive(item.url)
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
              data-testid={`mobile-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className={cn("h-5 w-5 transition-transform", isActive(item.url) && "scale-110")} />
              <span className={cn("text-[10px] font-medium", isActive(item.url) && "font-semibold")}>{item.title}</span>
              {isActive(item.url) && (
                <div className="h-0.5 w-4 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          </Link>
        ))}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] transition-all duration-200",
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
              data-testid="mobile-nav-more"
            >
              <MoreHorizontal className={cn("h-5 w-5 transition-transform", isMoreActive && "scale-110")} />
              <span className={cn("text-[10px] font-medium", isMoreActive && "font-semibold")}>More</span>
              {isMoreActive && (
                <div className="h-0.5 w-4 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52 mb-2 rounded-xl shadow-lg border-border/50 backdrop-blur-xl">
            {moreItems.map((item) => (
              <DropdownMenuItem key={item.url} asChild className="rounded-lg">
                <Link href={item.url}>
                  <div 
                    className={cn(
                      "flex items-center gap-3 w-full cursor-pointer py-0.5",
                      isActive(item.url) && "text-primary font-medium"
                    )}
                    data-testid={`mobile-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              disabled={isLoggingOut}
              data-testid="mobile-nav-sign-out"
              className="rounded-lg"
            >
              <div className="flex items-center gap-3 w-full cursor-pointer text-destructive py-0.5">
                <LogOut className="h-4 w-4" />
                <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
