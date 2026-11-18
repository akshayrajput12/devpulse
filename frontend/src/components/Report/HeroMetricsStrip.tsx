import { motion } from "framer-motion";
import {
  Activity,
  BookOpen,
  Bot,
  Cpu,
  Database,
  Layers,
  Palette,
  Printer,
  Sparkles,
  Workflow,
} from "lucide-react";

export type ReportViewMode = "simple" | "technical";

const SIMPLE_NAV = [
  { id: "scope", label: "How It Works", icon: Sparkles },
  { id: "agents", label: "10 AI Helpers", icon: Bot },
  { id: "glossary", label: "Term Dictionary", icon: BookOpen },
  { id: "pipeline", label: "Live Simulator", icon: Workflow },
  { id: "dfd", label: "Data Flow Map", icon: Activity },
  { id: "design-system", label: "Colors & Style", icon: Palette },
];

const TECH_NAV = [
  { id: "scope", label: "Scope", icon: Layers },
  { id: "agents", label: "AI Agents", icon: Bot },
  { id: "pipeline", label: "PR & Code Flow", icon: Workflow },
  { id: "system-design", label: "System Design", icon: Cpu },
  { id: "dfd", label: "Data Flow (DFD)", icon: Activity },
  { id: "data-api", label: "Data & API", icon: Database },
  { id: "design-system", label: "Design System", icon: Palette },
];

const SUMMARY_KPIS = [
  {
    value: "4",
    unit: "AUDIT MODES",
    label: "PR · Folder · Whole App · API/DB",
    color: "var(--accent)",
  },
  {
    value: "10",
    unit: "AI AGENTS",
    label: "3 Gatekeepers · 4 Auditors · 3 Teachers",
    color: "var(--sev-ok)",
  },
  {
    value: "2×",
    unit: "AI BRAINS",
    label: "Gemini Primary + OpenAI Auto-Backup",
    color: "var(--sev-low)",
  },
  {
    value: "17",
    unit: "SECURE TABLES",
    label: "100% Locked RLS Database + Live Updates",
    color: "var(--sev-high)",
  },
];

export function HeroMetricsStrip({
  activeSection,
  mode,
  onModeChange,
}: {
  activeSection: string;
  mode: ReportViewMode;
  onModeChange: (m: ReportViewMode) => void;
}) {
  const navItems = mode === "simple" ? SIMPLE_NAV : TECH_NAV;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-border pt-10 pb-10 print:pt-4">
        <div className="dp-grid-bg pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-[1240px] px-6">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary dp-pulse" />
                  DEVPULSE ARCHITECTURE · V2.4
                </span>
                <span className="rounded-full border border-border bg-bg-elev px-2.5 py-0.5 font-mono text-[10px] text-text-muted">
                  Visual Project Blueprint
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tightest sm:text-5xl">
                How <span className="text-primary">DevPulse</span> Reviews &amp; Fixes Code
              </h1>

              <p className="text-sm sm:text-base text-text-muted leading-relaxed">
                {mode === "simple"
                  ? "A clean, visual, jargon-free guide showing what DevPulse does, how its 10 AI helpers work together, and how your code stays safe."
                  : "Complete codebase-verified engineering specification: 4 audit scopes, 10 AI agents across 2 providers, 8-stage chunked pipeline, DFD Level 0–2, 17 RLS tables, and live design system."}
              </p>
            </div>

            {/* Clean Mode Switch + Print */}
            <div className="flex flex-wrap items-center gap-2.5 print:hidden">
              <div className="inline-flex rounded-xl border border-border bg-bg-elev p-1 font-mono text-xs">
                <button
                  onClick={() => onModeChange("simple")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition cursor-pointer ${
                    mode === "simple"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-text-muted hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Simple Guide
                </button>
                <button
                  onClick={() => onModeChange("technical")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition cursor-pointer ${
                    mode === "technical"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-text-muted hover:text-foreground"
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  Engineer View
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg-elev px-3.5 py-2.5 font-mono text-xs font-medium text-foreground transition hover:border-primary/50 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-primary" />
                Print / PDF
              </button>
            </div>
          </div>

          {/* Clean 4-Card KPI Strip (Uncluttered & Spacious) */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {SUMMARY_KPIS.map((kpi, idx) => (
              <motion.div
                key={kpi.unit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.35 }}
                className="relative overflow-hidden rounded-2xl border border-border bg-bg-elev/90 p-5"
              >
                <div
                  className="absolute inset-x-0 top-0 h-[2px]"
                  style={{ backgroundColor: kpi.color }}
                />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                    {kpi.value}
                  </span>
                  <span
                    className="font-mono text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: kpi.color }}
                  >
                    {kpi.unit}
                  </span>
                </div>
                <div className="mt-2 text-xs text-text-muted leading-snug">{kpi.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky Section Navigator */}
      <div className="sticky top-14 z-30 border-b border-border bg-bg/90 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-[1240px] items-center gap-1.5 overflow-x-auto px-6 py-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-[11px] transition cursor-pointer ${
                  isActive
                    ? "border-primary/50 bg-primary/15 text-primary font-medium"
                    : "border-transparent bg-transparent text-text-muted hover:border-border hover:bg-bg-elev hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
