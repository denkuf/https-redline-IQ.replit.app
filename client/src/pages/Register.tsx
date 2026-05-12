import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";
import { Eye, EyeOff, UserPlus } from "lucide-react";

export default function Register() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Password Mismatch", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password Too Short", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register", { firstName, lastName, email, password });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message || "Failed to create account", variant: "destructive" });
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
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="link-back-home"
        >
          Back
        </Link>
      </div>

      {/* Main content — scrollable for short screens */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-6 max-w-sm mx-auto w-full">
        {/* Logo + heading */}
        <div className="flex flex-col items-center text-center mb-8">
          <Logo size="lg" showText={false} iconOnly className="mb-5" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1.5">
            Create your account
          </h1>
          <p className="text-muted-foreground text-sm">
            Join <span className="font-semibold text-foreground">Redline<span className="text-destructive">IQ</span></span> and start analyzing contracts
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-background/60 border-border/60 text-base"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-background/60 border-border/60 text-base"
                  data-testid="input-last-name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
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

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-background/60 border-border/60 text-base pr-11"
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-13 text-base rounded-xl shadow-lg shadow-primary/20 gap-2 font-semibold mt-1"
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? (
                "Creating Account..."
              ) : (
                <><UserPlus className="h-4 w-4" /> Create Account</>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline" data-testid="link-login">
              Sign in
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
