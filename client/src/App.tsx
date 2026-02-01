import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Home from "@/pages/Home";
import ContractAnalysis from "@/pages/ContractAnalysis";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Dashboard from "@/pages/Dashboard";
import QuickScan from "@/pages/QuickScan";
import NegotiationCoach from "@/pages/NegotiationCoach";
import SignedContracts, { SignedContractDetail } from "@/pages/SignedContracts";
import Emergency from "@/pages/Emergency";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/contract/:id" component={ContractAnalysis} />
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

function AppLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
