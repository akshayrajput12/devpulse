import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitFork, Layers, Network } from "lucide-react";

type DfdTab = "level0" | "level1" | "level2";

export function DataFlowDiagramSection() {
  const [tab, setTab] = useState<DfdTab>("level1");

  return (
    <section id="dfd" className="scroll-mt-28 border-b border-border py-14">
      <div className="mx-auto max-w-[1240px] px-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              05 // Formal Data Flow Diagrams (DFD)
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tightest sm:text-3xl">
              DFD Level 0, Level 1 &amp; Level 2 Phase-Wise Chunk Pipeline
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-bg-elev p-1 font-mono text-[11px]">
            {(
              [
                { id: "level0", label: "DFD Level 0 · Context", icon: Network },
                { id: "level1", label: "DFD Level 1 · Subsystems", icon: Layers },
                { id: "level2", label: "DFD Level 2 · Phase Chunking", icon: GitFork },
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

        {/* Interactive DFD Canvas */}
        <div className="mt-6 rounded-xl border border-border bg-bg-elev p-4 sm:p-6 overflow-x-auto">
          <AnimatePresence mode="wait">
            {tab === "level0" && (
              <motion.div
                key="level0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-[820px]"
              >
                <svg viewBox="0 0 1100 360" className="w-full h-auto" fill="none">
                  <defs>
                    <marker
                      id="dfd0-acc"
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
                      id="dfd0-ok"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--sev-ok)" />
                    </marker>
                    <marker
                      id="dfd0-low"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--sev-low)" />
                    </marker>
                  </defs>

                  {/* Center System Process (0.0) */}
                  <rect
                    x="395"
                    y="105"
                    width="310"
                    height="150"
                    rx="20"
                    fill="var(--bg-soft)"
                    stroke="var(--accent)"
                    strokeWidth="2"
                  />
                  <text
                    x="550"
                    y="136"
                    textAnchor="middle"
                    fill="var(--accent)"
                    fontFamily="var(--font-mono)"
                    fontSize="11"
                    fontWeight="700"
                  >
                    PROCESS 0.0
                  </text>
                  <text
                    x="550"
                    y="164"
                    textAnchor="middle"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="18"
                    fontWeight="700"
                  >
                    DEVPULSE PLATFORM
                  </text>
                  <text
                    x="550"
                    y="190"
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    4 Scopes · 10 AI Agents · 17 RLS Tables
                  </text>
                  <text
                    x="550"
                    y="210"
                    textAnchor="middle"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    Dual-Queue (PG Mutex + In-Process Fallback)
                  </text>
                  <text
                    x="550"
                    y="232"
                    textAnchor="middle"
                    fill="var(--text-faint)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    https://devvpulse.vercel.app ↔ Render API
                  </text>

                  {/* Left Top: Developer */}
                  <rect
                    x="20"
                    y="30"
                    width="220"
                    height="84"
                    rx="10"
                    fill="var(--bg-code)"
                    stroke="var(--sev-low)"
                  />
                  <text
                    x="36"
                    y="54"
                    fill="var(--sev-low)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    EXTERNAL ENTITY
                  </text>
                  <text
                    x="36"
                    y="75"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    Developer / Team
                  </text>
                  <text
                    x="36"
                    y="96"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    OAuth · PR/Repo Submit · 1-Click Fix
                  </text>

                  {/* Left Bottom: GitHub VCS */}
                  <rect
                    x="20"
                    y="246"
                    width="220"
                    height="84"
                    rx="10"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="36"
                    y="270"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    EXTERNAL ENTITY
                  </text>
                  <text
                    x="36"
                    y="291"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    GitHub VCS &amp; App
                  </text>
                  <text
                    x="36"
                    y="312"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Webhooks · Diffs · Git Tree · Commits
                  </text>

                  {/* Right Top: Dual LLM Providers */}
                  <rect
                    x="860"
                    y="30"
                    width="220"
                    height="84"
                    rx="10"
                    fill="var(--bg-code)"
                    stroke="var(--sev-ok)"
                  />
                  <text
                    x="876"
                    y="54"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    AI INFERENCE MESH
                  </text>
                  <text
                    x="876"
                    y="75"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    Gemini ↔ OpenAI
                  </text>
                  <text
                    x="876"
                    y="96"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    Chunked Slices → Structured JSON
                  </text>

                  {/* Right Bottom: Razorpay + SMTP */}
                  <rect
                    x="860"
                    y="246"
                    width="220"
                    height="84"
                    rx="10"
                    fill="var(--bg-code)"
                    stroke="var(--sev-high)"
                  />
                  <text
                    x="876"
                    y="270"
                    fill="var(--sev-high)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                    fontWeight="600"
                  >
                    BILLING &amp; NOTIFY
                  </text>
                  <text
                    x="876"
                    y="291"
                    fill="var(--text)"
                    fontFamily="var(--font-sans)"
                    fontSize="14"
                    fontWeight="600"
                  >
                    Razorpay &amp; SMTP
                  </text>
                  <text
                    x="876"
                    y="312"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9.5"
                  >
                    INR Orders · HMAC Webhooks · Mail
                  </text>

                  {/* Bi-Directional Data Flows */}
                  <path
                    d="M 240 62 L 390 140"
                    stroke="var(--sev-low)"
                    strokeWidth="1.6"
                    markerEnd="url(#dfd0-low)"
                  />
                  <path
                    d="M 390 158 L 240 88"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                    markerEnd="url(#dfd0-ok)"
                  />
                  <text
                    x="255"
                    y="76"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    PR URL / Audit Req
                  </text>
                  <text
                    x="248"
                    y="138"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    Live WAL Findings
                  </text>

                  <path
                    d="M 240 278 L 390 212"
                    stroke="var(--accent)"
                    strokeWidth="1.6"
                    markerEnd="url(#dfd0-acc)"
                  />
                  <path
                    d="M 390 230 L 240 302"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                    markerEnd="url(#dfd0-ok)"
                  />
                  <text
                    x="248"
                    y="232"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    HMAC Webhook + Diff
                  </text>
                  <text
                    x="256"
                    y="296"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    PUT Patch / PR Review
                  </text>

                  <path
                    d="M 705 140 L 855 62"
                    stroke="var(--accent)"
                    strokeWidth="1.6"
                    markerEnd="url(#dfd0-acc)"
                  />
                  <path
                    d="M 855 88 L 705 158"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                    markerEnd="url(#dfd0-ok)"
                  />
                  <text
                    x="720"
                    y="78"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    Budgeted Code Chunks
                  </text>
                  <text
                    x="730"
                    y="140"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    JSON Findings + Score
                  </text>

                  <path
                    d="M 705 212 L 855 278"
                    stroke="var(--accent)"
                    strokeWidth="1.6"
                    markerEnd="url(#dfd0-acc)"
                  />
                  <path
                    d="M 855 302 L 705 230"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                    markerEnd="url(#dfd0-ok)"
                  />
                  <text
                    x="722"
                    y="232"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    Order Init / HTML Mail
                  </text>
                  <text
                    x="722"
                    y="296"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="9"
                  >
                    Signed Payment Event
                  </text>
                </svg>
              </motion.div>
            )}

            {tab === "level1" && (
              <motion.div
                key="level1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-[860px]"
              >
                <svg viewBox="0 0 1120 420" className="w-full h-auto" fill="none">
                  <defs>
                    <marker
                      id="dfd1-acc"
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
                      id="dfd1-ok"
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

                  {/* Row 1: Processes 1.0 → 2.0 → 3.0 → 4.0 */}
                  {[
                    {
                      x: 20,
                      y: 26,
                      code: "P 1.0",
                      title: "Auth & Credit Gate",
                      sub: "JWT + 30d Renewal RPC",
                      col: "var(--sev-low)",
                    },
                    {
                      x: 295,
                      y: 26,
                      code: "P 2.0",
                      title: "Ingest & Noise Filter",
                      sub: "HMAC + 3-Tier Diff + Pruner",
                      col: "var(--accent)",
                    },
                    {
                      x: 570,
                      y: 26,
                      code: "P 3.0",
                      title: "Dual-Mode Queue",
                      sub: "PG Mutex ↔ In-Process Pool",
                      col: "var(--sev-high)",
                    },
                    {
                      x: 845,
                      y: 26,
                      code: "P 4.0",
                      title: "Phase AI Orchestrator",
                      sub: "10 Agents · Gemini ↔ OpenAI",
                      col: "var(--sev-med)",
                    },
                  ].map((p) => (
                    <g key={p.code}>
                      <rect
                        x={p.x}
                        y={p.y}
                        width="240"
                        height="82"
                        rx="10"
                        fill="var(--bg-soft)"
                        stroke={p.col}
                        strokeWidth="1.4"
                      />
                      <text
                        x={p.x + 14}
                        y={p.y + 22}
                        fill={p.col}
                        fontFamily="var(--font-mono)"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {p.code}
                      </text>
                      <text
                        x={p.x + 14}
                        y={p.y + 44}
                        fill="var(--text)"
                        fontFamily="var(--font-sans)"
                        fontSize="13.5"
                        fontWeight="600"
                      >
                        {p.title}
                      </text>
                      <text
                        x={p.x + 14}
                        y={p.y + 64}
                        fill="var(--text-muted)"
                        fontFamily="var(--font-mono)"
                        fontSize="9.5"
                      >
                        {p.sub}
                      </text>
                    </g>
                  ))}

                  {/* Row 2: Data Stores (Open-ended DFD datastore style) */}
                  {[
                    {
                      x: 20,
                      y: 175,
                      id: "D1",
                      name: "profiles & teams",
                      desc: "plan · review_credits · RLS",
                    },
                    {
                      x: 242,
                      y: 175,
                      id: "D2",
                      name: "reviews & findings",
                      desc: "health_score · bad/fix diffs",
                    },
                    {
                      x: 464,
                      y: 175,
                      id: "D3",
                      name: "review_queue",
                      desc: "SKIP LOCKED · 5^n backoff",
                    },
                    {
                      x: 686,
                      y: 175,
                      id: "D4",
                      name: "folder_analyses",
                      desc: "org_score · ideal_tree · moves",
                    },
                    {
                      x: 908,
                      y: 175,
                      id: "D5",
                      name: "keys & payments",
                      desc: "system_ai_keys · razorpay tx",
                    },
                  ].map((ds) => (
                    <g key={ds.id}>
                      <line
                        x1={ds.x}
                        y1={ds.y}
                        x2={ds.x + 192}
                        y2={ds.y}
                        stroke="var(--sev-ok)"
                        strokeWidth="1.6"
                      />
                      <line
                        x1={ds.x}
                        y1={ds.y + 62}
                        x2={ds.x + 192}
                        y2={ds.y + 62}
                        stroke="var(--sev-ok)"
                        strokeWidth="1.6"
                      />
                      <line
                        x1={ds.x}
                        y1={ds.y}
                        x2={ds.x}
                        y2={ds.y + 62}
                        stroke="var(--sev-ok)"
                        strokeWidth="1.6"
                      />
                      <rect
                        x={ds.x + 1}
                        y={ds.y + 1}
                        width="190"
                        height="60"
                        fill="var(--bg-code)"
                      />
                      <text
                        x={ds.x + 12}
                        y={ds.y + 20}
                        fill="var(--sev-ok)"
                        fontFamily="var(--font-mono)"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {ds.id}: {ds.name}
                      </text>
                      <text
                        x={ds.x + 12}
                        y={ds.y + 42}
                        fill="var(--text-muted)"
                        fontFamily="var(--font-mono)"
                        fontSize="9.5"
                      >
                        {ds.desc}
                      </text>
                    </g>
                  ))}

                  {/* Row 3: Processes 5.0 → 6.0 → 7.0 */}
                  {[
                    {
                      x: 20,
                      y: 312,
                      code: "P 5.0",
                      title: "Deterministic Scoring & CDC",
                      sub: "Score Guard · Realtime WAL Push · Email",
                      col: "var(--sev-ok)",
                    },
                    {
                      x: 390,
                      y: 312,
                      code: "P 6.0",
                      title: "1-Click Git Patch Committer",
                      sub: "Snippet Match / Line Splice → PUT /contents",
                      col: "var(--accent)",
                    },
                    {
                      x: 760,
                      y: 312,
                      code: "P 7.0",
                      title: "Razorpay Billing & Admin Ops",
                      sub: "HMAC Verify · Idempotent Ledger · Hot Config",
                      col: "var(--sev-high)",
                    },
                  ].map((p) => (
                    <g key={p.code}>
                      <rect
                        x={p.x}
                        y={p.y}
                        width="330"
                        height="82"
                        rx="10"
                        fill="var(--bg-soft)"
                        stroke={p.col}
                        strokeWidth="1.4"
                      />
                      <text
                        x={p.x + 14}
                        y={p.y + 22}
                        fill={p.col}
                        fontFamily="var(--font-mono)"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {p.code}
                      </text>
                      <text
                        x={p.x + 14}
                        y={p.y + 44}
                        fill="var(--text)"
                        fontFamily="var(--font-sans)"
                        fontSize="13.5"
                        fontWeight="600"
                      >
                        {p.title}
                      </text>
                      <text
                        x={p.x + 14}
                        y={p.y + 64}
                        fill="var(--text-muted)"
                        fontFamily="var(--font-mono)"
                        fontSize="9.5"
                      >
                        {p.sub}
                      </text>
                    </g>
                  ))}

                  {/* Horizontal Process Flows */}
                  <path
                    d="M 260 67 L 290 67"
                    stroke="var(--accent)"
                    strokeWidth="1.6"
                    markerEnd="url(#dfd1-acc)"
                  />
                  <path
                    d="M 535 67 L 565 67"
                    stroke="var(--accent)"
                    strokeWidth="1.6"
                    markerEnd="url(#dfd1-acc)"
                  />
                  <path
                    d="M 810 67 L 840 67"
                    stroke="var(--accent)"
                    strokeWidth="1.6"
                    markerEnd="url(#dfd1-acc)"
                  />

                  {/* Vertical Datastore Links */}
                  <path
                    d="M 115 108 L 115 170"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.3"
                    markerEnd="url(#dfd1-ok)"
                  />
                  <path
                    d="M 380 108 L 338 170"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.3"
                    markerEnd="url(#dfd1-ok)"
                  />
                  <path
                    d="M 620 108 L 560 170"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.3"
                    markerEnd="url(#dfd1-ok)"
                  />
                  <path
                    d="M 965 108 L 995 170"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.3"
                    markerEnd="url(#dfd1-ok)"
                  />
                  <path
                    d="M 890 108 L 780 170"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.3"
                    markerEnd="url(#dfd1-ok)"
                  />

                  {/* Datastores to Row 3 */}
                  <path
                    d="M 338 237 L 195 308"
                    stroke="var(--accent)"
                    strokeWidth="1.4"
                    markerEnd="url(#dfd1-acc)"
                  />
                  <path
                    d="M 360 237 L 520 308"
                    stroke="var(--accent)"
                    strokeWidth="1.4"
                    markerEnd="url(#dfd1-acc)"
                  />
                  <path
                    d="M 1000 237 L 940 308"
                    stroke="var(--accent)"
                    strokeWidth="1.4"
                    markerEnd="url(#dfd1-acc)"
                  />
                  <path
                    d="M 350 353 L 385 353"
                    stroke="var(--sev-ok)"
                    strokeWidth="1.4"
                    markerEnd="url(#dfd1-ok)"
                  />
                </svg>
              </motion.div>
            )}

            {tab === "level2" && (
              <motion.div
                key="level2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-[860px]"
              >
                <svg viewBox="0 0 1120 370" className="w-full h-auto" fill="none">
                  <defs>
                    <marker
                      id="dfd2-acc"
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
                      id="dfd2-ok"
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

                  {/* 4 Horizontal Phases for Large PR / Codebase / API Audits */}
                  {[
                    {
                      x: 16,
                      phase: "PHASE 1 · DISCOVER",
                      title: "Noise-Pruned Ingest",
                      color: "var(--sev-low)",
                      items: [
                        "PR: 3-tier diff fallback (60k)",
                        "Codebase: Priority 80 files",
                        "API: Polyglot regex 50 files",
                        "Drops locks, binaries, dist/",
                      ],
                    },
                    {
                      x: 292,
                      phase: "PHASE 2 · PARTITION",
                      title: "Budgeted Chunking",
                      color: "var(--sev-med)",
                      items: [
                        "PR: Triage + ±40L + imports",
                        "Code/API: ≤8 files/chunk",
                        "Hard cap: ≤36k chars/chunk",
                        "8k chars max per file slice",
                      ],
                    },
                    {
                      x: 568,
                      phase: "PHASE 3 · PARALLEL AUDIT",
                      title: "Isolated Worker Pool",
                      color: "var(--accent)",
                      items: [
                        "Bounded concurrency (×2)",
                        "Key rotation on every retry",
                        "429/5xx/JSON retry backoff",
                        "Partial-chunk isolation",
                      ],
                    },
                    {
                      x: 844,
                      phase: "PHASE 4 · SYNTHESIS",
                      title: "Score & Safe Fallback",
                      color: "var(--sev-ok)",
                      items: [
                        "Dedup (file + line + title)",
                        "Deterministic score guard",
                        "Gemini ↔ OpenAI failover",
                        "Fallback synth if LLM fails",
                      ],
                    },
                  ].map((box, idx) => (
                    <g key={box.phase}>
                      <rect
                        x={box.x}
                        y="24"
                        width="256"
                        height="205"
                        rx="12"
                        fill="var(--bg-soft)"
                        stroke={box.color}
                        strokeWidth="1.5"
                      />
                      <text
                        x={box.x + 14}
                        y="48"
                        fill={box.color}
                        fontFamily="var(--font-mono)"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {box.phase}
                      </text>
                      <text
                        x={box.x + 14}
                        y="70"
                        fill="var(--text)"
                        fontFamily="var(--font-sans)"
                        fontSize="14.5"
                        fontWeight="600"
                      >
                        {box.title}
                      </text>
                      <line
                        x1={box.x + 14}
                        y1="84"
                        x2={box.x + 242}
                        y2="84"
                        stroke="var(--border)"
                      />
                      {box.items.map((line, li) => (
                        <text
                          key={line}
                          x={box.x + 16}
                          y={108 + li * 26}
                          fill="var(--text-muted)"
                          fontFamily="var(--font-mono)"
                          fontSize="10"
                        >
                          • {line}
                        </text>
                      ))}
                      {idx < 3 && (
                        <path
                          d={`M ${box.x + 256} 126 L ${box.x + 272} 126`}
                          stroke="var(--accent)"
                          strokeWidth="1.8"
                          markerEnd="url(#dfd2-acc)"
                        />
                      )}
                    </g>
                  ))}

                  {/* Bottom Resilience & Queue Strip */}
                  <rect
                    x="16"
                    y="258"
                    width="1084"
                    height="90"
                    rx="12"
                    fill="var(--bg-code)"
                    stroke="var(--border)"
                  />
                  <text
                    x="34"
                    y="284"
                    fill="var(--accent)"
                    fontFamily="var(--font-mono)"
                    fontSize="10.5"
                    fontWeight="700"
                  >
                    DUAL-LAYER QUEUE &amp; ERROR SAFEGUARD (ZERO STUCK QUEUED JOBS)
                  </text>
                  <text
                    x="34"
                    y="308"
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    1. Primary: PostgreSQL review_queue (claim_next_queue_item_v3 SKIP LOCKED) when
                    valid service_role key &amp; table grants exist.
                  </text>
                  <text
                    x="34"
                    y="328"
                    fill="var(--sev-ok)"
                    fontFamily="var(--font-mono)"
                    fontSize="10"
                  >
                    2. Automatic Fallback: Bounded In-Process Worker Pool (concurrency 4) with user
                    JWT if 42501 / anon key detected — failed runs clear health_score = NULL.
                  </text>
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
