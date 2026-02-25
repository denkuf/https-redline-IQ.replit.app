import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch, Scale, AlertTriangle, MessageSquare, FileText, ArrowRight, Shield } from "lucide-react";
import { Logo, logoImg } from "@/components/Logo";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <Logo size="lg" />
          <a href="/login" data-testid="link-login">
            <Button size="sm" className="rounded-full px-5">Sign In</Button>
          </a>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex justify-center mb-8">
                <Logo size="hero" showText={false} iconOnly />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground tracking-tight leading-[1.1]">
                Your Digital Lawyer
                <br />
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">in Your Pocket</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Stop signing contracts you don't understand. RedlineIQ analyzes any contract 
                in seconds, highlights hidden risks, and tells you exactly what to negotiate.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/register" data-testid="link-get-started">
                  <Button size="lg" className="text-base px-8 rounded-full shadow-lg shadow-primary/20 gap-2">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Everything You Need to Sign Confidently
              </h2>
              <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
                Powerful tools that make legal understanding accessible to everyone.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              <Card className="hover-elevate border-border/40 transition-all duration-200">
                <CardHeader>
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <img src={logoImg} alt="" className="h-7 w-7 object-contain" />
                  </div>
                  <CardTitle className="text-base">Red Flag Shield</CardTitle>
                  <CardDescription className="leading-relaxed">
                    Paste any clause from a contract, email, or WhatsApp and instantly detect 
                    hidden risks before you respond.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate border-border/40 transition-all duration-200">
                <CardHeader>
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <FileSearch className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-base">Deep Contract Analysis</CardTitle>
                  <CardDescription className="leading-relaxed">
                    Upload any contract and get a plain-English summary with exact clause 
                    references and risk severity ratings.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate border-border/40 transition-all duration-200">
                <CardHeader>
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Scale className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-base">Should I Sign This?</CardTitle>
                  <CardDescription className="leading-relaxed">
                    Get a clear verdict with a 0-100 risk score: Safe, Caution, High Risk, 
                    or Do Not Sign.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate border-border/40 transition-all duration-200">
                <CardHeader>
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-base">Negotiation Coach</CardTitle>
                  <CardDescription className="leading-relaxed">
                    Get strategic responses in different tones (professional, firm, friendly) 
                    to push back on unfair terms.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate border-border/40 transition-all duration-200">
                <CardHeader>
                  <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <CardTitle className="text-base">Emergency Mode</CardTitle>
                  <CardDescription className="leading-relaxed">
                    Facing a legal issue? Describe your problem and get relevant contracts, 
                    clauses, and next steps instantly.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate border-border/40 transition-all duration-200">
                <CardHeader>
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-base">Contract Monitoring</CardTitle>
                  <CardDescription className="leading-relaxed">
                    Track signed contracts, upcoming deadlines, renewals, and obligations 
                    with automatic reminders.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground tracking-tight">
              Built for Privacy
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Your contracts are yours alone. Every document you upload is encrypted and 
              isolated to your account. No one else can see your data — ever.
            </p>
            <a href="/register" data-testid="link-signup-bottom">
              <Button size="lg" className="rounded-full px-8 gap-2">
                Start Analyzing Contracts
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm leading-relaxed">
            RedlineIQ provides informational analysis only and does not constitute legal advice. 
            Consult a licensed attorney for legal matters.
          </p>
        </div>
      </footer>
    </div>
  );
}
