import { cn } from "@/lib/utils";
import logoImg from "@/assets/redlineiq-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
  showText?: boolean;
  iconOnly?: boolean;
}

export function Logo({ size = "md", className, showText = true, iconOnly = false }: LogoProps) {
  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
    hero: "text-5xl md:text-6xl",
  };

  const imgSizeClasses = {
    sm: "h-8 w-8",
    md: "h-11 w-11",
    lg: "h-14 w-14",
    xl: "h-24 w-24",
    hero: "h-36 w-36 md:h-48 md:w-48",
  };

  if (iconOnly) {
    return (
      <img
        src={logoImg}
        alt="RedlineIQ"
        className={cn(imgSizeClasses[size], "object-contain", className)}
        data-testid="img-logo-icon"
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={logoImg}
        alt="RedlineIQ"
        className={cn(imgSizeClasses[size], "object-contain")}
        data-testid="img-logo-icon"
      />
      {showText && (
        <span className={cn("font-bold tracking-tight", textSizeClasses[size])}>
          Redline<span className="text-destructive">IQ</span>
        </span>
      )}
    </span>
  );
}

export { logoImg };
