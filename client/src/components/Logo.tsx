import { cn } from "@/lib/utils";
import logoImg from "@assets/image_1771312836980.png";

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
    hero: "text-4xl",
  };

  const imgSizeClasses = {
    sm: "h-7 w-7",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-20 w-20",
    hero: "h-28 w-28 md:h-36 md:w-36",
  };

  if (iconOnly) {
    return (
      <img
        src={logoImg}
        alt="RedlineIQ"
        className={cn(imgSizeClasses[size], "object-contain mix-blend-multiply dark:mix-blend-normal dark:drop-shadow-[0_0_1px_rgba(255,255,255,0.3)]", className)}
        data-testid="img-logo-icon"
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={logoImg}
        alt="RedlineIQ"
        className={cn(imgSizeClasses[size], "object-contain mix-blend-multiply dark:mix-blend-normal dark:drop-shadow-[0_0_1px_rgba(255,255,255,0.3)]")}
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
