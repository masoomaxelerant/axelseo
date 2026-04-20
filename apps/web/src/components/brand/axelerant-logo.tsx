interface AxelerantLogoProps {
  className?: string;
  variant?: "full" | "compact";
}

export function AxelerantLogo({ className, variant = "full" }: AxelerantLogoProps) {
  return (
    <span className={`font-display font-bold ${className ?? ""}`} aria-label="AxelSEO by Axelerant">
      {variant === "full" ? (
        <>
          <span className="text-brand-orange">Axel</span>
          <span className="text-white">SEO</span>
        </>
      ) : (
        <>
          <span className="text-brand-orange">A</span>
          <span className="text-white">S</span>
        </>
      )}
    </span>
  );
}
