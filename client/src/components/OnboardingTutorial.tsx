import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Upload,
  Clock,
  LifeBuoy,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ONBOARDING_KEY = "redlineiq_onboarding_complete";

interface Step {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  {
    title: "Welcome to RedlineIQ",
    description:
      "Your digital lawyer in your pocket. Upload contracts, get instant analysis.",
    icon: BookOpen,
  },
  {
    title: "Upload & Analyze",
    description:
      "Upload any contract (PDF, DOCX, or paste text). Get a risk score, plain-English summary, and negotiation tips.",
    icon: Upload,
  },
  {
    title: "Track & Monitor",
    description:
      "Sign contracts, track deadlines, manage obligations. Never miss a renewal.",
    icon: Clock,
  },
  {
    title: "Get Help Anytime",
    description:
      "Use Advocate Chat for guidance, Negotiation Coach for scripts, and Emergency Mode for urgent issues.",
    icon: LifeBuoy,
  },
  {
    title: "You're Ready!",
    description:
      "Start by uploading your first contract or browsing our Template Library.",
    icon: Rocket,
  },
];

export function OnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompleted) {
      setIsOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOpen(false);
  };

  const handleGetStarted = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOpen(false);
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-md sm:max-w-lg border-0 shadow-lg"
        data-testid="dialog-onboarding"
      >
        <DialogTitle className="sr-only">
          {step.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {step.description}
        </DialogDescription>
        <div className="flex flex-col gap-6 p-2">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 rounded-lg bg-primary/10">
              <StepIcon className="h-10 w-10 text-primary" />
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold" data-testid="text-step-title">
                {step.title}
              </h2>
              <p
                className="text-muted-foreground leading-relaxed"
                data-testid="text-step-description"
              >
                {step.description}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-primary w-8"
                    : "bg-muted w-2"
                }`}
                data-testid={`dot-progress-${index}`}
              />
            ))}
          </div>

          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              data-testid="button-back"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkip}
              data-testid="button-skip"
            >
              Skip
            </Button>

            {!isLastStep ? (
              <Button
                onClick={handleNext}
                data-testid="button-next"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleGetStarted}
                data-testid="button-get-started"
              >
                Get Started
                <Rocket className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
