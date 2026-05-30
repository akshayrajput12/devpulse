import * as React from "react";
import { Check } from "lucide-react";
import { FlowSection } from "@/components/ui/story-scroll";
import { cn } from "@/lib/utils";

export interface FeatureSectionCardProps {
  label: string;
  badge: string;
  title: React.ReactNode;
  description: string;
  checks: string[];
  checkColor?: string;
  footerText?: string;
  footerVersion?: string;
  mockup: React.ReactNode;
  ariaLabel: string;
  style?: React.CSSProperties;
  className?: string;
}

export function FeatureSectionCard({
  label,
  badge,
  title,
  description,
  checks,
  checkColor = "text-primary",
  footerText = "DevPulse Continuous Diagnostics Engine",
  footerVersion = "v1.0.2",
  mockup,
  ariaLabel,
  style,
  className,
}: FeatureSectionCardProps) {
  // We use same background and borders from landing page theme
  const cardStyle = {
    background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 4%, var(--bg-soft)) 0%, var(--bg) 100%)',
    color: 'var(--text)',
    ...style,
  };

  return (
    <FlowSection 
      aria-label={ariaLabel} 
      style={cardStyle}
      className={cn("border-t border-border/40", className)}
    >
      <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px] pointer-events-none" />
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        
        {/* Header - aligns with top margins & font weights of page sections */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3 sm:pb-4 font-mono text-[10px] sm:text-xs">
          <span className="uppercase tracking-[0.2em] text-primary font-semibold">{label}</span>
          <span className="text-text-faint uppercase tracking-wider">{badge}</span>
        </div>
        
        {/* Main Grid - uses responsive paddings (py-4 to py-24), layout gap-12, matching the landing page */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center my-auto py-4 sm:py-12 lg:py-24">
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tightest leading-[1.05] font-sans text-foreground">
              {title}
            </h2>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-text-muted max-w-[46ch] font-sans font-normal">
              {description}
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-4 pt-1 sm:pt-2 font-mono text-[10px] sm:text-[11px] text-text-muted">
              {checks.map((chk, idx) => (
                <span key={idx} className="flex items-center gap-1.5 font-medium">
                  <Check className={cn("h-3.5 w-3.5 shrink-0", checkColor)} /> {chk}
                </span>
              ))}
            </div>
          </div>

          {/* Code or Graphic Mockup Container */}
          <div className="w-full flex justify-center lg:justify-end py-2 sm:py-0">
            {mockup}
          </div>
        </div>

        {/* Footer - aligned with section margins */}
        <div className="border-t border-border/40 pt-3 sm:pt-4 flex items-center justify-between font-mono text-[10px] sm:text-xs text-text-faint">
          <span>{footerText}</span>
          <span>{footerVersion}</span>
        </div>
      </div>
    </FlowSection>
  );
}
