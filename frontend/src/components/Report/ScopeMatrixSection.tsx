import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Code2,
  FolderTree,
  GitPullRequest,
  Server,
  Zap,
} from "lucide-react";
import { AUDIT_SCOPES, SUBSYSTEMS, type ScopeId } from "./reportData";

const SCOPE_ICONS: Record<ScopeId, typeof GitPullRequest> = {
  pr: GitPullRequest,
  folder: FolderTree,
  codebase: Code2,
  api: Server,
};

const LAYER_COLORS: Record<string, string> = {
  Client: "var(--sev-low)",
  API: "var(--sev-med)",
  Queue: "var(--sev-high)",
  AI: "var(--accent)",
  Data: "var(--sev-ok)",
  Billing: "var(--sev-crit)",
};

export function ScopeMatrixSection() {
  const [selectedScope, setSelectedScope] = useState<ScopeId>("pr");
  const active = AUDIT_SCOPES.find((s) => s.id === selectedScope) ?? AUDIT_SCOPES[0];

  return (
    <section id="scope" className="scroll-mt-28 border-b border-border py-14">
      <div className="mx-auto max-w-[1240px] px-6">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              01 // Project Scope &amp; Boundaries
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tightest sm:text-3xl">
              4 AI Audit Scopes &amp; 8 Core Subsystems
            </h2>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
            <span className="rounded-md border border-border bg-bg-elev px-2.5 py-1">
              Free: <strong className="text-foreground">10 cr/mo</strong>
            </span>
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
              Pro: <strong>150 cr/mo · ₹999</strong>
            </span>
          </div>
        </div>

        {/* 4 Interactive Scope Selector Cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIT_SCOPES.map((scope) => {
            const Icon = SCOPE_ICONS[scope.id];
            const isSelected = scope.id === selectedScope;
            return (
              <button
                key={scope.id}
                onClick={() => setSelectedScope(scope.id)}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition cursor-pointer ${
                  isSelected
                    ? "border-primary/60 bg-bg-elev shadow-lg"
                    : "border-border bg-bg-elev/60 hover:border-border hover:bg-bg-elev"
                }`}
              >
                <div
                  className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl transition-opacity"
                  style={{
                    backgroundColor: scope.accentVar,
                    opacity: isSelected ? 1 : 0.35,
                  }}
                />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                      {scope.code}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-400">
                      <Zap className="h-2.5 w-2.5" />
                      {scope.credits} cr
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    <div
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-bg-soft"
                      style={{ color: scope.accentVar }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="font-semibold text-sm text-foreground leading-tight">
                      {scope.name}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border-faint pt-2.5 font-mono text-[10px] text-text-muted">
                  <span>{scope.agentsUsed.length} Agents</span>
                  <span style={{ color: scope.accentVar }}>{scope.axesLabel}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Scope Visual Flow Inspector */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-4 rounded-xl border border-border bg-bg-elev p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-faint pb-3.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className="rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase"
                  style={{
                    backgroundColor: "var(--accent-soft)",
                    color: active.accentVar,
                  }}
                >
                  {active.reviewType}
                </span>
                <span className="font-mono text-xs text-text-muted">{active.entryFile}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="rounded-md border border-border bg-bg-soft px-2 py-0.5 text-text-muted">
                  Input: <strong className="text-foreground">{active.maxInputs}</strong>
                </span>
                <span className="rounded-md border border-border bg-bg-soft px-2 py-0.5 text-text-muted">
                  Budget: <strong className="text-foreground">{active.contextCap}</strong>
                </span>
              </div>
            </div>

            {/* Visual Stage Chain */}
            <div className="mt-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-2.5">
                Execution Chain ({active.stages.length} Steps)
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {active.stages.map((stage, idx) => (
                  <div key={stage} className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-soft/70 px-2.5 py-1.5 font-mono text-[11px]">
                      <span className="font-semibold" style={{ color: active.accentVar }}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-foreground">{stage}</span>
                    </div>
                    {idx < active.stages.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 text-text-faint shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Agents & Outputs Split */}
            <div className="mt-4 grid gap-3 border-t border-border-faint pt-4 md:grid-cols-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-2">
                  Active AI Agents
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {active.agentsUsed.map((agent) => (
                    <span
                      key={agent}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-medium text-primary"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-2">
                  Structured Deliverables
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {active.outputs.map((out) => (
                    <span
                      key={out}
                      className="rounded-md border border-border bg-bg-code px-2.5 py-1 font-mono text-[11px] text-text-muted"
                    >
                      {out}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 8 Subsystems Compact Bento Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
              8 Modular Subsystems (IEEE 29148 Functional Decomposition)
            </span>
            <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] text-text-faint">
              {Object.entries(LAYER_COLORS).map(([layer, color]) => (
                <span key={layer} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {layer}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SUBSYSTEMS.map((sub) => (
              <div
                key={sub.id}
                className="rounded-xl border border-border bg-bg-elev/80 p-3.5 transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-text-faint">
                    {sub.id}
                  </span>
                  <span
                    className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase"
                    style={{
                      color: LAYER_COLORS[sub.layer],
                      backgroundColor: `color-mix(in oklab, ${LAYER_COLORS[sub.layer]} 14%, transparent)`,
                    }}
                  >
                    {sub.layer}
                  </span>
                </div>
                <div className="mt-1.5 text-sm font-semibold text-foreground">{sub.name}</div>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {sub.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded border border-border-faint bg-bg-soft/60 px-1.5 py-0.5 font-mono text-[10px] text-text-muted"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scope Guardrails Strip (Will Do vs Will Not Do) */}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sev-ok/25 bg-sev-ok/[0.04] px-4 py-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-sev-ok mr-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> In Scope
            </span>
            {[
              "Real-Time PR Webhooks",
              "OWASP + N+1 Detection",
              "0–100 Health Score",
              "1-Click Git Patching",
              "Folder Migration Trees",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-sev-ok/25 bg-bg-elev px-2 py-0.5 font-mono text-[10px] text-foreground"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sev-crit/25 bg-sev-crit/[0.04] px-4 py-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-sev-crit mr-1">
              <Ban className="h-3.5 w-3.5" /> Hard Guardrails
            </span>
            {[
              "No Arbitrary Code Execution",
              "Zero Disk Source Retention",
              "No Public LLM Training",
              "No Client Service-Role Keys",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-sev-crit/25 bg-bg-elev px-2 py-0.5 font-mono text-[10px] text-text-muted"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
