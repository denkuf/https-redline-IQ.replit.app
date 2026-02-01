import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { FileUp, FileText, History, Settings, LayoutDashboard, Zap, MessageSquare, FileCheck, AlertOctagon, LogOut, User } from "lucide-react";
import { Disclaimer } from "./Disclaimer";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoImage from "@/assets/logo.png";

const analyzeItems = [
  { title: "Upload Contract", url: "/", icon: FileUp },
  { title: "Red Flag Shield", url: "/quick-scan", icon: Zap },
  { title: "My Contracts", url: "/history", icon: History },
];

const monitorItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Signed Contracts", url: "/signed-contracts", icon: FileCheck },
];

const helpItems = [
  { title: "Negotiation Coach", url: "/negotiation-coach", icon: MessageSquare },
  { title: "Emergency Mode", url: "/emergency", icon: AlertOctagon },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-6">
        <Link href="/" className="flex items-center justify-center" data-testid="nav-home-logo">
          <img src={logoImage} alt="Redline IQ" className="h-16 w-full object-contain" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Analyze</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyzeItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url === "/" && location === "") ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Monitor</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {monitorItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Get Help</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {helpItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-4">
        <UserProfile />
        <Disclaimer />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserProfile() {
  const { user, logout, isLoggingOut } = useAuth();
  
  if (!user) return null;

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";
  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="border-t pt-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" data-testid="text-user-name">
            {displayName}
          </p>
          {user.email && (
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user.email}
            </p>
          )}
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full" 
        onClick={() => logout()}
        disabled={isLoggingOut}
        data-testid="button-logout"
      >
        <LogOut className="h-4 w-4 mr-2" />
        {isLoggingOut ? "Signing out..." : "Sign Out"}
      </Button>
    </div>
  );
}
