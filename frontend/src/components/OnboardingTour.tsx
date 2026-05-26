import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  tab?: string;
}

interface OnboardingTourProps {
  showTour: boolean;
  tourStep: number;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  setTourStep: (step: number | ((prev: number) => number)) => void;
  dismissTour: () => void;
  steps: TourStep[];
}

export function OnboardingTour({
  showTour,
  tourStep,
  activeTab,
  setActiveTab,
  setTourStep,
  dismissTour,
  steps
}: OnboardingTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!showTour) {
      setTargetRect(null);
      return;
    }
    const updateRect = () => {
      const step = steps[tourStep - 1];
      if (!step) return;
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    const timer = setTimeout(updateRect, 250);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [showTour, tourStep, activeTab, steps]);

  if (!showTour) return null;

  const currentStep = steps[tourStep - 1];
  if (!currentStep) return null;

  const getPopoverCoordinates = () => {
    if (!targetRect) return { top: 0, left: 0, arrowLeft: 150, show: false, placement: "bottom" as const };
    
    let placement = "bottom" as const;
    let top = targetRect.bottom + 12;
    let left = targetRect.left + targetRect.width / 2 - 160;
    
    const minPadding = 16;
    if (left < minPadding) left = minPadding;
    if (left + 320 > window.innerWidth - minPadding) left = window.innerWidth - 320 - minPadding;
    
    const popoverHeightEst = 220;
    if (top + popoverHeightEst > window.innerHeight - minPadding) {
      placement = "top" as const;
      top = targetRect.top - popoverHeightEst - 12;
    }

    const targetCenterViewport = targetRect.left + targetRect.width / 2;
    const arrowLeft = targetCenterViewport - left - 6;
    
    return { 
      top, 
      left, 
      arrowLeft: Math.max(12, Math.min(300, arrowLeft)), 
      show: true, 
      placement 
    };
  };

  const popoverPos = getPopoverCoordinates();
  if (!popoverPos.show) return null;

  const handleTourNext = () => {
    if (tourStep < steps.length) {
      const nextStep = tourStep + 1;
      const stepConfig = steps[nextStep - 1];
      if (stepConfig.tab && stepConfig.tab !== activeTab) {
        setActiveTab(stepConfig.tab as any);
      }
      setTourStep(nextStep);
    } else {
      dismissTour();
    }
  };

  const handleTourBack = () => {
    if (tourStep > 1) {
      const prevStep = tourStep - 1;
      const stepConfig = steps[prevStep - 1];
      if (stepConfig.tab && stepConfig.tab !== activeTab) {
        setActiveTab(stepConfig.tab as any);
      }
      setTourStep(prevStep);
    }
  };

  return (
    <>
      {/* Backdrop Overlay with Theme Adaptive Shadows */}
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] transition-all dark:bg-black/60" />

      {/* Glowing Spotlight Focus Ring */}
      {targetRect && (
        <div 
          className="fixed z-[101] rounded-lg pointer-events-none transition-all duration-300 border-[3px] border-primary shadow-[0_0_20px_rgba(190,242,100,0.5),0_0_0_9999px_rgba(255,255,255,0.7)] dark:shadow-[0_0_20px_#bef264,0_0_0_9999px_rgba(0,0,0,0.65)] animate-in fade-in duration-200"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Floating Explanatory Popover Card */}
      <div 
        className="fixed z-[102] w-[320px] rounded-2xl border border-primary/30 bg-bg-elev p-5 shadow-2xl font-sans animate-in zoom-in-95 duration-200 text-foreground"
        style={{
          top: popoverPos.top,
          left: popoverPos.left,
        }}
      >
        {/* Small arrow pointing to target */}
        {popoverPos.placement === "bottom" ? (
          <div 
            className="absolute h-3 w-3 rotate-45 bg-bg-elev border-l border-t border-primary/30"
            style={{
              top: -6,
              left: popoverPos.arrowLeft,
            }}
          />
        ) : (
          <div 
            className="absolute h-3 w-3 rotate-45 bg-bg-elev border-r border-b border-primary/30"
            style={{
              bottom: -6,
              left: popoverPos.arrowLeft,
            }}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-3.5">
          <span className="text-xs font-bold text-primary flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Onboarding Guide
          </span>
          <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">
            Step {tourStep} of {steps.length}
          </span>
        </div>

        {/* Body Content */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {currentStep.title}
          </h3>
          <p className="text-[11px] text-text-muted leading-relaxed font-sans font-normal">
            {currentStep.content}
          </p>
        </div>

        {/* Navigation Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
          <button
            onClick={dismissTour}
            className="text-[10px] text-text-faint hover:text-foreground font-mono transition-colors font-semibold uppercase tracking-wider bg-transparent border-0 cursor-pointer"
          >
            Skip Guide
          </button>
          
          <div className="flex items-center gap-2">
            <button
              disabled={tourStep === 1}
              onClick={handleTourBack}
              className="rounded border border-border px-2.5 py-1.5 font-mono text-[10px] text-text-muted hover:text-foreground transition hover:bg-bg-soft disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleTourNext}
              className="rounded bg-primary px-3 py-1.5 font-mono text-[10px] font-bold text-primary-foreground transition hover:opacity-90 cursor-pointer"
            >
              {tourStep === steps.length ? "Finish" : "Next Step"}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
