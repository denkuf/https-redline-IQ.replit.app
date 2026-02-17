import { cn } from "@/lib/utils";
import logoImg from "@assets/image_1771312700311.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
}

export function Logo({ size = "md", className, showText = true }: LogoProps) {
  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const imgSizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-16 w-16",
  };

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
