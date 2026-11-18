import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Minus, Pause, Play, Plus, RotateCcw, ShieldAlert } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { HealthScore } from "@/components/HealthScore";
import { SeverityBadge } from "@/components/SeverityBadge";
import {
  API_AUDIT_PILLARS,
  FOLDER_AUDIT_PILLARS,
  PR_PIPELINE_STAGES,
  REVIEW_AXES,
} from "./reportData";

type AxisMode = "pr" | "api" | "folder";

function getGrade(score: number) {
  if (score >= 95) return { grade: "A+", status: "Auto-Merge Safe", color: "var(--sev-ok)" };
  if (score >= 85) return { grade: "A", status: "Production Ready", color: "var(--sev-ok)" };
  if (score >= 70) return { grade: "B", status: "Peer Review OK", color: "var(--sev-med)" };
  if (score >= 50) return { grade: "C", status: "Refactor Needed", color: "var(--sev-high)" };
  if (score >= 30) return { grade: "D", status: "CI Gate Blocked", color: "var(--sev-high)" };
  return { grade: "F", status: "Critical Block", color: "var(--sev-crit)" };
}

export function PrReviewPipelineSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [axisMode, setAxisMode] = useState<AxisMode>("pr");

  // Interactive Health Score simulator state
  const [counts, setCounts] = useState({ crit: 1, high: 1, med: 2, low: 1 });

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % PR_PIPELINE_STAGES.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const stage = PR_PIPELINE_STAGES[activeIdx];
  const score = Math.max(
    0,
    Math.min(100, 100 - (counts.crit * 25 + counts.high * 15 + counts.med * 5 + counts.low * 2)),
  );
  const gradeInfo = getGrade(score);

  const radarData =
    axisMode === "pr"
      ? REVIEW_AXES.map((a) => ({ subject: a.axis, weight: a.weight, fullMark: 25 }))
      : axisMode === "api"
        ? API_AUDIT_PILLARS.map((a) => ({ subject: a.axis, weight: a.weight, fullMark: 40 }))
        : FOLDER_AUDIT_PILLARS.map((a) => ({ subject: a.axis, weight: a.weight, fullMark: 20 }));

  const bump = (key: keyof typeof counts, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(6, prev[key] + delta)),
    }));
  };

  return (
    <section id="pipeline" className="scroll-mt-28 border-b border-border py-14">
      <div className="mx-auto max-w-[1240px] px-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              03 // How AI Reviews PRs &amp; Code
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tightest sm:text-3xl">
              8-Stage PR Review Engine &amp; Multi-Axis Scoring
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoPlay((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 font-mono text-[11px] text-foreground transition hover:border-primary/50 cursor-pointer"
            >
              {autoPlay ? (
                <Pause className="h-3 w-3 text-primary" />
              ) : (
                <Play className="h-3 w-3 text-primary" />
              )}
              {autoPlay ? "Live Flow" : "Paused"}
            </button>
            <button
              onClick={() => setActiveIdx(0)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-elev px-2.5 py-1.5 font-mono text-[11px] text-text-muted hover:text-foreground cursor-pointer"
              title="Reset to Stage 01"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Interactive 8-Stage Horizontal Pipeline Track */}
        <div className="mt-6 rounded-xl border border-border bg-bg-elev p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {PR_PIPELINE_STAGES.map((s, idx) => {
              const isCurrent = idx === activeIdx;
              const isPassed = idx < activeIdx;
              return (
                <button
                  key={s.step}
                  onClick={() => {
                    setAutoPlay(false);
                    setActiveIdx(idx);
                  }}
                  className={`relative flex flex-col items-start rounded-lg border p-2.5 text-left transition cursor-pointer ${
                    isCurrent
                      ? "border-primary/70 bg-primary/[0.10]"
                      : isPassed
                        ? "border-border bg-bg-soft/60"
                        : "border-border-faint bg-bg-code/50 hover:border-border"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className="font-mono text-[10px] font-semibold"
                      style={{ color: isCurrent ? "var(--accent)" : s.colorVar }}
                    >
                      {s.step}
                    </span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isCurrent ? "dp-pulse" : ""}`}
                      style={{
                        backgroundColor: isCurrent
                          ? "var(--accent)"
                          : isPassed
                            ? "var(--sev-ok)"
                            : "var(--border)",
                      }}
                    />
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] font-medium text-foreground leading-tight">
                    {s.shortLabel}
                  </div>
                  <div className="mt-1 truncate w-full font-mono text-[9px] text-text-faint">
                    {s.metric}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress Rail */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-bg-soft">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${((activeIdx + 1) / PR_PIPELINE_STAGES.length) * 100}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>

          {/* Active Stage Visual Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-4 grid gap-3 rounded-lg border border-border-faint bg-bg-soft/40 p-4 lg:grid-cols-12"
            >
              <div className="lg:col-span-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${stage.colorVar} 18%, transparent)`,
                        color: stage.colorVar,
                      }}
                    >
                      STAGE {stage.step}
                    </span>
                    <span className="font-mono text-[10px] text-text-muted">{stage.metric}</span>
                  </div>
                  <h3 className="mt-1.5 text-base font-semibold text-foreground">{stage.title}</h3>
                </div>
                <div className="mt-2 font-mono text-[10px] text-text-faint">
                  {stage.module} → <span className="text-primary">{stage.fn}</span>
                </div>
              </div>

              {/* Input -> Output Transform Box */}
              <div className="lg:col-span-4 flex items-center gap-2 rounded-lg border border-border bg-bg-code p-3 font-mono text-[11px]">
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase text-text-faint">In</div>
                  <div className="mt-0.5 text-text-muted truncate" title={stage.input}>
                    {stage.input}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase text-text-faint">Out</div>
                  <div className="mt-0.5 text-foreground truncate" title={stage.output}>
                    {stage.output}
                  </div>
                </div>
              </div>

              {/* Guardrails & Mechanics Chips */}
              <div className="lg:col-span-4 flex flex-wrap content-center gap-1.5">
                {stage.guards.map((g) => (
                  <span
                    key={g}
                    className="rounded-md border border-border bg-bg-elev px-2 py-1 font-mono text-[10px] text-foreground"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Split: Scope Coverage Radar (Left) + Live Health Score Simulator (Right) */}
        <div className="mt-6 grid gap-5 lg:grid-cols-12">
          {/* Radar + Scope Axis Matrix */}
          <div className="lg:col-span-7 rounded-xl border border-border bg-bg-elev p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                  Inspection Coverage &amp; Weights
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Audit Dimensions by Scope
                </h3>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-soft p-0.5 font-mono text-[10px]">
                {(
                  [
                    { id: "pr", label: "PR / Codebase (6)" },
                    { id: "api", label: "API / DB (3)" },
                    { id: "folder", label: "Folder (8)" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAxisMode(tab.id)}
                    className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                      axisMode === tab.id
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-12 items-center">
              <div className="sm:col-span-6 h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{
                        fill: "var(--text-muted)",
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-elev)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <Radar
                      name="Weight"
                      dataKey="weight"
                      stroke="var(--accent)"
                      fill="var(--accent)"
                      fillOpacity={0.22}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="sm:col-span-6 space-y-2">
                {axisMode === "pr" &&
                  REVIEW_AXES.map((item) => (
                    <div
                      key={item.axis}
                      className="rounded-lg border border-border-faint bg-bg-soft/40 p-2.5"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-semibold text-foreground">{item.axis}</span>
                        <span style={{ color: item.color }}>w={item.weight}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.checks.map((c) => (
                          <span
                            key={c}
                            className="rounded bg-bg-code px-1.5 py-0.5 font-mono text-[9px] text-text-muted"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                {axisMode === "api" &&
                  API_AUDIT_PILLARS.map((item) => (
                    <div
                      key={item.axis}
                      className="rounded-lg border border-border-faint bg-bg-soft/40 p-3"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-semibold text-foreground">{item.axis}</span>
                        <span style={{ color: item.color }}>{item.weight}%</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.checks.map((c) => (
                          <span
                            key={c}
                            className="rounded bg-bg-code px-1.5 py-0.5 font-mono text-[9px] text-text-muted"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                {axisMode === "folder" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {FOLDER_AUDIT_PILLARS.map((item) => (
                      <div
                        key={item.axis}
                        className="rounded-lg border border-border-faint bg-bg-soft/40 px-2.5 py-2 font-mono text-[10px]"
                      >
                        <div className="text-foreground font-medium truncate">{item.axis}</div>
                        <div className="mt-1 h-1 w-full rounded-full bg-bg-code overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${item.weight * 4.5}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Health Score Simulator */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-border bg-bg-elev p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                  Interactive Scoring Model
                </div>
                <h3 className="text-base font-semibold text-foreground">Health Score Calculator</h3>
              </div>
              <span
                className="rounded-md px-2.5 py-1 font-mono text-xs font-bold"
                style={{
                  color: gradeInfo.color,
                  backgroundColor: `color-mix(in oklab, ${gradeInfo.color} 15%, transparent)`,
                }}
              >
                Grade {gradeInfo.grade}
              </span>
            </div>

            <div className="my-4 flex items-center justify-around gap-4 rounded-xl border border-border-faint bg-bg-code p-4">
              <HealthScore value={score} size={126} />
              <div className="space-y-2 font-mono text-xs">
                <div
                  className="flex items-center gap-1.5 text-[11px]"
                  style={{ color: gradeInfo.color }}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {gradeInfo.status}
                </div>
                <div className="text-[10px] text-text-faint">
                  Formula: max(0, 100 − Σ penalties)
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <span className="rounded bg-bg-soft px-2 py-1 text-text-muted">A+: 95–100</span>
                  <span className="rounded bg-bg-soft px-2 py-1 text-text-muted">A: 85–94</span>
                  <span className="rounded bg-bg-soft px-2 py-1 text-text-muted">B: 70–84</span>
                  <span className="rounded bg-bg-soft px-2 py-1 text-text-muted">C–F: &lt;70</span>
                </div>
              </div>
            </div>

            {/* Interactive Penalty Steppers */}
            <div className="space-y-2">
              {(
                [
                  { key: "crit", label: "Critical", penalty: "-25" },
                  { key: "high", label: "High", penalty: "-15" },
                  { key: "med", label: "Medium", penalty: "-5" },
                  { key: "low", label: "Low", penalty: "-2" },
                ] as const
              ).map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between rounded-lg border border-border-faint bg-bg-soft/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <SeverityBadge level={row.key} />
                    <span className="font-mono text-xs text-foreground">{row.label}</span>
                    <span className="font-mono text-[10px] text-text-faint">
                      ({row.penalty} pts)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => bump(row.key, -1)}
                      className="grid h-6 w-6 place-items-center rounded border border-border bg-bg-elev text-text-muted hover:text-foreground cursor-pointer"
                      aria-label={`Decrease ${row.label}`}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-mono text-xs font-semibold tabular-nums text-foreground">
                      {counts[row.key]}
                    </span>
                    <button
                      onClick={() => bump(row.key, 1)}
                      className="grid h-6 w-6 place-items-center rounded border border-border bg-bg-elev text-text-muted hover:text-foreground cursor-pointer"
                      aria-label={`Increase ${row.label}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
