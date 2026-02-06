import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Logo } from "@/components/Logo";
import { Shield, Mail, RefreshCw } from "lucide-react";

interface VerifyEmailProps {
  email: string;
  verificationCode?: string;
}

export default function VerifyEmail({ email, verificationCode: initialCode }: VerifyEmailProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [displayCode, setDisplayCode] = useState(initialCode || "");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!displayCode) {
      const lastFetch = sessionStorage.getItem("verification_code_fetched");
      const cachedCode = sessionStorage.getItem("verification_code");
      if (cachedCode && lastFetch && Date.now() - parseInt(lastFetch) < 10 * 60 * 1000) {
        setDisplayCode(cachedCode);
        return;
      }
      fetch("/api/auth/resend-code", { method: "POST", credentials: "include" })
        .then(res => res.json())
        .then(data => {
          if (data.verificationCode) {
            setDisplayCode(data.verificationCode);
            sessionStorage.setItem("verification_code", data.verificationCode);
            sessionStorage.setItem("verification_code_fetched", Date.now().toString());
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setIsVerifying(true);

    try {
      await apiRequest("POST", "/api/auth/verify-email", { code });
      sessionStorage.removeItem("verification_code");
      sessionStorage.removeItem("verification_code_fetched");
      toast({
        title: "Email Verified",
        description: "Your account is now active!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const response = await apiRequest("POST", "/api/auth/resend-code", {});
      const data = await response.json();
      if (data.verificationCode) {
        setDisplayCode(data.verificationCode);
        sessionStorage.setItem("verification_code", data.verificationCode);
        sessionStorage.setItem("verification_code_fetched", Date.now().toString());
      }
      toast({
        title: "Code Sent",
        description: "A new verification code has been generated.",
      });
      setCooldown(30);
      setCode("");
    } catch (error: any) {
      toast({
        title: "Failed to Resend",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <span className="font-medium text-foreground">{maskedEmail}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {displayCode && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Your verification code</p>
              <p className="text-2xl font-bold tracking-[0.5em] text-primary" data-testid="text-verification-code">
                {displayCode}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                No email service connected yet -- code shown here for now
              </p>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code</p>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              data-testid="input-verification-code"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || isVerifying}
            className="w-full"
            data-testid="button-verify"
          >
            {isVerifying ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verify Email
              </>
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              data-testid="button-resend-code"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isResending ? "animate-spin" : ""}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Powered by <Logo size="sm" />
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
