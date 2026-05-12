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
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/NotificationBell";
import { Loader2 } from "lucide-react";
import Onboarding from "@/pages/Onboarding";
import Home from "@/pages/Home";
import ContractAnalysis from "@/pages/ContractAnalysis";
import ContractCompare from "@/pages/ContractCompare";
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
import RecurringObligations from "@/pages/RecurringObligations";
import AdvocateChat from "@/pages/AdvocateChat";
import Notifications from "@/pages/Notifications";
import TemplateLibrary from "@/pages/TemplateLibrary";
import WeeklyDigest from "@/pages/WeeklyDigest";
import SharedSummaryView from "@/pages/SharedSummaryView";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/shared/:token" component={SharedSummaryView} />
      <Route path="/" component={Home} />
      <Route path="/contract/:id" component={ContractAnalysis} />
      <Route path="/contracts/:id" component={ContractAnalysis} />
      <Route path="/compare/:id" component={ContractCompare} />
      <Route path="/compare" component={ContractCompare} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/quick-scan" component={QuickScan} />
      <Route path="/negotiation-coach" component={NegotiationCoach} />
      <Route path="/signed-contracts" component={SignedContracts} />
      <Route path="/signed-contracts/:id" component={SignedContractDetail} />
      <Route path="/recurring-obligations" component={RecurringObligations} />
      <Route path="/advocate" component={AdvocateChat} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/templates" component={TemplateLibrary} />
      <Route path="/weekly-digest" component={WeeklyDigest} />
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
              <header className="flex items-center justify-between gap-4 px-5 py-3 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-1">
                  <NotificationBell />
                  <ThemeToggle />
                </div>
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
        <header className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <Logo size="md" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 pb-32">
          <Router />
        </main>
        <MobileNav />
      </div>

      <OnboardingTutorial />
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

function LandingOrOnboarding() {
  const hasOnboarded = !!localStorage.getItem("redlineiq_onboarded");
  if (!hasOnboarded) return <Onboarding />;
  return <Landing />;
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/shared/:token" component={SharedSummaryView} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={LandingOrOnboarding} />
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
