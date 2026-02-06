import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Home from "@/pages/Home";
import ContractAnalysis from "@/pages/ContractAnalysis";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Dashboard from "@/pages/Dashboard";
import QuickScan from "@/pages/QuickScan";
import NegotiationCoach from "@/pages/NegotiationCoach";
import SignedContracts, { SignedContractDetail } from "@/pages/SignedContracts";
import Emergency from "@/pages/Emergency";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/contract/:id" component={ContractAnalysis} />
      <Route path="/contracts/:id" component={ContractAnalysis} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/quick-scan" component={QuickScan} />
      <Route path="/negotiation-coach" component={NegotiationCoach} />
      <Route path="/signed-contracts" component={SignedContracts} />
      <Route path="/signed-contracts/:id" component={SignedContractDetail} />
      <Route path="/emergency" component={Emergency} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <>
      {/* Desktop: Sidebar layout */}
      <div className="hidden md:block h-screen">
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </div>

      {/* Mobile: Bottom tab navigation */}
      <div className="md:hidden flex flex-col h-screen">
        <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Logo size="md" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto p-4 pb-20">
          <Router />
        </main>
        <MobileNav />
      </div>
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={Landing} />
    </Switch>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <PublicRouter />;
  }

  if (user && !user.emailVerified) {
    return <VerifyEmail email={user.email || ""} />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
