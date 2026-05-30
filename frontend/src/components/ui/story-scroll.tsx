'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface FlowSectionProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  'aria-label'?: string;
}

export const FlowSection: React.FC<FlowSectionProps> = ({
  className,
  style = {},
  children,
  'aria-label': ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMouseCoords({ x, y });
  };

  const glowColor = isDark 
    ? 'rgba(190, 242, 100, 0.08)' // DevPulse Lime-Green
    : 'rgba(21, 128, 61, 0.06)';  // Deep Emerald Green

  return (
    <section
      ref={containerRef}
      aria-label={ariaLabel}
      className={cn(
        'sticky top-0 h-screen w-full overflow-hidden bg-bg border-t border-border/40 rounded-t-2xl sm:rounded-t-[2.5rem] shadow-[0_-16px_48px_rgba(0,0,0,0.18)] px-[6vw] py-[5vw] sm:py-[4vw] flex flex-col justify-between',
        className
      )}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dynamic Cursor Spotlight Hover Glow */}
      {isHovered && (
        <div
          className="absolute pointer-events-none inset-0 transition-opacity duration-300 opacity-100 z-0"
          style={{
            background: `radial-gradient(420px circle at ${mouseCoords.x}px ${mouseCoords.y}px, ${glowColor}, transparent 80%)`,
          }}
        />
      )}

      <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:30px_30px] pointer-events-none" />
      
      <div className="relative z-10 flex h-full w-full flex-col justify-between gap-4 sm:gap-6">
        {children}
      </div>
    </section>
  );
};

export interface FlowArtProps {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

export const FlowArt: React.FC<FlowArtProps> = ({
  children,
  className,
  'aria-label': ariaLabel = 'Story scroll',
}) => {
  return (
    <div
      aria-label={ariaLabel}
      className={cn('relative w-full flex flex-col', className)}
    >
      {children}
    </div>
  );
};

export default FlowArt;
