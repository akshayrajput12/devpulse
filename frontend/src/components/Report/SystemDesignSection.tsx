import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Cloud, GitBranch, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { NFR_BENCHMARKS } from "./reportData";

type DiagramTab = "cloud" | "sequence" | "failover";

export function SystemDesignSection() {
  const [tab, setTab] = useState<DiagramTab>("cloud");

  return (
    <section id="system-design" className="scroll-mt-28 border-b border-border py-14">
      <div className="mx-auto max-w-[1240px] px-6">
        {/* Header + Tab Switcher */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              04 // Detailed System Design
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tightest sm:text-3xl">
              Multi-Tier Architecture, Sequence Flow &amp; Failover Circuit
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-bg-elev p-1 font-mono text-[11px]">
            {(
              [
                { id: "cloud", label: "Cloud Architecture", icon: Cloud },
                { id: "sequence", label: "E2E Sequence", icon: GitBranch },
                { id: "failover", label: "Failover Circuit", icon: RefreshCw },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition cursor-pointer ${
                    tab === item.id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-text-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive SVG Architecture Stage */}
        <div className="mt-6 rounded-xl border border-border bg-bg-elev p-4 sm:p-6 overflow-x-auto">
          <AnimatePresence mode="wait">
            {tab === "cloud" && (
              <motion.div
                key="cloud"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-[820px]"
              >
                <svg
                  viewBox="0 0 1120 430"
                  className="w-full h-auto"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <marker
                      id="arr-accent"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent)" />
                    </marker>
                    <marker
                      id="arr-muted"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-faint)" />
                    </marker>
                    <marker
                      id="arr-ok"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--sev-ok)" />
                    </marker>
                  </defs>

                  {/* Tier Labels */}
                  <text
                    x="20"
                    y="22"
                    fill="var(--text-faint)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    letterSpacing="1.6"
                  >
                    TIER 1 · EDGE / CLIENT
                  </text>
                  <text
                    x="300"
                    y="22"
                    fill="var(--text-faint)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    letterSpacing="1.6"
                  >
                    TIER 2 · API &amp; WORKER ENGINE
                  </text>
                  <text
                    x="640"
                    y="22"
                    fill="var(--text-faint)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    letterSpacing="1.6"
                  >
                    TIER 3 · DATA &amp; REALTIME
                  </text>
                  <text
                    x="895"
                    y="22"
                    fill="var(--text-faint)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    letterSpacing="1.6"
                  >
                    TIER 4 · EXTERNAL MESH
                  </text>

                  {/* Tier 1 Box: Frontend SPA */}
                  <rect
                    x="20"
                    y="38"
                    width="225"
                    height="175"
                    rx="12"
                    fill="var(--bg-soft)"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="36"
                    y="64"
                    fill="var(--accent)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    VERCEL EDGE CDN
                  </text>
                  <text
                    x="36"
                    y="84"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="15"
                    fontWeight="600"
                  >
                    React 19 SPA
                  </text>
                  <text
                    x="36"
                    y="106"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    • TanStack Router (22 routes)
                  </text>
                  <text
                    x="36"
                    y="124"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    • Tailwind v4 + Framer Motion
                  </text>
                  <text
                    x="36"
                    y="142"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    • Supabase Anon JWT (RLS)
                  </text>
                  <text
                    x="36"
                    y="160"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    • Realtime WSS Subscriber
                  </text>
                  <rect
                    x="36"
                    y="176"
                    width="193"
                    height="22"
                    rx="6"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="48"
                    y="191"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    Zero Polling · Live Diffs
                  </text>

                  {/* Tier 1 Lower: Developer / GitHub Trigger */}
                  <rect
                    x="20"
                    y="245"
                    width="225"
                    height="150"
                    rx="12"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="36"
                    y="270"
                    fill="var(--sev-low)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    INGRESS TRIGGERS
                  </text>
                  <text
                    x="36"
                    y="292"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    Manual &amp; Auto Events
                  </text>
                  <text
                    x="36"
                    y="314"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    • Paste PR URL / Workspace
                  </text>
                  <text
                    x="36"
                    y="332"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    • GitHub App PR Webhooks
                  </text>
                  <text
                    x="36"
                    y="350"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    • 1-Click Apply Fix Action
                  </text>
                  <text
                    x="36"
                    y="368"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    • Razorpay UPI / Card Order
                  </text>

                  {/* Tier 2 Box: Express API + Worker Pool */}
                  <rect
                    x="300"
                    y="38"
                    width="280"
                    height="357"
                    rx="12"
                    fill="var(--bg-soft)"
                    stroke="var(--border)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="318"
                    y="64"
                    fill="var(--sev-med)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    RENDER NODE SERVICE
                  </text>
                  <text
                    x="318"
                    y="84"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="15"
                    fontWeight="600"
                  >
                    Express API &amp; Async Pool
                  </text>

                  {/* Sub-box 2A: REST & Webhook Gateway */}
                  <rect
                    x="318"
                    y="100"
                    width="244"
                    height="76"
                    rx="8"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="330"
                    y="120"
                    fill="var(--text)"
                    fontFamily="var(--font-mono)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    REST + Webhook Gateway
                  </text>
                  <text
                    x="330"
                    y="138"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    26+ Endpoints · Zod Schemas
                  </text>
                  <text
                    x="330"
                    y="154"
                    fill="var(--sev-low)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    HMAC-SHA256 · 10m Self-Ping
                  </text>

                  {/* Sub-box 2B: Async Worker Pool */}
                  <rect
                    x="318"
                    y="190"
                    width="244"
                    height="84"
                    rx="8"
                    fill="var(--bg-code)"
                    stroke="var(--sev-high)"
                    strokeOpacity="0.6"
                  />
                  <text
                    x="330"
                    y="210"
                    fill="var(--sev-high)"
                    fontFamily="var(--font-mono)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    Dynamic Worker Pool (×4)
                  </text>
                  <text
                    x="330"
                    y="228"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    claim_next_queue_item_v3()
                  </text>
                  <text
                    x="330"
                    y="244"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    SIGTERM 30s Drain · 5^n Retry
                  </text>
                  <text
                    x="330"
                    y="260"
                    fill="var(--text-faint)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    review-processor.server.ts
                  </text>

                  {/* Sub-box 2C: Dual-Engine Orchestrator */}
                  <rect
                    x="318"
                    y="288"
                    width="244"
                    height="90"
                    rx="8"
                    fill="var(--bg-code)"
                    stroke="var(--accent)"
                    strokeOpacity="0.7"
                  />
                  <text
                    x="330"
                    y="308"
                    fill="var(--accent)"
                    fontFamily="var(--font-mono)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    AI Orchestrator Core
                  </text>
                  <text
                    x="330"
                    y="326"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    10 Agents · Noise + ±40L Slice
                  </text>
                  <text
                    x="330"
                    y="342"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    Gemini ↔ OpenAI Auto-Failover
                  </text>
                  <text
                    x="330"
                    y="358"
                    fill="var(--text-faint)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    Key Pool Rotation (15s TTL)
                  </text>

                  {/* Tier 3 Box: Supabase */}
                  <rect
                    x="635"
                    y="38"
                    width="210"
                    height="357"
                    rx="12"
                    fill="var(--bg-soft)"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="653"
                    y="64"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    SUPABASE CLOUD
                  </text>
                  <text
                    x="653"
                    y="84"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="15"
                    fontWeight="600"
                  >
                    PostgreSQL 15
                  </text>

                  <rect
                    x="653"
                    y="102"
                    width="174"
                    height="62"
                    rx="8"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="665"
                    y="122"
                    fill="var(--text)"
                    fontFamily="var(--font-mono)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    17 RLS Tables
                  </text>
                  <text
                    x="665"
                    y="140"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    reviews · findings · queue
                  </text>
                  <text
                    x="665"
                    y="154"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    folders · profiles · keys
                  </text>

                  <rect
                    x="653"
                    y="178"
                    width="174"
                    height="62"
                    rx="8"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="665"
                    y="198"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    Realtime CDC
                  </text>
                  <text
                    x="665"
                    y="216"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Postgres WAL → WSS
                  </text>
                  <text
                    x="665"
                    y="230"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    &lt; 50ms Browser Push
                  </text>

                  <rect
                    x="653"
                    y="254"
                    width="174"
                    height="62"
                    rx="8"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="665"
                    y="274"
                    fill="var(--sev-med)"
                    fontFamily="var(--font-mono)"
                    fontSize="11"
                    fontWeight="600"
                  >
                    Auth &amp; Vault
                  </text>
                  <text
                    x="665"
                    y="292"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    GitHub OAuth2 + JWT
                  </text>
                  <text
                    x="665"
                    y="306"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    system_ai_keys · settings
                  </text>

                  <rect
                    x="653"
                    y="330"
                    width="174"
                    height="48"
                    rx="8"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="665"
                    y="350"
                    fill="var(--accent)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    6 Atomic RPCs
                  </text>
                  <text
                    x="665"
                    y="366"
                    fill="var(--text-faint)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    SKIP LOCKED + Credits
                  </text>

                  {/* Tier 4 Boxes: External Services */}
                  <rect
                    x="895"
                    y="38"
                    width="205"
                    height="78"
                    rx="10"
                    fill="var(--bg-code)"
                    stroke="var(--sev-low)"
                  />
                  <text
                    x="910"
                    y="60"
                    fill="var(--sev-low)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    PRIMARY LLM
                  </text>
                  <text
                    x="910"
                    y="78"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="13"
                    fontWeight="600"
                  >
                    Google Gemini API
                  </text>
                  <text
                    x="910"
                    y="98"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Triage · Review · Enterprise
                  </text>

                  <rect
                    x="895"
                    y="130"
                    width="205"
                    height="78"
                    rx="10"
                    fill="var(--bg-code)"
                    stroke="var(--sev-ok)"
                  />
                  <text
                    x="910"
                    y="152"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    FAILOVER LLM
                  </text>
                  <text
                    x="910"
                    y="170"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="13"
                    fontWeight="600"
                  >
                    OpenAI GPT-4o
                  </text>
                  <text
                    x="910"
                    y="190"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Pro Auto-Failover Mirror
                  </text>

                  <rect
                    x="895"
                    y="222"
                    width="205"
                    height="78"
                    rx="10"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="910"
                    y="244"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    VCS &amp; COMMITTER
                  </text>
                  <text
                    x="910"
                    y="262"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="13"
                    fontWeight="600"
                  >
                    GitHub REST &amp; App
                  </text>
                  <text
                    x="910"
                    y="282"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Diffs · Trees · PUT Commits
                  </text>

                  <rect
                    x="895"
                    y="314"
                    width="205"
                    height="81"
                    rx="10"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="910"
                    y="336"
                    fill="var(--sev-high)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    PAYMENTS &amp; MAIL
                  </text>
                  <text
                    x="910"
                    y="354"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="13"
                    fontWeight="600"
                  >
                    Razorpay + SMTP
                  </text>
                  <text
                    x="910"
                    y="374"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    INR Paise · HTML Digests
                  </text>

                  {/* Connectors */}
                  <path
                    d="M 245 125 L 296 125"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    markerEnd="url(#arr-accent)"
                  />
                  <path
                    d="M 245 315 L 296 150"
                    stroke="var(--text-faint)"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    markerEnd="url(#arr-muted)"
                  />
                  <path
                    d="M 580 140 L 631 140"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    markerEnd="url(#arr-accent)"
                  />
                  <path
                    d="M 580 232 L 631 232"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.5"
                    markerEnd="url(#arr-ok)"
                  />
                  {/* Realtime loop back to Client */}
                  <path
                    d="M 653 208 C 600 208, 600 415, 132 415 L 132 217"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.3"
                    strokeDasharray="5 4"
                    markerEnd="url(#arr-ok)"
                  />
                  <text
                    x="320"
                    y="424"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Realtime Postgres WAL → WebSocket Push (&lt;50ms)
                  </text>
                  {/* Orchestrator to External */}
                  <path
                    d="M 580 315 C 610 315, 865 78, 891 78"
                    stroke="var(--sev-low)"
                    strokeWidth="1.4"
                    markerEnd="url(#arr-accent)"
                  />
                  <path
                    d="M 580 330 C 615 330, 865 168, 891 168"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                    markerEnd="url(#arr-ok)"
                  />
                  <path
                    d="M 580 262 L 891 262"
                    stroke="var(--text-faint)"
                    strokeWidth="1.2"
                    markerEnd="url(#arr-muted)"
                  />
                  <path
                    d="M 580 355 L 891 355"
                    stroke="var(--text-faint)"
                    strokeWidth="1.2"
                    markerEnd="url(#arr-muted)"
                  />
                </svg>
              </motion.div>
            )}

            {tab === "sequence" && (
              <motion.div
                key="sequence"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-[820px]"
              >
                <svg viewBox="0 0 1120 420" className="w-full h-auto" fill="none">
                  <defs>
                    <marker
                      id="seq-arr"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent)" />
                    </marker>
                    <marker
                      id="seq-ok"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--sev-ok)" />
                    </marker>
                  </defs>

                  {/* Swimlane Headers */}
                  {[
                    { x: 95, label: "Developer SPA", color: "var(--accent)" },
                    { x: 280, label: "Express API", color: "var(--sev-low)" },
                    { x: 465, label: "PG Queue + DB", color: "var(--sev-ok)" },
                    { x: 650, label: "Worker Pool", color: "var(--sev-high)" },
                    { x: 835, label: "GitHub API", color: "var(--text-muted)" },
                    { x: 1020, label: "Dual AI Core", color: "var(--sev-med)" },
                  ].map((lane) => (
                    <g key={lane.label}>
                      <rect
                        x={lane.x - 72}
                        y="14"
                        width="144"
                        height="32"
                        rx="8"
                        fill="var(--bg-soft)"
                        stroke={lane.color}
                      />
                      <text
                        x={lane.x}
                        y="34"
                        textAnchor="middle"
                        fill="var(--text)"
                        fontFamily="var(--font-mono)"
                        fontSize="11"
                        fontWeight="600"
                      >
                        {lane.label}
                      </text>
                      <line
                        x1={lane.x}
                        y1="46"
                        x2={lane.x}
                        y2="405"
                        stroke="var(--border)"
                        strokeDasharray="4 4"
                      />
                    </g>
                  ))}

                  {/* Chronological Steps */}
                  {[
                    {
                      y: 78,
                      x1: 95,
                      x2: 280,
                      text: "1. POST /api/reviews/create + process (JWT)",
                      col: "var(--accent)",
                      ok: false,
                    },
                    {
                      y: 112,
                      x1: 280,
                      x2: 465,
                      text: "2. INSERT reviews(pending) + review_queue",
                      col: "var(--accent)",
                      ok: false,
                    },
                    {
                      y: 146,
                      x1: 280,
                      x2: 95,
                      text: "3. HTTP 202 { queued: true } (<50ms) · Open WSS",
                      col: "var(--sev-ok)",
                      ok: true,
                    },
                    {
                      y: 180,
                      x1: 650,
                      x2: 465,
                      text: "4. RPC claim_next_queue_item_v3 (SKIP LOCKED)",
                      col: "var(--accent)",
                      ok: false,
                    },
                    {
                      y: 214,
                      x1: 650,
                      x2: 835,
                      text: "5. Fetch PR Diff (3-tier) + headSha Raw Files",
                      col: "var(--accent)",
                      ok: false,
                    },
                    {
                      y: 248,
                      x1: 650,
                      x2: 1020,
                      text: "6. Noise Prune → Triage → ±40L Audit → Synthesis",
                      col: "var(--accent)",
                      ok: false,
                    },
                    {
                      y: 282,
                      x1: 1020,
                      x2: 650,
                      text: "7. JSON { health_score, 7-sec summary, findings[] }",
                      col: "var(--sev-ok)",
                      ok: true,
                    },
                    {
                      y: 316,
                      x1: 650,
                      x2: 465,
                      text: "8. Save findings + complete + deduct credits",
                      col: "var(--accent)",
                      ok: false,
                    },
                    {
                      y: 350,
                      x1: 465,
                      x2: 95,
                      text: "9. Supabase Realtime WAL Push (<50ms) + Email",
                      col: "var(--sev-ok)",
                      ok: true,
                    },
                    {
                      y: 384,
                      x1: 95,
                      x2: 835,
                      text: "10. Optional 1-Click Apply Fix → PUT /contents/:path",
                      col: "var(--sev-ok)",
                      ok: true,
                    },
                  ].map((msg) => (
                    <g key={msg.text}>
                      <line
                        x1={msg.x1}
                        y1={msg.y}
                        x2={msg.x2 > msg.x1 ? msg.x2 - 6 : msg.x2 + 6}
                        y2={msg.y}
                        stroke={msg.col}
                        strokeWidth="1.6"
                        markerEnd={msg.ok ? "url(#seq-ok)" : "url(#seq-arr)"}
                      />
                      <rect
                        x={(msg.x1 + msg.x2) / 2 - 155}
                        y={msg.y - 18}
                        width="310"
                        height="16"
                        rx="4"
                        fill="var(--bg-elev)"
                      />
                      <text
                        x={(msg.x1 + msg.x2) / 2}
                        y={msg.y - 6}
                        textAnchor="middle"
                        fill="var(--text)"
                        fontFamily="var(--font-mono)"
                        fontSize="10"
                      >
                        {msg.text}
                      </text>
                    </g>
                  ))}
                </svg>
              </motion.div>
            )}

            {tab === "failover" && (
              <motion.div
                key="failover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-[820px]"
              >
                <svg viewBox="0 0 1120 340" className="w-full h-auto" fill="none">
                  <defs>
                    <marker
                      id="fo-acc"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent)" />
                    </marker>
                    <marker
                      id="fo-crit"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--sev-crit)" />
                    </marker>
                    <marker
                      id="fo-ok"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--sev-ok)" />
                    </marker>
                  </defs>

                  {/* Node 1: Plan & Settings Gate */}
                  <rect
                    x="20"
                    y="115"
                    width="190"
                    height="104"
                    rx="12"
                    fill="var(--bg-soft)"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="36"
                    y="140"
                    fill="var(--accent)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    ORCHESTRATOR GATE
                  </text>
                  <text
                    x="36"
                    y="160"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    Plan &amp; Config Check
                  </text>
                  <text
                    x="36"
                    y="182"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    ai_provider (10s TTL)
                  </text>
                  <text
                    x="36"
                    y="198"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Free vs Pro Routing
                  </text>

                  {/* Node 2: Primary Gemini */}
                  <rect
                    x="275"
                    y="36"
                    width="230"
                    height="114"
                    rx="12"
                    fill="var(--bg-code)"
                    stroke="var(--sev-low)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="292"
                    y="60"
                    fill="var(--sev-low)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    PRIMARY ENGINE
                  </text>
                  <text
                    x="292"
                    y="80"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    Google Gemini Pool
                  </text>
                  <text
                    x="292"
                    y="102"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    • Round-robin system_ai_keys
                  </text>
                  <text
                    x="292"
                    y="118"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    • 3×–5× Backoff on HTTP 429
                  </text>
                  <text
                    x="292"
                    y="134"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    • 1s RPM pacing between files
                  </text>

                  {/* Node 3: Failover OpenAI */}
                  <rect
                    x="275"
                    y="194"
                    width="230"
                    height="114"
                    rx="12"
                    fill="var(--bg-code)"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="292"
                    y="218"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    PRO FAILOVER (&lt;250ms)
                  </text>
                  <text
                    x="292"
                    y="238"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    OpenAI GPT-4o Mirror
                  </text>
                  <text
                    x="292"
                    y="260"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    • Exact 1:1 prompt &amp; schema parity
                  </text>
                  <text
                    x="292"
                    y="276"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    • Separate round-robin key pool
                  </text>
                  <text
                    x="292"
                    y="292"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    • Reverse fallback if OAI primary
                  </text>

                  {/* Node 4: JSON Schema Validator */}
                  <rect
                    x="595"
                    y="115"
                    width="215"
                    height="104"
                    rx="12"
                    fill="var(--bg-soft)"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.5"
                  />
                  <text
                    x="612"
                    y="140"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    STRICT VALIDATION
                  </text>
                  <text
                    x="612"
                    y="160"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    JSON &amp; Score Persist
                  </text>
                  <text
                    x="612"
                    y="182"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    parseJsonResponse()
                  </text>
                  <text
                    x="612"
                    y="198"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Clamp 0–100 · Max 15–20
                  </text>

                  {/* Node 5: Graceful Degradation */}
                  <rect
                    x="875"
                    y="115"
                    width="225"
                    height="104"
                    rx="12"
                    fill="var(--bg-code)"
                    stroke="var(--sev-crit)"
                    strokeOpacity="0.7"
                  />
                  <text
                    x="892"
                    y="140"
                    fill="var(--sev-crit)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    BOTH FAILED GUARD
                  </text>
                  <text
                    x="892"
                    y="160"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    Sanitize + Deferred Retry
                  </text>
                  <text
                    x="892"
                    y="182"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    sanitizeAiError() hides keys
                  </text>
                  <text
                    x="892"
                    y="198"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Queue backoff: 5m → 25m → 125m
                  </text>

                  {/* Edges */}
                  <path
                    d="M 210 150 L 270 95"
                    stroke="var(--accent)"
                    strokeWidth="1.6"
                    markerEnd="url(#fo-acc)"
                  />
                  <path
                    d="M 390 150 L 390 189"
                    stroke="var(--sev-crit)"
                    strokeWidth="1.6"
                    strokeDasharray="4 3"
                    markerEnd="url(#fo-crit)"
                  />
                  <text
                    x="400"
                    y="174"
                    fill="var(--sev-crit)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    429 / 503 / Error (Pro)
                  </text>
                  <path
                    d="M 505 95 L 591 150"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.6"
                    markerEnd="url(#fo-ok)"
                  />
                  <path
                    d="M 505 250 L 591 182"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.6"
                    markerEnd="url(#fo-ok)"
                  />
                  <path
                    d="M 810 167 L 870 167"
                    stroke="var(--sev-crit)"
                    strokeWidth="1.3"
                    strokeDasharray="4 4"
                    markerEnd="url(#fo-crit)"
                  />
                  <text
                    x="818"
                    y="156"
                    fill="var(--text-faint)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    exhausted
                  </text>
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* NFR Engineering Benchmarks Strip */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NFR_BENCHMARKS.map((nfr) => (
            <div key={nfr.metric} className="rounded-xl border border-border bg-bg-elev/80 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-text-muted">{nfr.metric}</span>
                <span
                  className="font-mono text-sm font-semibold tabular-nums"
                  style={{ color: nfr.color }}
                >
                  {nfr.value}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-soft">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${nfr.pct}%`, backgroundColor: nfr.color }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-text-faint">
                <span>{nfr.target}</span>
                <span className="inline-flex items-center gap-1 text-sev-ok">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Security Controls Compact Pill Strip */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-code px-4 py-3 font-mono text-[10px]">
          <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-widest text-primary mr-2">
            <Activity className="h-3.5 w-3.5" /> Security Controls
          </span>
          {[
            "PostgreSQL RLS on all 17 tables",
            "HMAC-SHA256 GitHub & Razorpay",
            "timingSafeEqual signature check",
            "Zod validation before DB writes",
            "16-char random public share tokens",
            "Service-role isolated server-side",
          ].map((sec) => (
            <span
              key={sec}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elev px-2.5 py-0.5 text-text-muted"
            >
              <Zap className="h-2.5 w-2.5 text-sev-ok" />
              {sec}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
