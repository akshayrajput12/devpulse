import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Code2,
  FolderTree,
  GitPullRequest,
  HelpCircle,
  RefreshCw,
  Server,
  Sparkles,
  Wrench,
} from "lucide-react";

const SIMPLE_STEPS = [
  {
    num: "01",
    title: "Share Your Code",
    desc: "Paste any GitHub link (or let GitHub notify us automatically when you open a Pull Request).",
    analogy: "Like handing in your homework.",
    color: "var(--sev-low)",
  },
  {
    num: "02",
    title: "10 AI Helpers Inspect It",
    desc: "We skip junk files, cut big code into bite-sized pieces, and run specialist AI detectives.",
    analogy: "Like 10 expert teachers checking math, spelling & neatness together.",
    color: "var(--accent)",
  },
  {
    num: "03",
    title: "Score + 1-Click Fix",
    desc: "Get a fair 0–100 Health Score, clear bug explanations, and a button that commits the fix for you.",
    analogy: "Like getting your grade plus the corrected answer ready to paste.",
    color: "var(--sev-ok)",
  },
];

const SIMPLE_SCOPES = [
  {
    icon: GitPullRequest,
    title: "Pull Request Check",
    credits: "1 credit",
    who: "Checks only the new code you just changed",
    how: "3 AI helpers check security, bugs & speed in ~15 seconds.",
    color: "var(--accent)",
  },
  {
    icon: FolderTree,
    title: "Folder Tidy Check",
    credits: "2 credits",
    who: "Checks if your folders & files are neatly organized",
    how: "2 AI helpers grade your layout (A–F) and draw the ideal folder tree.",
    color: "var(--sev-low)",
  },
  {
    icon: Code2,
    title: "Full Codebase Audit",
    credits: "3 credits",
    who: "Scans your whole app (up to 80 files) in safe chunks",
    how: "3 AI helpers inspect 8 files at a time so big apps never crash.",
    color: "var(--sev-high)",
  },
  {
    icon: Server,
    title: "API & Database Speed Check",
    credits: "3 credits",
    who: "Hunts for slow database queries, locks & API leaks",
    how: "2 AI helpers check backend files + create 3 traffic stress-test plans.",
    color: "var(--sev-ok)",
  },
];

const AGENT_TEAMS = [
  {
    count: "3",
    role: "Gatekeepers",
    techName: "Triage Agents",
    color: "var(--sev-med)",
    plain:
      "Quickly glance at files and skip boring ones (like images or lockfiles) so we save time and money.",
    example: "PR Triage · Folder Triage · Codebase Triage",
  },
  {
    count: "4",
    role: "Specialist Detectives",
    techName: "Deep Auditor Agents",
    color: "var(--accent)",
    plain:
      "Read the real code in small chunks to spot security holes, slow queries, crashes, and messy folders.",
    example: "PR Auditor · Codebase Auditor · API/DB Auditor · Folder Architect",
  },
  {
    count: "3",
    role: "Final Report Teachers",
    techName: "Synthesizer Agents",
    color: "var(--sev-ok)",
    plain:
      "Remove duplicate notes, calculate a fair 0–100 Health Score, and write clear step-by-step fixes.",
    example: "PR Synthesizer · Codebase Synthesizer · API Load Synthesizer",
  },
];

const GLOSSARY_TERMS = [
  {
    term: "Triage",
    category: "AI",
    meaning:
      "A super-fast first check that decides which files matter and skips boring ones (like images or spacing edits).",
    analogy:
      "Like a hospital nurse checking who needs a doctor right away vs. who is totally fine.",
  },
  {
    term: "Pull Request (PR)",
    category: "Code",
    meaning:
      "A bundle of code changes a developer wants to add to a project before making it live.",
    analogy: "Like asking a teammate to proofread your essay before turning it in.",
  },
  {
    term: "AI Agent",
    category: "AI",
    meaning:
      "An AI helper given one focused job and strict rules — such as hunting security bugs or checking folders.",
    analogy:
      "Instead of one person doing everything, you have a security guard, a speed coach, and an architect.",
  },
  {
    term: "Orchestrator",
    category: "AI",
    meaning:
      "The smart manager in the middle that picks which AI helper to call and switches to backup if busy.",
    analogy: "Like an air-traffic controller guiding every plane safely to the right runway.",
  },
  {
    term: "Chunking (Phase Audit)",
    category: "System",
    meaning:
      "Splitting a huge project into small batches (up to 8 files each) so the AI never gets overloaded.",
    analogy:
      "Like reading a 500-page book one short chapter at a time instead of memorizing it in one gulp.",
  },
  {
    term: "Auto-Failover",
    category: "System",
    meaning:
      "If Google Gemini is busy or hits a limit, DevPulse switches to OpenAI in under 0.25 seconds automatically.",
    analogy:
      "Like a twin-engine airplane: if engine 1 slows down, engine 2 keeps you flying smoothly.",
  },
  {
    term: "Health Score (0–100)",
    category: "Code",
    meaning:
      "A fair report card for your code. Starts at 100 and subtracts points per issue (-25 Critical, -15 High, -5 Med, -2 Low).",
    analogy: "Failed or running scans show no score — only finished reviews get graded!",
  },
  {
    term: "1-Click Fix",
    category: "Code",
    meaning:
      "A button that takes the AI's corrected code and commits it straight onto your GitHub branch for you.",
    analogy: "Like Spellcheck's 'Fix All' button, except for real software bugs.",
  },
  {
    term: "Queue & Worker",
    category: "System",
    meaning:
      "A fair waiting line that handles heavy AI scans in the background so the website stays fast.",
    analogy:
      "Like a coffee shop order ticket — you don't freeze at the counter while your drink is made.",
  },
  {
    term: "Webhook",
    category: "System",
    meaning:
      "An automatic signal GitHub sends to DevPulse the instant a developer opens or updates a Pull Request.",
    analogy: "Like a smart doorbell that rings automatically when a package arrives.",
  },
  {
    term: "RLS (Row-Level Security)",
    category: "Security",
    meaning:
      "A database lock built right into PostgreSQL so every user can ONLY see their own private reviews.",
    analogy: "Like having an individual locker with your own key inside a giant vault.",
  },
  {
    term: "DFD (Data Flow Diagram)",
    category: "System",
    meaning:
      "A simple visual map showing where your data starts, which steps process it, and where it gets saved.",
    analogy: "Like a subway map showing every station from start to finish.",
  },
];

export function SimpleGuideSection() {
  const [glossaryFilter, setGlossaryFilter] = useState<
    "All" | "AI" | "Code" | "System" | "Security"
  >("All");

  const visibleTerms =
    glossaryFilter === "All"
      ? GLOSSARY_TERMS
      : GLOSSARY_TERMS.filter((t) => t.category === glossaryFilter);

  return (
    <div className="space-y-0">
      {/* 1. 3-Step Visual Story */}
      <section id="scope" className="scroll-mt-28 border-b border-border py-14">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              01 // How DevPulse Works (In 10 Seconds)
            </span>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tightest sm:text-3xl">
              From GitHub Code to Ready-to-Merge Fix in 3 Simple Steps
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {SIMPLE_STEPS.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="relative flex flex-col justify-between rounded-2xl border border-border bg-bg-elev p-6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-lg px-2.5 py-1 font-mono text-xs font-bold"
                      style={{
                        color: step.color,
                        backgroundColor: `color-mix(in oklab, ${step.color} 14%, transparent)`,
                      }}
                    >
                      STEP {step.num}
                    </span>
                    {idx < 2 && <ArrowRight className="hidden h-4 w-4 text-text-faint md:block" />}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{step.desc}</p>
                </div>
                <div className="mt-5 rounded-lg border border-border-faint bg-bg-soft/60 px-3 py-2 text-xs text-foreground">
                  <span className="font-semibold text-primary">Simple analogy:</span> {step.analogy}
                </div>
              </motion.div>
            ))}
          </div>

          {/* 4 Audit Scopes — Clean Non-Tech Cards */}
          <div className="mt-12">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  4 Ways DevPulse Audits Your Project
                </h3>
                <p className="text-xs text-text-muted">
                  Pick a quick PR check or a deep whole-repository audit.
                </p>
              </div>
              <span className="font-mono text-xs text-text-muted">
                Free: <strong className="text-foreground">10 credits/mo</strong> · Pro:{" "}
                <strong className="text-primary">150 credits/mo (₹999)</strong>
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SIMPLE_SCOPES.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-bg-elev p-5 transition hover:border-primary/40"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div
                          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-bg-soft"
                          style={{ color: s.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-orange-400">
                          {s.credits}
                        </span>
                      </div>
                      <h4 className="mt-4 text-base font-semibold text-foreground">{s.title}</h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{s.who}</p>
                    </div>
                    <div className="mt-4 border-t border-border-faint pt-3 text-[11px] text-text-faint">
                      {s.how}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Meet the 10 AI Agents (Kid-Friendly Visual Breakdown) */}
      <section id="agents" className="scroll-mt-28 border-b border-border py-14">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                02 // Meet the 10 AI Agents
              </span>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-tightest sm:text-3xl">
                10 Focused AI Helpers Working Like an Assembly Line
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Instead of asking one overloaded AI to do everything, DevPulse splits the job across{" "}
                <strong className="text-foreground">10 specialist agents</strong> in 3 clean stages
                — backed by{" "}
                <strong className="text-foreground">
                  2 AI brains (Google Gemini + OpenAI backup)
                </strong>
                .
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-sev-ok/30 bg-sev-ok/[0.06] px-4 py-2.5 text-xs">
              <RefreshCw className="h-4 w-4 text-sev-ok shrink-0" />
              <span>
                <strong className="text-foreground">Spare Engine Safety:</strong>{" "}
                <span className="text-text-muted">Gemini busy? OpenAI takes over in &lt;0.25s</span>
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {AGENT_TEAMS.map((team, idx) => (
              <div
                key={team.role}
                className="relative flex flex-col justify-between rounded-2xl border border-border bg-bg-elev p-6"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
                  style={{ backgroundColor: team.color }}
                />
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold"
                      style={{ color: team.color }}
                    >
                      <Bot className="h-4 w-4" />
                      Stage {idx + 1} · {team.techName}
                    </span>
                    <span
                      className="rounded-full px-3 py-0.5 font-mono text-sm font-bold"
                      style={{
                        color: team.color,
                        backgroundColor: `color-mix(in oklab, ${team.color} 15%, transparent)`,
                      }}
                    >
                      {team.count} Agents
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-foreground">{team.role}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{team.plain}</p>
                </div>

                <div className="mt-5 rounded-lg border border-border-faint bg-bg-code px-3 py-2 font-mono text-[11px] text-text-muted">
                  {team.example}
                </div>
              </div>
            ))}
          </div>

          {/* Simple Safety Strip */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Zero Junk Wasted",
                text: "Auto-ignores node_modules, lockfiles & images before calling AI.",
              },
              {
                icon: Wrench,
                title: "Large Codebase Safe",
                text: "Cuts big repos into 8-file chunks so even 80-file apps scan cleanly.",
              },
              {
                icon: CheckCircle2,
                title: "Honest Scoring",
                text: "Failed or running jobs never show a fake 100/100 score.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-border bg-bg-soft/40 p-4"
                >
                  <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{item.title}</div>
                    <div className="mt-0.5 text-xs text-text-muted">{item.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Plain-English Glossary ("What Do These Tech Words Mean?") */}
      <section id="glossary" className="scroll-mt-28 border-b border-border py-14">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                03 // Plain-English Dictionary
              </span>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-tightest sm:text-3xl flex items-center gap-2.5">
                <BookOpen className="h-6 w-6 text-primary" />
                Every Technical Term Explained Simply
              </h2>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(["All", "AI", "Code", "System", "Security"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setGlossaryFilter(cat)}
                  className={`rounded-full border px-3 py-1 font-mono text-[11px] transition cursor-pointer ${
                    glossaryFilter === cat
                      ? "border-primary/50 bg-primary/15 text-primary font-semibold"
                      : "border-border bg-bg-elev text-text-muted hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTerms.map((item) => (
              <div
                key={item.term}
                className="flex flex-col justify-between rounded-xl border border-border bg-bg-elev p-4 transition hover:border-primary/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-sm text-foreground">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" />
                      {item.term}
                    </span>
                    <span className="rounded-full bg-bg-soft px-2 py-0.5 font-mono text-[10px] text-text-muted">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">{item.meaning}</p>
                </div>
                <div className="mt-3 rounded-lg bg-bg-soft/60 px-2.5 py-1.5 text-[11px] text-foreground">
                  <span className="text-primary font-medium">Think of it as:</span> {item.analogy}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
