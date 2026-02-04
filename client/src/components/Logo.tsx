import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <span className={cn("font-bold tracking-tight", sizeClasses[size], className)}>
      Redline<span className="text-destructive">IQ</span>
    </span>
  );
}
