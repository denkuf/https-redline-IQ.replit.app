import { cn } from "@/lib/utils";
import logoImg from "@assets/image_1771313683643.png";

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
    xl: "text-4xl",
    hero: "text-5xl md:text-6xl",
  };

  const imgSizeClasses = {
    sm: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-28 w-28",
    hero: "h-44 w-44 md:h-56 md:w-56",
  };

  const gapClasses = {
    sm: "gap-2",
    md: "gap-2",
    lg: "gap-3",
    xl: "gap-4",
    hero: "gap-5",
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
    <span className={cn("inline-flex items-center", gapClasses[size], className)}>
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
