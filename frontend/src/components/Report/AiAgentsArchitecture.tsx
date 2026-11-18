import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Cpu,
  FileCode2,
  GitBranch,
  KeyRound,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { AI_AGENTS, AI_FILE_TREE, type AgentTier, type AiAgentSpec } from "./reportData";

const TIER_META: Record<
  AgentTier,
  { label: string; count: number; badge: string; color: string; sub: string }
> = {
  triage: {
    label: "Tier 1 · Triage Gatekeepers",
    count: 3,
    badge: "maxTokens: 5",
    color: "var(--sev-med)",
    sub: "TRIVIAL vs REVIEW · Cost Shield",
  },
  auditor: {
    label: "Tier 2 · Deep Specialist Auditors",
    count: 4,
    badge: "JSON Mode · 8k cap",
    color: "var(--accent)",
    sub: "Per-File & 10-File Chunk Scanners",
  },
  synthesizer: {
    label: "Tier 3 · Holistic Synthesizers",
    count: 3,
    badge: "Dedup + 0–100 Score",
    color: "var(--sev-ok)",
    sub: "Final Reports, Trees & Load Plans",
  },
};

const GROUP_COLORS = {
  core: "var(--accent)",
  gemini: "var(--sev-low)",
  openai: "var(--sev-ok)",
  prompt: "var(--sev-med)",
};

export function AiAgentsArchitecture() {
  const [selectedId, setSelectedId] = useState<string>(AI_AGENTS[3].id);
  const [filterTier, setFilterTier] = useState<AgentTier | "all">("all");

  const activeAgent: AiAgentSpec = AI_AGENTS.find((a) => a.id === selectedId) ?? AI_AGENTS[0];

  const triageAgents = AI_AGENTS.filter((a) => a.tier === "triage");
  const auditorAgents = AI_AGENTS.filter((a) => a.tier === "auditor");
  const synthAgents = AI_AGENTS.filter((a) => a.tier === "synthesizer");

  return (
    <section id="agents" className="scroll-mt-28 border-b border-border py-14">
      <div className="mx-auto max-w-[1240px] px-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              02 // Multi-Agent AI Topology
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tightest sm:text-3xl">
              10 Specialized AI Agents · 2 Mirror Providers · 24 Source Modules
            </h2>
          </div>

          {/* Tier Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "triage", "auditor", "synthesizer"] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition cursor-pointer ${
                  filterTier === tier
                    ? "border-primary/50 bg-primary/15 text-primary font-semibold"
                    : "border-border bg-bg-elev text-text-muted hover:text-foreground"
                }`}
              >
                {tier === "all" ? "All (10)" : `${tier} (${TIER_META[tier].count})`}
              </button>
            ))}
          </div>
        </div>

        {/* Orchestrator Master Hub Visual Bar */}
        <div className="mt-6 rounded-xl border border-primary/30 bg-bg-elev p-4">
          <div className="grid gap-3 lg:grid-cols-12 lg:items-center">
            {/* Orchestrator Node */}
            <div className="lg:col-span-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/[0.06] p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Cpu className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">Master Orchestrator</span>
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-primary">
                    1 HUB
                  </span>
                </div>
                <div className="truncate font-mono text-[10px] text-text-muted">
                  backend/src/backend/ai/orchestrator.ts
                </div>
              </div>
            </div>

            {/* Flow Arrows & Plan-Aware Failover Visual */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-border bg-bg-soft/70 p-2.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-text-faint uppercase">Free Plan</span>
                  <span className="text-sev-low font-semibold">Direct</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-sev-low shrink-0" />
                  <span>Gemini Only</span>
                </div>
              </div>
              <div className="rounded-lg border border-sev-ok/30 bg-sev-ok/[0.06] p-2.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-sev-ok uppercase font-semibold">Pro Plan</span>
                  <span className="text-sev-ok font-semibold">&lt;250ms</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                  <RefreshCw className="h-3.5 w-3.5 text-sev-ok shrink-0" />
                  <span>Gemini ↔ OpenAI</span>
                </div>
              </div>
            </div>

            {/* Key Vault & Settings */}
            <div className="lg:col-span-3 flex flex-col gap-1.5 font-mono text-[10px]">
              <div className="flex items-center justify-between rounded-md border border-border bg-bg-code px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 text-text-muted">
                  <KeyRound className="h-3 w-3 text-sev-med" /> system_ai_keys
                </span>
                <span className="text-foreground">Round-Robin 15s</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border bg-bg-code px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 text-text-muted">
                  <Shield className="h-3 w-3 text-primary" /> system_settings
                </span>
                <span className="text-foreground">Live Toggle 10s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Visual Split: 3-Tier Interactive Agent Graph (Left) + Agent Inspector (Right) */}
        <div className="mt-5 grid gap-5 lg:grid-cols-12">
          {/* Interactive 3-Tier Topology */}
          <div className="lg:col-span-8 space-y-4">
            {[
              { tier: "triage" as const, agents: triageAgents },
              { tier: "auditor" as const, agents: auditorAgents },
              { tier: "synthesizer" as const, agents: synthAgents },
            ]
              .filter((g) => filterTier === "all" || filterTier === g.tier)
              .map((group, groupIdx) => {
                const meta = TIER_META[group.tier];
                return (
                  <div key={group.tier} className="relative">
                    {/* Connector line from previous tier */}
                    {groupIdx > 0 && (
                      <div className="flex justify-center -mt-3 mb-1">
                        <div className="flex flex-col items-center">
                          <div className="h-3 w-px bg-border" />
                          <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-border bg-bg-elev/80 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {meta.label}
                          </span>
                          <span className="font-mono text-[10px] text-text-faint hidden sm:inline">
                            — {meta.sub}
                          </span>
                        </div>
                        <span
                          className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium"
                          style={{
                            color: meta.color,
                            backgroundColor: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                          }}
                        >
                          {meta.badge}
                        </span>
                      </div>

                      <div
                        className={`grid gap-2.5 ${
                          group.agents.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3"
                        }`}
                      >
                        {group.agents.map((agent) => {
                          const isSelected = agent.id === activeAgent.id;
                          return (
                            <button
                              key={agent.id}
                              onClick={() => setSelectedId(agent.id)}
                              className={`group relative rounded-lg border p-3 text-left transition cursor-pointer ${
                                isSelected
                                  ? "border-primary/60 bg-primary/[0.08]"
                                  : "border-border bg-bg-soft/40 hover:border-text-faint hover:bg-bg-soft/80"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className="font-mono text-[10px] font-semibold"
                                  style={{ color: meta.color }}
                                >
                                  {agent.code}
                                </span>
                                <span className="rounded border border-border bg-bg-code px-1.5 py-0.5 font-mono text-[9px] uppercase text-text-muted">
                                  {agent.scope}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-1.5 font-medium text-xs text-foreground">
                                <Bot className="h-3.5 w-3.5 shrink-0 text-text-muted group-hover:text-primary" />
                                <span className="truncate">{agent.name}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-text-faint">
                                <span>{agent.roleTag}</span>
                                <span className="text-sev-ok">2× LLM</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Clickable Agent Spec Inspector Card */}
          <div className="lg:col-span-4">
            <motion.div
              key={activeAgent.id}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="sticky top-28 rounded-xl border border-primary/40 bg-bg-elev p-4 space-y-4"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border-faint pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                      {activeAgent.code}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-text-faint">
                      {activeAgent.tier} tier
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-base font-semibold text-foreground">
                    {activeAgent.name}
                  </h3>
                  <div className="font-mono text-[10px] text-text-muted">{activeAgent.roleTag}</div>
                </div>
                <span className="rounded-md border border-border bg-bg-code px-2 py-1 font-mono text-[10px] text-primary">
                  {activeAgent.modelTier}
                </span>
              </div>

              {/* Exact File Paths */}
              <div className="space-y-1.5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                  Where It Lives (Exact Paths)
                </div>
                <div className="space-y-1 rounded-lg border border-border bg-bg-code p-2.5 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5 text-sev-low">
                    <span className="shrink-0 font-semibold">GEM:</span>
                    <span className="truncate">{activeAgent.geminiFile}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sev-ok">
                    <span className="shrink-0 font-semibold">OAI:</span>
                    <span className="truncate">{activeAgent.openaiFile}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sev-med">
                    <span className="shrink-0 font-semibold">PRM:</span>
                    <span className="truncate">{activeAgent.promptName}</span>
                  </div>
                </div>
              </div>

              {/* Execution Specs */}
              <div className="grid grid-cols-1 gap-2 font-mono text-[11px]">
                <div className="rounded-lg border border-border-faint bg-bg-soft/40 p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-text-faint">
                    Input Window
                  </div>
                  <div className="mt-0.5 text-foreground">{activeAgent.inputBudget}</div>
                </div>
                <div className="rounded-lg border border-border-faint bg-bg-soft/40 p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-text-faint">
                    Output Schema
                  </div>
                  <div className="mt-0.5 text-foreground">{activeAgent.outputContract}</div>
                </div>
                <div className="rounded-lg border border-border-faint bg-bg-soft/40 p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-text-faint">
                    Retry &amp; Resilience
                  </div>
                  <div className="mt-0.5 text-foreground">{activeAgent.retryPolicy}</div>
                </div>
              </div>

              {/* Evaluation Focus Chips */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-1.5">
                  Inspection Scope
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeAgent.axes.map((ax) => (
                    <span
                      key={ax}
                      className="rounded-full border border-border bg-bg-soft px-2 py-0.5 font-mono text-[10px] text-foreground"
                    >
                      {ax}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Where All 24 AI Files Live — Visual Directory Map */}
        <div className="mt-6 rounded-xl border border-border bg-bg-elev p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              backend/src/backend/ai/ — Live Agent Directory Map (24 Files)
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-text-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" /> Orchestrator (1)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sev-low" /> Gemini Runners (6)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sev-ok" /> OpenAI Mirrors (6)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sev-med" /> System Prompts (12)
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {AI_FILE_TREE.map((item) => (
              <div
                key={item.path}
                className="flex items-center justify-between gap-2 rounded-lg border border-border-faint bg-bg-code px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-foreground">
                    <FileCode2
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: GROUP_COLORS[item.group] }}
                    />
                    <span className="truncate">{item.path}</span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[10px] text-text-faint">
                    {item.role}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[9px] text-text-faint">{item.lines}L</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
