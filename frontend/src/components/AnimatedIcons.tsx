import React from "react";

// Inline keyframe styles to be injected once on mount
export function AnimatedIconsStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes gear-spin-cw {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes gear-spin-ccw {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-360deg); }
      }
      @keyframes scan-line {
        0%, 100% { transform: translateY(0); opacity: 0.2; }
        50% { transform: translateY(12px); opacity: 1; }
      }
      @keyframes wave-dot {
        0% { offset-distance: 0%; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { offset-distance: 100%; opacity: 0; }
      }
      @keyframes pulse-ring {
        0% { transform: scale(0.9); opacity: 0.8; }
        50% { transform: scale(1.15); opacity: 0.4; }
        100% { transform: scale(0.9); opacity: 0.8; }
      }
      @keyframes bounce-subtle {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }
      @keyframes arrow-slide {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(-4px); }
      }
      @keyframes page-flip {
        0%, 100% { transform: rotateY(0deg); }
        50% { transform: rotateY(-15deg); }
      }
      @keyframes pulse-gaze {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
      @keyframes dash-move {
        to { stroke-dashoffset: -20; }
      }
      @keyframes packet-glow {
        0%, 100% { fill: var(--accent, #BEF264); filter: drop-shadow(0 0 2px var(--accent, #BEF264)); }
        50% { fill: #34D399; filter: drop-shadow(0 0 6px #34D399); }
      }
      @keyframes orbital-rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes height-grow {
        0%, 100% { height: 4px; }
        50% { height: 12px; }
      }
      @keyframes width-grow {
        0%, 100% { width: 4px; }
        50% { width: 14px; }
      }

      .icon-spin-cw { animation: gear-spin-cw 8s linear infinite; transform-origin: center; }
      .icon-spin-cw-fast { animation: gear-spin-cw 4s linear infinite; transform-origin: center; }
      .icon-spin-ccw { animation: gear-spin-ccw 6s linear infinite; transform-origin: center; }
      .icon-scan { animation: scan-line 2.5s ease-in-out infinite; }
      .icon-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; transform-origin: center; }
      .icon-bounce { animation: bounce-subtle 2s ease-in-out infinite; }
      .icon-arrow-slide { animation: arrow-slide 1.5s ease-in-out infinite; }
      .icon-page-flip { animation: page-flip 3s ease-in-out infinite; transform-origin: left center; }
      .icon-pulse-gaze { animation: pulse-gaze 1.5s ease-in-out infinite; }
      .icon-dash { stroke-dasharray: 4, 2; animation: dash-move 1.5s linear infinite; }
      .icon-packet-glow { animation: packet-glow 2s ease-in-out infinite; }
      .icon-orbital { animation: orbital-rotate 4s linear infinite; transform-origin: center; }
      .icon-grow-1 { animation: height-grow 1.8s ease-in-out infinite; }
      .icon-grow-2 { animation: height-grow 2.4s ease-in-out infinite; }
      .icon-width-grow { animation: width-grow 2s ease-in-out infinite; }
    ` }} />
  );
}

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

// 1. Overview / Dashboard Layout Icon
export function DashboardIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" className="icon-pulse-gaze" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" className="icon-pulse-gaze" style={{ animationDelay: "0.75s" }} />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

// 2. Users / Accounts Icon
export function UsersIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" className="icon-bounce" />
      <circle cx="9" cy="7" r="4" className="icon-bounce" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" className="icon-pulse-gaze" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" className="icon-pulse-gaze" />
    </svg>
  );
}

// 3. Blog Editor / Open Book Icon
export function BlogIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" className="icon-page-flip" />
    </svg>
  );
}

// 4. Simulator / Terminal Shell Icon
export function SimulatorIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" className="icon-width-grow" />
    </svg>
  );
}

// 5. Exit Admin Icon
export function ExitIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} icon-arrow-slide`} {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// 6. Gemini / Star Glow Icon
export function GeminiIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} icon-pulse-ring`} {...props}>
      <path d="M12 3c.132 4.417 3.583 7.868 8 8-.132 4.417-3.583 7.868-8 8-.132-4.417-3.583-7.868-8-8 .132-4.417 3.583-7.868 8-8z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

// 7. OpenAI / Sparkle Spiral Icon
export function OpenAIIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} icon-spin-cw`} {...props}>
      <path d="M4.5 16.5c-1.5-1.5-2.5-3.5-2.5-6s2-5 4.5-5 4.5 2 4.5 4.5" />
      <path d="M19.5 7.5c1.5 1.5 2.5 3.5 2.5 6s-2 5-4.5 5-4.5-2-4.5-4.5" />
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

// 8. Dual System Core Icon
export function DualSystemIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <circle cx="12" cy="12" r="3" className="icon-pulse-ring" />
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" strokeDasharray="6 3" className="icon-orbital" />
    </svg>
  );
}

// 9. Shield / Radar Scan Icon
export function ShieldIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} relative overflow-hidden`} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="4" y1="8" x2="20" y2="8" className="icon-scan" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// 10. Activity Waveform Icon
export function ActivityIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" className="icon-dash" />
    </svg>
  );
}

// 11. Review / Branching Pull Request Icon
export function ReviewIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" className="icon-bounce" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 15V9a4 4 0 0 0-4-4H9" className="icon-dash" />
      <line x1="6" y1="9" x2="6" y2="15" />
    </svg>
  );
}

// 12. Settings / Spinning Gears Icon
export function SettingsIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" className="icon-spin-cw" />
    </svg>
  );
}

// 13. Alert/Pulse Warning Icon
export function AlertTriangleIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" className="icon-pulse-ring" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// 14. Check / Sparking Success Icon
export function CheckCircleIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" className="icon-bounce" />
    </svg>
  );
}

// 15. Sparkles / AI Magic Icon
export function SparklesIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} icon-pulse-ring`} {...props}>
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707" />
    </svg>
  );
}

// 16. Compass / Global Radar Icon
export function CompassIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" className="icon-orbital" />
    </svg>
  );
}

// 17. Live Play Simulation Icon
export function PlayIcon({ className = "", size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className}`} {...props}>
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" fillOpacity="0.3" className="icon-pulse-ring" />
    </svg>
  );
}
