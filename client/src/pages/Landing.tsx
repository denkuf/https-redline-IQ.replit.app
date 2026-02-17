import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch, Scale, AlertTriangle, MessageSquare, FileText } from "lucide-react";
import { Logo, logoImg } from "@/components/Logo";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="lg" />
          </div>
          <a href="/login" data-testid="link-login">
            <Button>Sign In</Button>
          </a>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex justify-center mb-8">
                <img src={logoImg} alt="RedlineIQ" className="h-24 md:h-32 object-contain" data-testid="img-hero-logo" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
                Your Digital Lawyer in Your Pocket
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Stop signing contracts you don't understand. RedlineIQ analyzes any contract 
                in seconds, highlights hidden risks, and tells you exactly what to negotiate.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/register" data-testid="link-get-started">
                  <Button size="lg" className="text-lg px-8">
                    Get Started Free
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-card/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
              Everything You Need to Sign Contracts Confidently
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover-elevate">
                <CardHeader>
                  <img src={logoImg} alt="" className="h-10 w-10 object-contain mb-2" />
                  <CardTitle>Red Flag Shield</CardTitle>
                  <CardDescription>
                    Paste any clause from a contract, email, or WhatsApp and instantly detect 
                    hidden risks before you respond.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <FileSearch className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Deep Contract Analysis</CardTitle>
                  <CardDescription>
                    Upload any contract and get a plain-English summary with exact clause 
                    references and risk severity ratings.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <Scale className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Should I Sign This?</CardTitle>
                  <CardDescription>
                    Get a clear verdict with a 0-100 risk score: Safe, Caution, High Risk, 
                    or Do Not Sign.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <MessageSquare className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Negotiation Coach</CardTitle>
                  <CardDescription>
                    Get strategic responses in different tones (professional, firm, friendly) 
                    to push back on unfair terms.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <AlertTriangle className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Emergency Mode</CardTitle>
                  <CardDescription>
                    Facing a legal issue? Describe your problem and get relevant contracts, 
                    clauses, and next steps instantly.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <FileText className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Contract Monitoring</CardTitle>
                  <CardDescription>
                    Track signed contracts, upcoming deadlines, renewals, and obligations 
                    with automatic reminders.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              Built for Privacy
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Your contracts are yours alone. Every document you upload is encrypted and 
              isolated to your account. No one else can see your data — ever.
            </p>
            <a href="/register" data-testid="link-signup-bottom">
              <Button size="lg">Start Analyzing Contracts</Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm">
            RedlineIQ provides informational analysis only and does not constitute legal advice. 
            Consult a licensed attorney for legal matters.
          </p>
        </div>
      </footer>
    </div>
  );
}
