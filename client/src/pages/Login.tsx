import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function Login() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", { email, password });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/12 via-primary/4 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      {/* Back link */}
      <div className="relative z-10 px-6 pt-14">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          data-testid="link-back-home"
        >
          Back
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-8 max-w-sm mx-auto w-full">
        {/* Logo + heading */}
        <div className="flex flex-col items-center text-center mb-10">
          <Logo size="xl" className="mb-6" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1.5">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to continue
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-background/60 border-border/60 text-base"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-background/60 border-border/60 text-base pr-11"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-13 text-base rounded-xl shadow-lg shadow-primary/20 gap-2 font-semibold mt-2"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <><LogIn className="h-4 w-4" /> Sign In</>
              )}
            </Button>
          </form>
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline" data-testid="link-register">
              Create one free
            </Link>
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="relative z-10 text-center text-xs text-muted-foreground/60 px-8 pb-8 leading-relaxed">
        RedlineIQ provides informational analysis only, not legal advice.
      </p>
    </div>
  );
}
