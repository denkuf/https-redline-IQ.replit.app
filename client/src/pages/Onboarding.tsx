import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  FileX,
  ShieldAlert,
  ScanSearch,
  CalendarCheck,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

const ONBOARDING_KEY = "redlineiq_onboarded";

const slides = [
  {
    icon: FileX,
    iconBg: "bg-red-500/15 dark:bg-red-500/20",
    iconColor: "text-red-500",
    accentColor: "from-red-500/15 via-red-500/5",
    tag: "The Problem",
    tagClass: "text-red-600 dark:text-red-400 bg-red-500/10",
    title: "Contracts Are Written Against You",
    body: "Legal language is deliberately complex and one-sided. Most people sign agreements they don't fully understand — and pay the price months later.",
  },
  {
    icon: ShieldAlert,
    iconBg: "bg-amber-500/15 dark:bg-amber-500/20",
    iconColor: "text-amber-500",
    accentColor: "from-amber-500/15 via-amber-500/5",
    tag: "The Risk",
    tagClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    title: "Hidden Traps Can Cost You Everything",
    body: "Auto-renewals that lock you in. Unlimited liability in the fine print. One-sided exit terms. These traps are standard — and most people never see them.",
  },
  {
    icon: ScanSearch,
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    accentColor: "from-primary/15 via-primary/5",
    tag: "The Solution",
    tagClass: "text-primary bg-primary/10",
    title: "Know Exactly What You're Signing",
    body: "Upload any contract — PDF, Word, photo, or paste text. Get a risk score, plain-English breakdown, missing protections, and what to push back on. In seconds.",
  },
  {
    icon: CalendarCheck,
    iconBg: "bg-green-500/15 dark:bg-green-500/20",
    iconColor: "text-green-600 dark:text-green-400",
    accentColor: "from-green-500/15 via-green-500/5",
    tag: "Stay Protected",
    tagClass: "text-green-700 dark:text-green-400 bg-green-500/10",
    title: "Never Miss a Deadline Again",
    body: "Track renewals, cancellation windows, and payment obligations across all your contracts. Get reminded before they cost you money.",
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [, navigate] = useLocation();
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);

  const isLast = current === slides.length - 1;

  const goTo = (index: number) => {
    if (index === current) return;
    setAnimDir(index > current ? "left" : "right");
    setTimeout(() => {
      setCurrent(index);
      setAnimDir(null);
    }, 150);
  };

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/register");
  };

  const skip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    navigate("/");
  };

  const next = () => {
    if (isLast) finish();
    else goTo(current + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 48) {
      if (diff > 0 && current < slides.length - 1) goTo(current + 1);
      if (diff < 0 && current > 0) goTo(current - 1);
    }
    setTouchStartX(null);
  };

  const slide = slides[current];
  const SlideIcon = slide.icon;

  return (
    <div
      className="min-h-screen flex flex-col bg-background select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="screen-onboarding"
    >
      {/* Full-page gradient accent that transitions with slide */}
      <div
        className={`fixed inset-0 bg-gradient-to-b ${slide.accentColor} to-transparent pointer-events-none transition-all duration-700`}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-14 pb-2">
        <Logo size="sm" />
        <button
          onClick={skip}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          data-testid="button-skip-onboarding"
        >
          Skip
        </button>
      </header>

      {/* Slide content */}
      <div
        className={`relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-4 text-center transition-all duration-150 ${
          animDir === "left" ? "-translate-x-4 opacity-0" :
          animDir === "right" ? "translate-x-4 opacity-0" :
          "translate-x-0 opacity-100"
        }`}
      >
        {/* Icon circle */}
        <div
          className={`w-32 h-32 rounded-[2rem] ${slide.iconBg} flex items-center justify-center mb-8 transition-all duration-500 shadow-lg`}
        >
          <SlideIcon className={`h-16 w-16 ${slide.iconColor} transition-all duration-500`} strokeWidth={1.5} />
        </div>

        {/* Tag pill */}
        <span
          className={`inline-block text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-5 ${slide.tagClass}`}
        >
          {slide.tag}
        </span>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-snug mb-4 max-w-xs">
          {slide.title}
        </h1>

        {/* Body */}
        <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
          {slide.body}
        </p>
      </div>

      {/* Footer */}
      <div className="relative z-10 px-8 pb-14 space-y-5">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-7 h-2.5 bg-primary"
                  : "w-2.5 h-2.5 bg-muted-foreground/25"
              }`}
              data-testid={`dot-onboarding-${i}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Primary CTA */}
        <Button
          size="lg"
          className="w-full h-14 text-base rounded-2xl shadow-lg shadow-primary/25 gap-2 font-semibold"
          onClick={next}
          data-testid="button-onboarding-next"
        >
          {isLast ? (
            <>Get Started Free <ArrowRight className="h-5 w-5" /></>
          ) : (
            <>Next <ChevronRight className="h-5 w-5" /></>
          )}
        </Button>

        {/* Sign in link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-primary font-semibold hover:underline"
            data-testid="link-signin-onboarding"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
