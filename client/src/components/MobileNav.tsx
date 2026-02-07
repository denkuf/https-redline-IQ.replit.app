import { Link, useLocation } from "wouter";
import { FileUp, LayoutDashboard, Zap, History, Settings, MoreHorizontal, MessageSquare, FileCheck, AlertOctagon, LogOut } from "lucide-react";
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
  { title: "Upload", url: "/", icon: FileUp },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Quick Scan", url: "/quick-scan", icon: Zap },
  { title: "History", url: "/history", icon: History },
];

const moreItems = [
  { title: "Signed Contracts", url: "/signed-contracts", icon: FileCheck },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {primaryTabs.map((item) => (
          <Link key={item.url} href={item.url}>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors",
                isActive(item.url)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`mobile-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.title}</span>
            </button>
          </Link>
        ))}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors",
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="mobile-nav-more"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
            {moreItems.map((item) => (
              <DropdownMenuItem key={item.url} asChild>
                <Link href={item.url}>
                  <div 
                    className={cn(
                      "flex items-center gap-3 w-full cursor-pointer",
                      isActive(item.url) && "text-primary"
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
            >
              <div className="flex items-center gap-3 w-full cursor-pointer text-destructive">
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
