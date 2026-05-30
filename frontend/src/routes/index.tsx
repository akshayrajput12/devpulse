import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useMotionValueEvent, useTransform } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { 
  ArrowRight, Check, Github, Shield, Zap, Share2, Webhook, Users, GitPullRequest, 
  Play, RotateCw, Mail, Activity, Lock, ChevronLeft, ChevronRight, Calendar, Clock, BookOpen 
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { SeverityBadge, SeverityDot } from "@/components/SeverityBadge";
import { HealthScore } from "@/components/HealthScore";
import { useServerFn } from "@tanstack/react-start";
import { getPublishedBlogPosts } from "@/lib/blog.functions";
import { fetchApi } from "@/lib/api-client";
import {
  ContainerScroll,
  ContainerSticky,
  ContainerAnimated,
  ContainerInset,
  HeroVideo,
  useContainerScrollContext
} from "@/components/ui/animated-video-on-scroll";
import FlowArt, { FlowSection } from "@/components/ui/story-scroll";
import { FeatureSectionCard } from "@/components/ui/feature-section-card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import AboutSection1 from "@/components/ui/about-section-1";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Landing,
});

export const meta = () => [
  { title: "DevPulse - High-Performance AI Code & DB Reviewer" },
  { name: "description", content: "Stop merging bugs. Get severity-ranked AI code reviews, database indexes audits, and complete production safeguards in under 10 seconds." },
  { property: "og:title", content: "DevPulse - High-Performance AI Code & DB Reviewer" },
  { property: "og:description", content: "Deeper stack-aware code reviews, database bottlenecks identification, and parallel context-aware Git Diff auditing." },
  { property: "og:image", content: "https://code-pulse.vercel.app/og-image.jpg" },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "DevPulse - High-Performance AI Code & DB Reviewer" },
  { name: "twitter:description", content: "Deeper stack-aware code reviews, database bottlenecks identification, and parallel context-aware Git Diff auditing." },
];

const DEMO_FINDINGS = [
  { sev: "crit", file: "api/search.ts:42", title: "SQL injection in user search query", category: "Security", conf: 98 },
  { sev: "high", file: "lib/cache.ts:18", title: "Race condition — uncached cache fill", category: "Performance", conf: 91 },
  { sev: "med",  file: "routes/posts.ts:67", title: "N+1 query inside for…of loop", category: "Performance", conf: 87 },
  { sev: "low",  file: "lib/notify.ts:23", title: "Unhandled promise — Slack call lost", category: "Bug", conf: 82 },
];

const LOGOS = ["Supabase", "Resend", "Clerk", "Trigger.dev", "Dub.co", "Railway", "Neon", "Inngest", "Loops", "Fly.io", "Biome"];

function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1240px] px-6 ${className}`}>{children}</div>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">{children}</span>
  );
}

export function SpotlightCard({ 
  children, 
  className = "", 
  whileHover, 
  ...props 
}: { 
  children: React.ReactNode; 
  className?: string; 
  whileHover?: any; 
  [key: string]: any;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMouseCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const glowColor = isDark 
    ? "rgba(190, 242, 100, 0.12)" // Subtly bright lime green tint
    : "rgba(77, 124, 15, 0.08)";   // Elegant deep forest tint

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={whileHover}
      className={cn("relative overflow-hidden rounded-xl border bg-bg-elev/80 transition-all", className)}
      {...props}
    >
      {isHovered && (
        <div
          className="absolute pointer-events-none inset-0 transition-opacity duration-300 opacity-100 z-0"
          style={{
            background: `radial-gradient(180px circle at ${mouseCoords.x}px ${mouseCoords.y}px, ${glowColor}, transparent 80%)`,
          }}
        />
      )}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </motion.div>
  );
}

function MacbookMockup({ videoRef, isFullSize }: { videoRef: React.RefObject<HTMLVideoElement | null>; isFullSize: boolean }) {
  const { scrollYProgress } = useContainerScrollContext();
  // Perspective tilt: starts tilted back, flattens as user scrolls
  const rotateX = useTransform(scrollYProgress, [0, 0.7], [22, 0]);
  const scale   = useTransform(scrollYProgress, [0, 0.8], [0.78, 1]);
  const glowOp  = useTransform(scrollYProgress, [0.5, 0.85], [0, 1]);

  return (
    <motion.div
      className="w-full flex justify-center items-end mt-6"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        className="relative w-full"
        style={{
          maxWidth: isFullSize ? "min(1100px, 92vw)" : "min(820px, 88vw)",
          rotateX,
          scale,
          transformOrigin: "center bottom",
          transition: "max-width 0.7s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* ── Laptop Lid / Screen ─────────────────────────────────── */}
        <div className="relative w-full" style={{ aspectRatio: "16/10" }}>
          {/* Outer aluminum bezel */}
          <div
            className="absolute inset-0 rounded-[14px] overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #3a3a3c 0%, #1c1c1e 40%, #0e0e10 100%)",
              boxShadow: "0 0 0 1.5px #4a4a50, 0 30px 80px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.5)",
              padding: "3.2% 2.8%",
            }}
          >
            {/* Screen inner black frame */}
            <div
              className="relative w-full h-full rounded-[8px] overflow-hidden"
              style={{
                background: "#000",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              {/* Camera notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center" style={{ width: 56, height: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a1a1c", boxShadow: "0 0 0 1px #2a2a2e, inset 0 0 2px rgba(255,255,255,0.08)" }} />
              </div>
              {/* Animated glow overlay when fully expanded */}
              <motion.div
                className="absolute inset-0 z-10 pointer-events-none rounded-[8px]"
                style={{
                  opacity: glowOp,
                  boxShadow: "inset 0 0 60px rgba(190,242,100,0.12), 0 0 100px rgba(190,242,100,0.22)",
                }}
              />
              {/* The actual video */}
              <video
                ref={videoRef}
                src="/intro.mp4"
                className="w-full h-full object-cover"
                muted
                playsInline
                loop
                autoPlay
              />
            </div>
          </div>

          {/* Top lid shine strip */}
          <div
            className="absolute top-0 left-[8%] right-[8%] h-[3px] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 70%, transparent)",
              borderRadius: "0 0 4px 4px",
            }}
          />

          {/* Animated lime glow ring when full */}
          <motion.div
            className="absolute inset-0 rounded-[14px] pointer-events-none"
            style={{
              opacity: glowOp,
              boxShadow: "0 0 0 1.5px rgba(190,242,100,0.6), 0 0 60px rgba(190,242,100,0.2)",
            }}
          />
        </div>

        {/* ── Hinge shadow line ──────────────────────────────────── */}
        <div
          className="w-full h-[3px]"
          style={{
            background: "linear-gradient(90deg, #0a0a0c, #222226 20%, #2e2e32 50%, #222226 80%, #0a0a0c)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.04)",
          }}
        />

        {/* ── Keyboard base / bottom chassis ────────────────────── */}
        <div
          className="relative w-full"
          style={{
            height: "clamp(14px, 4.5%, 32px)",
            background: "linear-gradient(180deg, #252528 0%, #1a1a1d 55%, #101012 100%)",
            borderRadius: "0 0 12px 12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 2px 0 rgba(255,255,255,0.04) inset",
          }}
        >
          {/* Touchpad hint */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: "clamp(48px, 12%, 80px)",
              height: "clamp(4px, 1.4%, 8px)",
              borderRadius: 4,
              background: "rgba(255,255,255,0.04)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
            }}
          />
        </div>

        {/* ── Surface reflection / table shadow ─────────────────── */}
        <div
          className="w-full"
          style={{
            height: "clamp(8px, 2%, 14px)",
            background: "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(0,0,0,0.55), transparent)",
            filter: "blur(3px)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

function HeroStickyContent() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullSize, setIsFullSize] = useState(false);
  const { scrollYProgress } = useContainerScrollContext();

  // Programmatically trigger video playback when scroll reaches >= 75% full scale
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const full = latest >= 0.75;
    setIsFullSize(full);
    if (videoRef.current) {
      if (full) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  });

  return (
    <ContainerSticky className="bg-bg text-foreground px-6 py-8 flex flex-col justify-between items-center border-b border-border min-h-screen">
      <div className="absolute inset-0 dp-grid-bg opacity-30 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" style={{ background: "radial-gradient(closest-side, rgba(190,242,100,0.08), transparent 70%)" }} />

      {/* Top Spacer */}
      <div className="h-2" />

      {/* Main Animated Headers, Form, and Meta */}
      <ContainerAnimated className="space-y-5 text-center flex flex-col items-center max-w-4xl mx-auto">
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-sev-ok dp-pulse" />
          <span className="text-text-muted">NEW —</span>
          <span>GitHub App now available</span>
        </motion.div>

        <h1 className="tracking-tightest font-medium leading-[1.02] text-center text-foreground font-sans" style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}>
          AI code reviews that <span className="text-primary">survive review</span>.<span className="dp-blink ml-1 font-thin">|</span>
        </h1>

        <p className="max-w-[56ch] text-[16px] md:text-[18px] leading-relaxed text-text-muted text-center font-sans">
          Paste a GitHub PR URL. Get a severity-ranked review with line-by-line fixes in under 10 seconds. No senior dev required.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); navigate({ to: "/reviews/new", search: { url } }); }}
          className="flex w-full max-w-[560px] items-center gap-2 rounded-lg border border-border bg-bg-elev p-1.5 transition focus-within:border-primary"
        >
          <Github className="ml-2 h-4 w-4 text-text-muted" />
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="min-w-0 flex-1 bg-transparent py-2 font-mono text-sm outline-none placeholder:text-text-faint"
          />
          <button className="inline-flex items-center gap-1 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:-translate-y-px cursor-pointer">
            Review <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        <div className="flex flex-wrap justify-center items-center gap-4 font-mono text-xs text-text-muted">
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-sev-ok" /> No card required</span>
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-sev-ok" /> 10 free reviews</span>
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-sev-ok" /> Public repos work</span>
        </div>
      </ContainerAnimated>

      {/* 3D MacBook Mockup with Video */}
      <MacbookMockup videoRef={videoRef} isFullSize={isFullSize} />

      {/* Scroll Mouse Indicator */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isFullSize ? 0 : 0.8, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-6 flex flex-col items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-text-muted select-none pointer-events-none"
      >
        <span>Scroll to see how it works</span>
        <motion.div 
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="flex h-5 w-3 justify-center rounded-full border border-text-muted/40 p-0.5"
        >
          <div className="h-1.5 w-1 rounded-full bg-primary" />
        </motion.div>
      </motion.div>
    </ContainerSticky>
  );
}

function Hero() {
  return (
    <section className="relative">
      <ContainerScroll className="h-[220vh]">
        <HeroStickyContent />
      </ContainerScroll>
    </section>
  );
}

function FloatingReviewCard() {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0, rotate: -1 }}
      animate={{ y: 0, opacity: 1, rotate: -1 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="relative"
    >
      <div className="rounded-xl border border-border bg-bg-elev shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-text-muted">
            <GitPullRequest className="h-3.5 w-3.5" />
            <span>acme/api-server</span><span className="text-text-faint">#1284</span>
          </div>
          <span className="rounded-sm bg-bg-soft px-2 py-0.5 text-text-faint">6.4s</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4">
          <div>
            <div className="text-[15px] font-medium tracking-tight">feat(search): add user search endpoint with caching</div>
            <div className="mt-1 font-mono text-xs text-text-muted">@nivedh • 12 files • +482 / -67</div>
          </div>
          <HealthScore value={73} size={88} />
        </div>
        <div className="border-t border-border-faint">
          {DEMO_FINDINGS.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.12 }}
              className="flex items-center gap-3 border-b border-border-faint px-4 py-2.5 last:border-b-0"
            >
              <SeverityBadge level={f.sev} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{f.title}</div>
                <div className="font-mono text-xs text-text-faint">{f.file}</div>
              </div>
              <span className="font-mono text-xs text-text-faint">{f.conf}%</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function LogoTicker() {
  const row = [...LOGOS, ...LOGOS];
  return (
    <section className="overflow-hidden border-b border-border bg-bg-soft py-8">
      <div className="relative" style={{ maskImage: "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)" }}>
        <div className="dp-marquee flex w-max gap-12 whitespace-nowrap">
          {row.map((l, i) => (
            <span key={i} className="font-mono text-sm uppercase tracking-widest text-text-faint">{l}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

const STREAM_STEPS = [
  { t: 350, text: "fetching PR diff…", kind: "log" },
  { t: 900, text: "diff: 12 files, +482/-67", kind: "log" },
  { t: 1500, text: "analyzing api/search.ts…", kind: "log" },
  { t: 2200, text: "SQL injection found", kind: "issue", sev: "crit", file: "api/search.ts:42" },
  { t: 3000, text: "race condition found", kind: "issue", sev: "high", file: "lib/cache.ts:18" },
  { t: 3700, text: "N+1 detected", kind: "issue", sev: "med", file: "routes/posts.ts:67" },
  { t: 4400, text: "unhandled promise", kind: "issue", sev: "low", file: "lib/notify.ts:23" },
  { t: 5000, text: "review complete · 6.4s", kind: "done" },
] as const;

function LiveDemo() {
  const [tick, setTick] = useState(0);
  const [run, setRun] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTick(0);
    const timers = STREAM_STEPS.map((s, i) => setTimeout(() => setTick(i + 1), s.t));
    return () => timers.forEach(clearTimeout);
  }, [run]);

  const visible = STREAM_STEPS.slice(0, tick);
  const score = Math.max(0, Math.min(73, tick * 12));

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.35,
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
    hidden: {
      filter: "blur(8px)",
      y: 30,
      opacity: 0,
    },
  };

  const textVariants = {
    visible: (i: number) => ({
      filter: "blur(0px)",
      opacity: 1,
      transition: {
        delay: i * 0.25,
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
    hidden: {
      filter: "blur(8px)",
      opacity: 0,
    },
  };

  return (
    <section className="border-b border-border py-24 bg-bg relative overflow-hidden" id="demo" ref={heroRef}>
      <div className="absolute inset-0 dp-grid-bg opacity-10 pointer-events-none" />
      <Container className="relative z-10">
        <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
          
          {/* Left side - Dynamic Content Timeline & Statistics */}
          <div className="flex-1 space-y-8 w-full">
            <div>
              <TimelineContent
                as="div"
                animationNum={0}
                timelineRef={heroRef}
                customVariants={revealVariants}
              >
                <Eyebrow>The wow moment</Eyebrow>
              </TimelineContent>

              <TimelineContent
                as="h2"
                animationNum={1}
                timelineRef={heroRef}
                customVariants={revealVariants}
                className="tracking-tightest mt-3 font-medium text-foreground !leading-[1.08] font-sans text-3xl md:text-4xl lg:text-5xl"
              >
                Watch a real review{" "}
                <TimelineContent
                  as="span"
                  animationNum={2}
                  timelineRef={heroRef}
                  customVariants={textVariants}
                  className="text-primary border-2 border-primary/50 border-dotted inline-block px-3 py-0.5 rounded-md"
                >
                  stream in.
                </TimelineContent>
              </TimelineContent>

              <TimelineContent
                as="p"
                animationNum={3}
                timelineRef={heroRef}
                customVariants={textVariants}
                className="mt-6 text-text-muted text-sm md:text-base leading-relaxed max-w-[46ch] font-sans"
              >
                No mockups, no canned video. Real streaming output, the same component you'll use in production.
              </TimelineContent>
            </div>

            {/* Metrics cards grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <TimelineContent
                as="div"
                animationNum={4}
                timelineRef={heroRef}
                customVariants={textVariants}
                className="rounded-xl border border-border bg-bg-elev/60 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] backdrop-blur-sm"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint">Health score</div>
                <div className="mt-3 flex items-center gap-4">
                  <HealthScore value={score} size={84} />
                  <div className="text-xs text-text-muted">
                    <div className="font-semibold text-foreground">Streams live.</div>
                    <div className="mt-1 font-mono text-[11px]">/ {tick} of {STREAM_STEPS.length}</div>
                  </div>
                </div>
              </TimelineContent>

              <TimelineContent
                as="div"
                animationNum={5}
                timelineRef={heroRef}
                customVariants={textVariants}
                className="rounded-xl border border-border bg-bg-elev/60 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] backdrop-blur-sm"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint">By severity</div>
                <div className="mt-2.5 space-y-1.5">
                  {(["crit", "high", "med", "low"] as const).map((lv) => {
                    const n = visible.filter((s) => s.kind === "issue" && (s as any).sev === lv).length;
                    return (
                      <div key={lv} className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <SeverityDot level={lv} /> 
                          <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">{lv}</span>
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-foreground">{n}</span>
                      </div>
                    );
                  })}
                </div>
              </TimelineContent>
            </div>

            {/* Sub-bar / CTA Replay trigger */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/30">
              <TimelineContent
                as="div"
                animationNum={6}
                timelineRef={heroRef}
                customVariants={textVariants}
                className="text-xs font-mono text-text-muted"
              >
                <div className="font-semibold text-foreground mb-0.5 capitalize">
                  Continuous active reviews
                </div>
                <div className="text-text-faint uppercase text-[9px] tracking-wider font-semibold">
                  10-second diagnostic loop
                </div>
              </TimelineContent>

              <TimelineContent
                as="button"
                animationNum={7}
                timelineRef={heroRef}
                customVariants={textVariants}
                onClick={() => setRun(r => r + 1)}
                className="bg-primary hover:shadow-primary/30 text-primary-foreground gap-2 font-medium shadow-lg shadow-primary/25 h-11 px-5 rounded-full text-xs inline-flex items-center cursor-pointer transition hover:-translate-y-0.5 active:translate-y-0 select-none"
              >
                <RotateCw size={13} className={cn("transition-transform", tick < STREAM_STEPS.length && "animate-spin-slow")} />
                Replay Stream
              </TimelineContent>
            </div>
          </div>

          {/* Right side - Live Terminal Stream */}
          <div className="flex-1 w-full lg:max-w-[540px]">
            <div className="overflow-hidden rounded-xl border border-border bg-bg-code shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-border-faint px-4 py-2.5 font-mono text-xs">
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="h-2.5 w-2.5 rounded-full bg-sev-crit/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-sev-med/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-sev-ok/70" />
                  <span className="ml-2">devpulse — review</span>
                </div>
                <span className="text-[10px] text-text-faint font-mono uppercase tracking-wider">active stream</span>
              </div>
              <div className="min-h-[340px] space-y-2 p-5 font-mono text-[12.5px] leading-relaxed">
                <AnimatePresence>
                  {visible.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                      <span className="text-text-faint">{String(i + 1).padStart(2, "0")}</span>
                      {s.kind === "log" && <span className="text-text-muted">› {s.text}</span>}
                      {s.kind === "issue" && (
                        <>
                          <SeverityBadge level={(s as any).sev} />
                          <span className="text-foreground font-semibold">{s.text}</span>
                          <span className="text-text-faint">{(s as any).file}</span>
                        </>
                      )}
                      {s.kind === "done" && (
                        <span className="inline-flex items-center gap-2 rounded-sm bg-accent px-2 py-0.5 text-accent-foreground">
                          <Check className="h-3 w-3" /> {s.text}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {tick < STREAM_STEPS.length && <span className="dp-blink inline-block text-primary">▍</span>}
              </div>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}

const FEATURES = [
  { icon: Zap, t: "10-second reviews", d: "Streaming output, not 'spinner for 30s'. You see issues as they land." },
  { icon: Shield, t: "Severity-ranked", d: "Crit · High · Med · Low. Fix what matters, ignore the nits." },
  { icon: GitPullRequest, t: "GitHub App", d: "Install once. Every PR auto-reviewed the moment it opens." },
  { icon: Share2, t: "Public share links", d: "Read-only review URLs you can drop in Slack or send to your lead." },
  { icon: Webhook, t: "Webhook delivery", d: "POST raw findings to Slack, Discord, or any endpoint." },
  { icon: Users, t: "Team workspace", d: "Invite teammates, share history, one billing seat for everyone." },
];

function Features() {
  return (
    <div id="features" className="w-full bg-bg">
      <FlowArt aria-label="DevPulse Core Capabilities Showcase">
        
        {/* Section 1: Security Audit */}
        <FeatureSectionCard
          ariaLabel="Secure In-Memory Diagnostics"
          label="Secure In-Memory Audits"
          badge="DEVPULSE CORE"
          title={<>IN-MEMORY<br/>PR DIFF SCANS</>}
          description="Security starts at diff parsing. DevPulse executes scans strictly in-memory. Your proprietary code is never written to disk, saved in backend databases, or ingested to train public AI models."
          checks={["OWASP Top 10 Audits", "Zero Data Persistence"]}
          checkColor="text-primary"
          footerText="DevPulse Continuous Diagnostics Engine"
          mockup={
            <div className="rounded-xl border border-border bg-bg-elev/80 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md w-full max-w-[480px]">
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 font-mono text-[11px] text-text-muted">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Vulnerability Diagnostic</span>
                </div>
                <span>98% Conf.</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">CRITICAL</span>
                  <h4 className="text-sm font-semibold text-foreground">SQL Injection in User Lookup</h4>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Unparameterized variable concatenation detected in Raw PostgreSQL query loop.
                </p>
                <div className="space-y-2">
                  <div className="font-mono text-[8px] uppercase tracking-wider text-red-600 dark:text-red-400">⛔ Offending Code</div>
                  <pre className="font-mono text-[10px] bg-red-500/5 dark:bg-red-950/20 border border-red-500/25 dark:border-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg overflow-x-auto">
                    {`const user = await db.query(
  \`SELECT * FROM users WHERE id = '\${req.query.id}'\`
);`}
                  </pre>
                </div>
              </div>
            </div>
          }
        />

        {/* Section 2: Database Bottlenecks */}
        <FeatureSectionCard
          ariaLabel="Pre-emptive Database Auditing"
          label="Database Optimization Auditing"
          badge="INDEX & QUERY OPTIMIZER"
          title={<>PRE-EMPTIVE<br/>BOTTLENECK DETECTOR</>}
          description="Database locks and slow operations are caught before staging. DevPulse evaluates all ORM calls, schema modifications, and migration patterns to catch N+1 query loops, missing index paths, and risky database blocks."
          checks={["N+1 Loop Prevention", "Index Gaps Isolation"]}
          checkColor="text-[#f59e0b]"
          footerText="DevPulse Query Performance Engine"
          mockup={
            <div className="rounded-xl border border-border bg-bg-elev/80 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md w-full max-w-[480px]">
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 font-mono text-[11px] text-text-muted">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Query Performance Audit</span>
                </div>
                <span>92% Conf.</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">HIGH SEVERITY</span>
                  <h4 className="text-sm font-semibold text-foreground">N+1 Relational Query Loop</h4>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Executing dynamic subqueries inside user post loop. Triggers 100+ database hits.
                </p>
                <div className="space-y-2">
                  <div className="font-mono text-[8px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">✅ Recommended Complete Fix</div>
                  <pre className="font-mono text-[10px] bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/25 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg overflow-x-auto">
                    {`// Batch load comments using SQL JOIN
const postsWithComments = await db.posts.findMany({
  include: { comments: true }
});`}
                  </pre>
                </div>
              </div>
            </div>
          }
        />

        {/* Section 3: Continuous Deployment comments */}
        <FeatureSectionCard
          ariaLabel="Continuous Git Integration"
          label="Git PR Workflow Integration"
          badge="AUTOMATED WORKFLOW"
          title={<>CONTINUOUS<br/>PR FEEDBACK LOOP</>}
          description="Keep your engineers aligned without leaving their screens. DevPulse writes precise review comments directly onto your GitHub Pull Request timeline or delivers comprehensive SMTP report dashboards to your inbox."
          checks={["Github App Webhook", "Line-by-line Comments"]}
          checkColor="text-[#8b5cf6]"
          footerText="DevPulse Pull Request Workflow Integration"
          mockup={
            <div className="rounded-xl border border-border bg-bg-elev/80 p-5 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md w-full max-w-[480px]">
              <div className="flex items-center gap-2.5 border-b border-border pb-3 mb-3">
                <div className="bg-bg-soft w-8 h-8 rounded-md flex items-center justify-center border border-border">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">DevPulse AI Bot</span>
                    <span className="rounded bg-primary/10 border border-primary/20 text-primary font-mono text-[8px] font-bold px-1.5 py-0.1 uppercase tracking-wider">App</span>
                  </div>
                  <span className="text-[10px] text-text-faint font-mono">reviewed this pull request 4s ago</span>
                </div>
              </div>
              <div className="space-y-3 font-sans text-xs text-text-muted">
                <p>
                  ⚡ Diagnostics complete for <code className="font-mono bg-bg-soft px-1 rounded text-foreground">api/search.ts</code>. Audit results:
                </p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li><span className="text-red-400 font-semibold">1 Critical issue:</span> SQL Injection risk resolved.</li>
                  <li><span className="text-amber-400 font-semibold">1 High issue:</span> N+1 performance query query batched.</li>
                </ul>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 font-mono text-[10px] text-primary flex items-center justify-between mt-2">
                  <span>Health Score: 94 / 100</span>
                  <span className="font-semibold flex items-center gap-1">Open Interactive Dashboard &rarr;</span>
                </div>
              </div>
            </div>
          }
        />

        {/* Section 4: Enterprise metrics & diagnostics velocity */}
        <FeatureSectionCard
          ariaLabel="Enterprise Grade Performance"
          label="Scalable Enterprise Performance"
          badge="ENTERPRISE SCALE"
          title={<>DIAGNOSTIC SPEED<br/>UNTETHERED VELOCITY</>}
          description="Engineered to scale for multi-developer teams. Enjoy lightning fast 6.4s diagnostic runs, track comprehensive credits transaction histories, set custom concurrency limits, and export premium reports."
          checks={["Avg. Run: 6.4s", "Enterprise Scaled"]}
          checkColor="text-primary"
          footerText="DevPulse Scale Diagnostic Dashboard"
          mockup={
            <div className="rounded-xl border border-border bg-bg-elev/80 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-md w-full max-w-[480px]">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-soft/40 border border-border p-4 rounded-xl text-center">
                  <div className="font-sans text-3xl font-extrabold text-primary">94</div>
                  <div className="font-mono text-[8px] uppercase tracking-widest text-text-faint mt-1.5">Avg Health Score</div>
                </div>
                <div className="bg-bg-soft/40 border border-border p-4 rounded-xl text-center">
                  <div className="font-sans text-3xl font-extrabold text-foreground">6.4s</div>
                  <div className="font-mono text-[8px] uppercase tracking-widest text-text-faint mt-1.5">Review Speed</div>
                </div>
                <div className="bg-bg-soft/40 border border-border p-4 rounded-xl text-center col-span-2">
                  <div className="font-sans text-2xl font-bold text-foreground">148 Files</div>
                  <div className="font-mono text-[8px] uppercase tracking-widest text-text-faint mt-1.5">Audited This Month</div>
                </div>
              </div>
            </div>
          }
        />

      </FlowArt>
    </div>
  );
}


function MailingShowcaseSection() {
  return (
    <section className="border-b border-border py-24 relative overflow-hidden">
      <div className="absolute inset-0 dp-grid-bg opacity-30 pointer-events-none" />
      <Container className="relative">
        <div className="grid gap-16 lg:grid-cols-[1.1fr_1fr] items-center">
          {/* Premium Mailing Showcase */}
          <div className="flex flex-col justify-center items-center lg:items-start order-2 lg:order-1">
            <SpotlightCard className="w-full max-w-[480px] p-6 shadow-2xl group">
              {/* Glowing Pulse Border */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 opacity-50 pointer-events-none" />
              
              {/* Fake Email Header */}
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4 font-mono text-[10px] text-text-muted">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span>INBOX ALERT</span>
                </div>
                <span>JUST NOW</span>
              </div>

              {/* Email Content */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint">Sender: DevPulse Reports</span>
                    <h3 className="text-sm font-semibold text-foreground mt-0.5">🚀 PR Review complete: acme/auth-service #42</h3>
                  </div>
                  <Mail className="h-4 w-4 text-primary" />
                </div>

                <div className="rounded-lg border border-border-faint bg-bg-code p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span>Health Score</span>
                    <span className="text-primary font-bold">92/100</span>
                  </div>
                  
                  {/* Progress Bar Mock */}
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[92%]" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-center">
                    <div className="bg-sev-crit/10 border border-sev-crit/20 rounded p-1.5">
                      <div className="text-sev-crit font-bold">0</div>
                      <div className="text-text-faint mt-0.5">CRIT</div>
                    </div>
                    <div className="bg-sev-high/10 border border-sev-high/20 rounded p-1.5">
                      <div className="text-sev-high font-bold">1</div>
                      <div className="text-text-faint mt-0.5">HIGH</div>
                    </div>
                    <div className="bg-sev-ok/10 border border-sev-ok/20 rounded p-1.5">
                      <div className="text-sev-ok font-bold">3</div>
                      <div className="text-text-faint mt-0.5">CLEAN</div>
                    </div>
                  </div>
                </div>

                <div className="border border-border-faint rounded-lg p-3 bg-bg-soft/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">🔒 Security Guard Triggered</span>
                    <span className="text-[10px] font-mono text-sev-high">HIGH CONFIDENCE</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed font-sans">
                    API route `/v1/auth/reset` is missing rate-limiting rules. Potential brute-force vectors detected on verification tokens.
                  </p>
                </div>
              </div>

              {/* Email Footer / CTA */}
              <div className="mt-5 border-t border-border pt-4 flex items-center justify-between">
                <span className="font-mono text-[9px] text-text-faint">HTML Delivery tailored via HSL</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-primary font-semibold">
                  Open Report <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </SpotlightCard>
          </div>

          {/* Explanatory text */}
          <div className="flex flex-col justify-center order-1 lg:order-2">
            <Eyebrow>DYNAMIC EMAIL ENGINE</Eyebrow>
            <h2 className="tracking-tightest mt-3 font-medium text-foreground text-3xl md:text-4xl" style={{ lineHeight: 1.08, letterSpacing: "-0.028em" }}>
              Beautiful HSL-Tailored Email Summaries
            </h2>
            <p className="mt-4 text-text-muted text-sm leading-relaxed max-w-[50ch]">
              No more checking dashboards continuously. Receive interactive, dark-themed HTML reviews delivered directly to your inbox or Slack channels. Expose triggers for on-demand reports instantly.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="rounded bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-mono text-primary">
                SMTP Dynamic Runtime
              </span>
              <span className="rounded bg-bg-soft border border-border px-2.5 py-1 text-xs font-mono text-text-muted">
                Fully Offline Local Fallback
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ComparisonSection() {
  const tableData = [
    { feature: "PR auto-review (inline comments)", rabbit: true, pulse: true },
    { feature: "Check run badge on PR", rabbit: true, pulse: true },
    { feature: "Commit-level monitoring (push events)", rabbit: false, pulse: true },
    { feature: "Stack-aware review (.devpulse.json)", rabbit: false, pulse: true },
    { feature: "Production shield (checks what's absent)", rabbit: false, pulse: true },
    { feature: "AI editor with Monaco + fix generation", rabbit: false, pulse: true },
    { feature: "API / backend analyser", rabbit: false, pulse: true },
    { feature: "Load simulation report", rabbit: false, pulse: true },
    { feature: "Team pattern analytics & standards doc", rabbit: false, pulse: true },
    { feature: "INR pricing (Razorpay / UPI / NetBanking)", rabbit: false, pulse: true },
    { feature: "Per-repo review disable (G2 complaints fixed)", rabbit: false, pulse: true },
    { feature: "Flat pricing (not per-seat)", rabbit: false, pulse: true },
  ];

  return (
    <section className="border-b border-border py-24 relative overflow-hidden" id="comparison">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Eyebrow>BATTLE TESTED COMPARISON</Eyebrow>
          <h2 className="tracking-tightest mt-3 font-medium text-foreground" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.08, letterSpacing: "-0.028em" }}>
            DevPulse vs. CodeRabbit
          </h2>
          <p className="mt-4 text-sm text-text-muted leading-relaxed">
            "CodeRabbit reviews your code. DevPulse reviews your entire engineering process."
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-bg-elev/30 shadow-xl">
          <table className="w-full border-collapse text-left text-sm font-mono">
            <thead>
              <tr className="border-b border-border bg-bg-elev/75 backdrop-blur-sm">
                <th className="p-4 font-semibold text-text-muted">Features</th>
                <th className="p-4 font-semibold text-text-muted text-center w-[160px]">CodeRabbit</th>
                <th className="p-4 font-semibold text-primary text-center w-[200px] bg-primary/5 relative">
                  DevPulse
                  <div className="absolute top-0 right-0 left-0 h-[2px] bg-primary" />
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-border-faint hover:bg-bg-soft/30 transition">
                  <td className="p-4 font-sans text-xs text-foreground font-medium">{row.feature}</td>
                  <td className="p-4 text-center">
                    {row.rabbit ? (
                      <Check className="h-4 w-4 text-sev-ok mx-auto" />
                    ) : (
                      <span className="text-sev-crit font-bold text-xs">✗</span>
                    )}
                  </td>
                  <td className="p-4 text-center bg-primary/[0.02] border-x border-primary/10 relative">
                    <Check className="h-4 w-4 text-primary mx-auto font-bold" />
                  </td>
                </tr>
              ))}
               <tr className="border-b border-border hover:bg-bg-soft/30 transition font-sans">
                <td className="p-4 text-xs text-foreground font-semibold">Pricing (Monthly)</td>
                <td className="p-4 text-center text-text-muted text-xs font-mono">₹1,500/mo</td>
                <td className="p-4 text-center bg-primary/[0.04] border-x border-primary/20 relative font-bold text-primary font-mono text-xs">
                  ₹999/mo
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-xl border border-primary/20 bg-primary/[0.02] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
          <div>
            <h4 className="font-semibold text-sm text-foreground">Ready to switch to resilient Developer Pro?</h4>
            <p className="mt-1 text-xs text-text-muted">Unlock OpenAI resilient failover triggers and direct priority support today.</p>
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:-translate-y-px shrink-0">
            Compare & Switch <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

function Pricing() {
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetchApi("/api/pricing/plans")
      .then((data) => {
        if (data && data.length > 0) {
          setPlans(data);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch database plans in landing, using offline fallback:", err);
        setPlans([
          {
            id: "free",
            name: "Free Forever",
            price_monthly: 0,
            price_annual_monthly: 0,
            credits: 10,
            max_files_per_pr: 5,
            features: [
              "10 Monthly Credits",
              "Max 5 files/PR limit",
              "Google Gemini-Only routing",
              "No credit card required"
            ],
            recommended: false,
          },
          {
            id: "pro",
            name: "Developer Pro",
            price_monthly: 999,
            price_annual_monthly: 799,
            credits: 150,
            max_files_per_pr: 35,
            features: [
              "150 Monthly Credits",
              "Max 35 files/PR limit",
              "Resilient OpenAI Fallback (failover lock)",
              "Direct priority developer support"
            ],
            recommended: true,
          },
        ]);
      });
  }, []);

  const displayPlans = plans.length > 0 ? plans : [
    {
      id: "free",
      name: "Free Forever",
      price_monthly: 0,
      credits: 10,
      max_files_per_pr: 5,
      features: [
        "10 Monthly Credits",
        "Max 5 files/PR limit",
        "Google Gemini-Only routing",
        "No credit card required"
      ],
      recommended: false,
    },
    {
      id: "pro",
      name: "Developer Pro",
      price_monthly: 999,
      credits: 150,
      max_files_per_pr: 35,
      features: [
        "150 Monthly Credits",
        "Max 35 files/PR limit",
        "Resilient OpenAI Fallback (failover lock)",
        "Direct priority developer support"
      ],
      recommended: true,
    },
  ];

  return (
    <section id="pricing" className="border-b border-border py-24 font-sans">
      <Container>
        <Eyebrow>Pricing</Eyebrow>
        <h2 className="tracking-tightest mt-3 font-medium text-foreground text-3xl md:text-4xl font-sans" style={{ lineHeight: 1.08, letterSpacing: "-0.028em" }}>
          Start free. Scale when you ship.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-[800px] mx-auto items-stretch">
          {displayPlans.map((p) => {
            const isFree = p.id === "free";
            return (
              <SpotlightCard 
                key={p.id} 
                whileHover={{ scale: 1.01 }}
                className={`p-6 flex flex-col justify-between ${
                  p.recommended 
                    ? "border-primary shadow-[0_0_50px_-20px_rgba(190,242,100,0.3)]" 
                    : "border-border"
                }`}
              >
                {p.recommended && (
                  <div className="absolute -top-2.5 left-6 rounded-sm bg-primary px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary-foreground font-semibold">
                    Most Popular
                  </div>
                )}
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-text-muted">{p.name}</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-medium tracking-tight text-foreground">₹{p.price_monthly}</span>
                    <span className="text-sm text-text-muted font-mono">{isFree ? "forever" : "/ month"}</span>
                  </div>

                  <div className="mt-4 border-y border-border/40 py-2.5 space-y-1 font-mono text-[11px] text-text-muted">
                    <div className="flex justify-between">
                      <span>Credits:</span>
                      <span className="text-foreground font-semibold">{p.credits} / mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PR Limit:</span>
                      <span className="text-foreground font-semibold">{p.max_files_per_pr} files</span>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-text-muted font-sans">
                    {p.features.map((f: string) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Link 
                  to={isFree ? "/login" : "/pricing"} 
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold transition hover:-translate-y-px ${
                    p.recommended 
                      ? "bg-primary text-primary-foreground" 
                      : "border border-border bg-bg-soft text-foreground hover:bg-bg-soft/70"
                  }`}
                >
                  {isFree ? "Start free" : "Upgrade to Pro"}
                </Link>
              </SpotlightCard>
            );
          })}
        </div>
        <p className="mt-6 font-mono text-[10px] text-text-faint text-center">Powered securely by Razorpay • UPI, Cards, Net Banking • Cancel anytime.</p>
      </Container>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-b border-border py-24">
      <Container>
        <div className="dp-pulse-bg relative overflow-hidden rounded-2xl border border-border bg-bg-elev p-12 text-center">
          <Eyebrow>Get reviewed in 10 seconds</Eyebrow>
          <h3 className="tracking-tightest mx-auto mt-3 max-w-[20ch] font-medium" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.08, letterSpacing: "-0.028em" }}>
            Stop merging bugs. Start shipping reviews.
          </h3>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:-translate-y-px">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/" hash="demo" className="inline-flex items-center gap-2 rounded-md border border-border bg-bg-soft px-5 py-2.5 text-sm text-text-muted hover:text-foreground">
              <Play className="h-3.5 w-3.5" /> Re-watch demo
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-border/40 mt-16 bg-bg-soft/20">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between font-sans">
        <div className="space-y-2">
          <div className="font-mono text-xs text-text-faint">© {new Date().getFullYear()} DevPulse. Made for shipping.</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/refunds" className="hover:text-primary transition-colors">Cancellation & Refund Policy</Link>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-xs text-text-muted shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-sev-ok dp-pulse" /> All systems operational
        </div>
      </Container>
    </footer>
  );
}

const FALLBACK_POSTS = [
  {
    id: "fb-1",
    slug: "optimizing-ai-code-reviews-parallel-chunking",
    title: "Optimizing AI Code Reviews with Parallel Context-Aware Chunking",
    excerpt: "Learn how slicing diff files into context-aware chunks (imports + changed lines ± 40 lines) achieves 80–95% token savings and rapid parallel execution before synthesis.",
    cover_image_url: null,
    published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fb-2",
    slug: "preventing-sql-performance-bottlenecks",
    title: "Preventing SQL Performance Bottlenecks Automatically",
    excerpt: "How we run LLM audits over your entire DB queries and schema layers to auto-detect N+1 loops, missing indexes, transaction locks, and concurrency hazards.",
    cover_image_url: null,
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "fb-3",
    slug: "why-flat-pricing-code-audits",
    title: "Why We Switched to Flat Pricing for AI Code Audits",
    excerpt: "Developer velocity shouldn't be penalized by metered API keys. Exploring why flat pricing is the only sustainable path for deep continuous workspace indexing.",
    cover_image_url: null,
    published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

function BlogCarouselSection() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const fetchBlogs = useServerFn(getPublishedBlogPosts);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetchBlogs()
      .then((data) => {
        if (active && data && data.length > 0) {
          setBlogs(data);
        } else if (active) {
          setBlogs(FALLBACK_POSTS);
        }
      })
      .catch((err) => {
        console.error("Failed to load blog posts in landing:", err);
        if (active) setBlogs(FALLBACK_POSTS);
      });
    return () => {
      active = false;
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollToVal = direction === "left" 
        ? scrollLeft - clientWidth * 0.75 
        : scrollLeft + clientWidth * 0.75;
      
      scrollRef.current.scrollTo({
        left: scrollToVal,
        behavior: "smooth"
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <section className="py-24 border-t border-border/40 relative overflow-hidden bg-bg-elev/10">
      <Container>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <Eyebrow>Chronicles</Eyebrow>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-sans mt-2">
              Engineering Chronicles
            </h2>
            <p className="mt-3 text-text-muted text-sm max-w-[60ch] leading-relaxed">
              Deep dives on automated audits, parallel PR context-slicing, database optimization, and high-velocity developer workflows.
            </p>
          </div>

          <div className="flex items-center gap-3 mt-6 md:mt-0">
            <button
              onClick={() => scroll("left")}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-elev/40 hover:bg-bg-elev hover:border-primary/45 transition-all text-text-muted hover:text-foreground animate-none"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-elev/40 hover:bg-bg-elev hover:border-primary/45 transition-all text-text-muted hover:text-foreground animate-none"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4"
          style={{ scrollbarWidth: "none" }}
        >
          {blogs.map((post) => (
            <div
              key={post.id}
              className="min-w-[300px] md:min-w-[380px] max-w-[380px] snap-start flex-shrink-0 group rounded-2xl border border-border bg-bg-elev/40 p-6 flex flex-col justify-between hover:border-primary/40 hover:shadow-[0_0_40px_-20px_rgba(190,242,100,0.15)] transition-all duration-300"
            >
              <div>
                {/* Visual card header */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-bg-soft mb-5">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-soft/40 via-bg-elev/60 to-bg-soft/40">
                      <BookOpen className="h-8 w-8 text-primary/20 group-hover:text-primary/45 transition-colors duration-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 font-mono text-[9px] uppercase tracking-wider bg-bg-elev/90 border border-border/60 text-text-muted px-2 py-0.5 rounded-sm flex items-center gap-1 backdrop-blur-sm">
                    <Clock className="h-2.5 w-2.5 text-primary" /> {post.slug.includes("pricing") ? "4" : post.slug.includes("sql") ? "5" : "7"} min read
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-text-muted/80 mb-3">
                  <Calendar className="h-3 w-3 text-primary/70" />
                  {formatDate(post.published_at || post.created_at)}
                </div>

                <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">
                  <Link to="/blog/$slug" params={{ slug: post.slug }}>
                    {post.title}
                  </Link>
                </h3>
                <div 
                  className="rich-text-content mt-3 text-xs text-text-muted leading-relaxed line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: post.excerpt }}
                />
              </div>

              <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between">
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-all duration-200 group-hover:gap-2"
                >
                  Read Article <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Landing() {
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "DevPulse",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "All",
    "description": "Stop merging bugs. Get severity-ranked AI code reviews, database indexes audits, and complete production safeguards in under 10 seconds.",
    "offers": {
      "@type": "Offer",
      "price": "999.00",
      "priceCurrency": "INR"
    }
  };

  return (
    <div className="min-h-screen">
      <script type="application/ld+json">
        {JSON.stringify(schemaMarkup)}
      </script>
      <AppNav />
      <Hero />
      <LogoTicker />
      <Features />
      <LiveDemo />
      <MailingShowcaseSection />
      <AboutSection1 />
      <ComparisonSection />
      <Pricing />
      <BlogCarouselSection />
      <CTA />
      <Footer />
    </div>
  );
}
