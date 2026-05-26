import { useState, useEffect, useRef } from "react";

export type LogStep = {
  id: string;
  label: string;
  detail?: string;
  status: "pending" | "active" | "done" | "error";
  startedAt?: number;
  finishedAt?: number;
};

// ─── Live elapsed timer ───────────────────────────────────────────────────────

function useElapsed(step: LogStep): string {
  const [tick, setTick] = useState(0);
  const isActive = step.status === "active";

  useEffect(() => {
    if (!isActive || !step.startedAt) return;
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [isActive, step.startedAt]);

  if (!step.startedAt) return "";
  const end = step.finishedAt ?? Date.now();
  const ms = end - step.startedAt;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function prefix(status: LogStep["status"]) {
  if (status === "done") return "✓";
  if (status === "error") return "✗";
  if (status === "active") return "▶";
  return "○";
}

// ─── Single log line ──────────────────────────────────────────────────────────

function LogLine({ step, index }: { step: LogStep; index: number }) {
  const elapsed = useElapsed(step);
  const [open, setOpen] = useState(false);
  const hasDetail = !!step.detail && step.status !== "active";

  const ts = step.startedAt
    ? new Date(step.startedAt).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  const isActive = step.status === "active";
  const isDone = step.status === "done";
  const isError = step.status === "error";
  const isPending = step.status === "pending";

  return (
    <div
      className={`border-l-2 transition-colors ${
        isActive ? "border-primary" : isDone ? "border-sev-ok/30" : isError ? "border-sev-crit/30" : "border-transparent"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-2 transition-colors ${
          isActive ? "bg-primary/5" : ""
        } ${hasDetail ? "cursor-pointer hover:bg-bg-soft/30" : ""}`}
        onClick={() => hasDetail && setOpen(o => !o)}
      >
        {/* Step index */}
        <span className="shrink-0 font-mono text-[10px] text-text-faint tabular-nums w-4 text-right">
          {index + 1}
        </span>

        {/* Status icon */}
        <span
          className={`shrink-0 w-3 text-center font-mono text-[11px] ${
            isActive
              ? "text-primary animate-pulse"
              : isDone
              ? "text-sev-ok"
              : isError
              ? "text-sev-crit"
              : "text-text-faint/40"
          }`}
        >
          {prefix(step.status)}
        </span>

        {/* Label */}
        <span
          className={`flex-1 font-mono text-[11px] leading-snug ${
            isActive
              ? "text-primary font-medium"
              : isDone
              ? "text-sev-ok/80"
              : isError
              ? "text-sev-crit"
              : "text-text-faint/50"
          }`}
        >
          {step.label}
          {isActive && (
            <span className="ml-1 text-primary/50 text-[10px]">…</span>
          )}
        </span>

        {/* Timestamp */}
        {ts && (
          <span className="shrink-0 font-mono text-[10px] text-text-faint/50 tabular-nums">
            {ts}
          </span>
        )}

        {/* Elapsed */}
        {step.startedAt && (
          <span
            className={`shrink-0 font-mono text-[10px] tabular-nums w-14 text-right ${
              isActive ? "text-primary/60" : "text-text-faint/50"
            }`}
          >
            {elapsed}
          </span>
        )}
      </div>

      {/* Active step sub-detail */}
      {isActive && step.detail && (
        <div className="px-4 pb-2 pl-11 font-mono text-[10px] text-primary/50">
          {step.detail}
        </div>
      )}

      {/* Expandable detail for settled steps */}
      {open && step.detail && (
        <div className="px-4 pb-2 pl-11 border-l border-border-faint ml-4">
          <span className="font-mono text-[10px] text-text-faint whitespace-pre-wrap leading-relaxed">
            {step.detail}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnimatedLog({
  steps,
  title = "DevPulse",
}: {
  steps: LogStep[];
  title?: string;
}) {
  const activeCount = steps.filter(s => s.status === "active").length;
  const doneCount = steps.filter(s => s.status === "done").length;
  const errorCount = steps.filter(s => s.status === "error").length;
  const total = steps.length;
  const allSettled = total > 0 && doneCount + errorCount === total;
  const isRunning = activeCount > 0;

  // Progress percentage (done + error steps / total)
  const pct = total > 0 ? Math.round(((doneCount + errorCount) / total) * 100) : 0;

  // Track total elapsed since first step started
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, [isRunning]);

  const firstStart = steps.find(s => s.startedAt)?.startedAt;
  const lastEnd = allSettled ? Math.max(...steps.map(s => s.finishedAt ?? 0)) : undefined;
  const totalMs = firstStart ? (lastEnd ?? Date.now()) - firstStart : 0;
  const totalElapsed = totalMs < 1000 ? `${totalMs}ms` : `${(totalMs / 1000).toFixed(1)}s`;

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-bg-elev shadow-lg">

      {/* ── Title bar ── */}
      <div className="flex items-center gap-2.5 border-b border-border bg-bg-soft/50 px-4 py-2.5">
        {/* Traffic lights */}
        <div className="flex gap-1.5 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>

        {/* Live pulse when running */}
        {isRunning && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
        )}

        {/* Title */}
        <span className="flex-1 text-center font-mono text-[11px] text-text-faint truncate px-2">
          {title}
        </span>

        {/* Status badge */}
        <span className="shrink-0 font-mono text-[10px] text-text-faint tabular-nums">
          {allSettled
            ? errorCount > 0 ? "exited 1" : "exited 0"
            : isRunning ? "running…" : "queued"}
          {" · "}{doneCount}/{total}
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-0.5 bg-border-faint relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary/70 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* ── Log lines ── */}
      <div className="py-1 bg-bg-code/20">
        {steps.length === 0 ? (
          <div className="px-4 py-4 flex items-center gap-2.5 font-mono text-[11px] text-text-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-border animate-pulse" />
            Waiting for job to start…
          </div>
        ) : (
          steps.map((step, i) => <LogLine key={step.id} step={step} index={i} />)
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="border-t border-border bg-bg-soft/30 px-4 py-1.5 flex items-center gap-3 font-mono text-[10px]">
        {isRunning && (
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            running
          </span>
        )}
        {allSettled && errorCount === 0 && (
          <span className="flex items-center gap-1.5 text-sev-ok">
            <span className="h-1.5 w-1.5 rounded-full bg-sev-ok" />
            completed
          </span>
        )}
        {allSettled && errorCount > 0 && (
          <span className="flex items-center gap-1.5 text-sev-crit">
            <span className="h-1.5 w-1.5 rounded-full bg-sev-crit" />
            failed
          </span>
        )}
        {!allSettled && !isRunning && steps.length > 0 && (
          <span className="flex items-center gap-1.5 text-text-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
            queued
          </span>
        )}
        {firstStart && (
          <span className="text-text-faint/60">{totalElapsed} elapsed</span>
        )}
        <span className="ml-auto text-text-faint/50">devpulse ai</span>
      </div>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function mergeStep(steps: LogStep[], update: Partial<LogStep> & { id: string }): LogStep[] {
  const idx = steps.findIndex(s => s.id === update.id);
  if (idx === -1) {
    return [...steps, { label: update.id, status: "pending", ...update } as LogStep];
  }
  return steps.map((s, i) => (i === idx ? { ...s, ...update } : s));
}
