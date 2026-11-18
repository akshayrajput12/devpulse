export type ScopeId = "pr" | "folder" | "codebase" | "api";

export interface AuditScopeSpec {
  id: ScopeId;
  code: string;
  name: string;
  reviewType: string;
  credits: number;
  maxInputs: string;
  contextCap: string;
  agentsUsed: string[];
  stages: string[];
  axesCount: number;
  axesLabel: string;
  outputs: string[];
  accentVar: string;
  entryFile: string;
}

export const AUDIT_SCOPES: AuditScopeSpec[] = [
  {
    id: "pr",
    code: "SCOPE-01",
    name: "Pull Request Review",
    reviewType: "pr_review",
    credits: 1,
    maxInputs: "60k char diff · All changed files",
    contextCap: "±40 lines + top 150 imports · 8k/file",
    agentsUsed: ["PR Triage Agent", "PR File Auditor", "PR Synthesizer"],
    stages: [
      "HMAC / URL Ingest",
      "3-Tier Diff Fetch",
      "Noise Filter",
      "Triage Gate",
      "±40L Slicer",
      "6-Axis Audit",
      "Synthesis & Score",
      "1-Click Git Fix",
    ],
    axesCount: 6,
    axesLabel: "6 Quality Axes",
    outputs: [
      "Health Score (0–100)",
      "7-Section Report",
      "Line-Level Patch Diffs",
      "1-Click Branch Commit",
      "Styled PR Comment",
    ],
    accentVar: "var(--accent)",
    entryFile: "backend/src/backend/ai/*/pr-review.ts",
  },
  {
    id: "folder",
    code: "SCOPE-02",
    name: "Folder Architecture Audit",
    reviewType: "folder_analysis",
    credits: 2,
    maxInputs: "Up to 400 recursive tree nodes",
    contextCap: "2k triage preview · full ASCII tree",
    agentsUsed: ["Folder Triage Agent", "Folder Architect Agent"],
    stages: [
      "Recursive Git Tree",
      "ASCII Tree Builder",
      "Folder Triage",
      "Stack Detection",
      "8-Point Arch Audit",
      "Ideal Tree Gen",
      "Migration Plan",
    ],
    axesCount: 8,
    axesLabel: "8 Arch Focus Areas",
    outputs: [
      "Org Score (0–100) + Grade A–F",
      "Stack Fingerprint",
      "Annotated Tree",
      "Ideal ASCII Tree",
      "Max 15 Migration Steps",
    ],
    accentVar: "var(--sev-low)",
    entryFile: "backend/src/backend/ai/*/folder-analysis.ts",
  },
  {
    id: "codebase",
    code: "SCOPE-03",
    name: "Full Codebase Audit",
    reviewType: "codebase_audit",
    credits: 3,
    maxInputs: "Up to 80 noise-pruned source files",
    contextCap: "Phase chunks: ≤8 files & ≤36k chars/batch",
    agentsUsed: ["Codebase Triage Agent", "Codebase Chunk Auditor", "Codebase Synthesizer"],
    stages: [
      "Priority File Select",
      "Noise Pruner",
      "Budgeted Chunking",
      "Parallel Phase Audit (×2)",
      "Partial Isolation + Dedup",
      "Deterministic Score & Synthesis",
    ],
    axesCount: 6,
    axesLabel: "6 Quality Axes",
    outputs: [
      "Health Score (0–100)",
      "Max 20 Ranked Findings",
      "Concrete ASCII Tree",
      "Exploit Vectors + Fixes",
      "Fallback Synthesis Guard",
    ],
    accentVar: "var(--sev-high)",
    entryFile: "backend/src/backend/ai/*/codebase-audit.ts",
  },
  {
    id: "api",
    code: "SCOPE-04",
    name: "API & DB Performance Audit",
    reviewType: "api_analysis",
    credits: 3,
    maxInputs: "Up to 50 polyglot API / DB / service files",
    contextCap: "Phase chunks: ≤8 files & ≤36k chars/batch",
    agentsUsed: ["API/DB Chunk Auditor", "API Scalability Synthesizer"],
    stages: [
      "Polyglot API Selector",
      "Smart Fallback Picker",
      "Budgeted Chunking",
      "SQL & Lock Audit (×2)",
      "API Safety Check",
      "5-Sec + 3 Load Sims",
    ],
    axesCount: 3,
    axesLabel: "3 Backend Pillars",
    outputs: [
      "API Health Score",
      "N+1 & Index Fixes",
      "Lock / Race Remediation",
      "5-Section DB Report",
      "3 Load Test Scenarios",
    ],
    accentVar: "var(--sev-ok)",
    entryFile: "backend/src/backend/ai/*/api-analyser.ts",
  },
];

export interface SubsystemSpec {
  id: string;
  name: string;
  layer: "Client" | "API" | "Queue" | "AI" | "Data" | "Billing";
  chips: string[];
  file: string;
}

export const SUBSYSTEMS: SubsystemSpec[] = [
  {
    id: "M01",
    name: "Auth, OAuth2 & Guard",
    layer: "Client",
    chips: ["GitHub OAuth2", "Supabase JWT", "Master Password Gate", "Admin RBAC"],
    file: "frontend/src/lib/auth.tsx",
  },
  {
    id: "M02",
    name: "Ingestion & Noise Filter",
    layer: "API",
    chips: [
      "HMAC-SHA256 Webhook",
      "3-Stage Diff Fallback",
      "Lockfile & Media Pruner",
      "±40L Context Window",
    ],
    file: "backend/src/backend/github/pull-request.server.ts",
  },
  {
    id: "M03",
    name: "Mutex Worker Queue",
    layer: "Queue",
    chips: ["SKIP LOCKED RPC v3", "Dynamic Concurrency (4)", "SIGTERM Drain", "5^n Backoff Retry"],
    file: "backend/src/backend/reviews/queue.server.ts",
  },
  {
    id: "M04",
    name: "Dual-Engine Orchestrator",
    layer: "AI",
    chips: [
      "Gemini ↔ OpenAI",
      "Plan-Aware Failover",
      "10s Live Settings Cache",
      "Key Pool Rotation",
    ],
    file: "backend/src/backend/ai/orchestrator.ts",
  },
  {
    id: "M05",
    name: "6-Axis Audit & Scoring",
    layer: "AI",
    chips: [
      "10 Agent Roles",
      "JSON Schema Guard",
      "0–100 Deterministic Score",
      "Confidence Weighting",
    ],
    file: "backend/src/backend/ai/gemini/pr-review.ts",
  },
  {
    id: "M06",
    name: "1-Click Remediation",
    layer: "API",
    chips: [
      "GitHub Contents PUT",
      "Exact Snippet Match",
      "Line-Range Fallback",
      "DevPulse/Human PR Post",
    ],
    file: "backend/src/functions/reviews.ts",
  },
  {
    id: "M07",
    name: "Folder Arch Analyzer",
    layer: "AI",
    chips: ["400-Node Tree Parse", "Stack Detection", "Grade A–F Scoring", "Migration Actions"],
    file: "backend/src/backend/ai/gemini/folder-analysis.ts",
  },
  {
    id: "M08",
    name: "Billing, Realtime & Ops",
    layer: "Billing",
    chips: ["Razorpay INR (Paise)", "Idempotent Ledger", "WAL WebSocket CDC", "SMTP Email Reports"],
    file: "backend/src/server.ts",
  },
];

export type AgentTier = "triage" | "auditor" | "synthesizer";

export interface AiAgentSpec {
  id: string;
  code: string;
  name: string;
  tier: AgentTier;
  scope: ScopeId | "multi";
  modelTier: "TRIAGE_MODEL" | "REVIEW_MODEL" | "REVIEW / ENTERPRISE";
  promptName: string;
  geminiFile: string;
  openaiFile: string;
  promptFile: string;
  inputBudget: string;
  outputContract: string;
  retryPolicy: string;
  axes: string[];
  roleTag: string;
}

export const AI_AGENTS: AiAgentSpec[] = [
  // Tier 1: Triage Gatekeepers (3)
  {
    id: "agent-triage-pr",
    code: "AG-01",
    name: "PR Diff Triage Agent",
    tier: "triage",
    scope: "pr",
    modelTier: "TRIAGE_MODEL",
    promptName: "TRIAGE_PR_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/pr-review.ts",
    openaiFile: "backend/src/backend/ai/openai/pr-review.ts",
    promptFile: "prompts/triage.ts",
    inputBudget: "1,500 chars/file · maxTokens: 5",
    outputContract: "TRIVIAL | REVIEW (fail-open)",
    retryPolicy: "1s RPM spacing · Fail-open to REVIEW",
    axes: ["Docs/Format Filter", "Lockfile Bypass", "Logic Gate"],
    roleTag: "Cost & Noise Gatekeeper",
  },
  {
    id: "agent-triage-folder",
    code: "AG-02",
    name: "Folder Structure Triage",
    tier: "triage",
    scope: "folder",
    modelTier: "TRIAGE_MODEL",
    promptName: "TRIAGE_FOLDER_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/folder-analysis.ts",
    openaiFile: "backend/src/backend/ai/openai/folder-analysis.ts",
    promptFile: "prompts/triage.ts",
    inputBudget: "2,000 chars tree · maxTokens: 5",
    outputContract: "TRIVIAL (bypass 100/A) | REVIEW",
    retryPolicy: "Fail-open to REVIEW",
    axes: ["Toy Repo Detector", "Scale Threshold (<8 files)"],
    roleTag: "Early-Return Classifier",
  },
  {
    id: "agent-triage-codebase",
    code: "AG-03",
    name: "Codebase Scale Triage",
    tier: "triage",
    scope: "codebase",
    modelTier: "TRIAGE_MODEL",
    promptName: "TRIAGE_CODEBASE_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/prompts/triage.ts",
    openaiFile: "backend/src/backend/ai/openai/prompts/triage.ts",
    promptFile: "prompts/triage.ts",
    inputBudget: "Manifest slice · maxTokens: 5",
    outputContract: "TRIVIAL | REVIEW",
    retryPolicy: "Fail-open to REVIEW",
    axes: ["Script vs Production App", "Depth Classifier"],
    roleTag: "Repository Scope Filter",
  },
  // Tier 2: Specialist Auditors (4)
  {
    id: "agent-audit-pr",
    code: "AG-04",
    name: "PR File Specialist Auditor",
    tier: "auditor",
    scope: "pr",
    modelTier: "REVIEW / ENTERPRISE",
    promptName: "PR_FILE_AUDIT_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/pr-review.ts",
    openaiFile: "backend/src/backend/ai/openai/pr-review.ts",
    promptFile: "prompts/pr-review-prompts.ts",
    inputBudget: "8,000 chars/file (±40L + imports)",
    outputContract: "JSON { findings[] with bad_code + suggested_fix }",
    retryPolicy: "3x exp backoff (2s → 4s → 8s) on 429",
    axes: ["Security", "Reliability", "Architecture", "Performance", "Testability", "Readability"],
    roleTag: "Per-File Deep Scanner",
  },
  {
    id: "agent-audit-codebase",
    code: "AG-05",
    name: "Codebase Chunk Auditor",
    tier: "auditor",
    scope: "codebase",
    modelTier: "REVIEW_MODEL",
    promptName: "CODEBASE_CHUNK_AUDIT_SYSTEM_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/codebase-audit.ts",
    openaiFile: "backend/src/backend/ai/openai/codebase-audit.ts",
    promptFile: "prompts/codebase-audit.ts",
    inputBudget: "10 files/chunk · 8k chars/file · max 60 files",
    outputContract: "JSON { findings[] ranked + ok badges }",
    retryPolicy: "5x exp backoff (3s → 48s) · Single-pass ≤15 files",
    axes: ["Security", "Reliability", "Architecture", "Performance", "Testability", "Readability"],
    roleTag: "Chunked Repo Scanner",
  },
  {
    id: "agent-audit-api",
    code: "AG-06",
    name: "API & DB Concurrency Auditor",
    tier: "auditor",
    scope: "api",
    modelTier: "REVIEW_MODEL",
    promptName: "API_CHUNK_AUDIT_SYSTEM_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/api-analyser.ts",
    openaiFile: "backend/src/backend/ai/openai/api-analyser.ts",
    promptFile: "prompts/api-analyser.ts",
    inputBudget: "10 files/chunk · max 40 API/DB files",
    outputContract: "JSON { findings[] SQL / Locks / API Safety }",
    retryPolicy: "5x exp backoff (3s → 48s) · 1s chunk pacing",
    axes: ["SQL & Query Perf", "Concurrency & Locks", "API Safety & Auth"],
    roleTag: "Backend & DB Specialist",
  },
  {
    id: "agent-audit-folder",
    code: "AG-07",
    name: "Folder Clean-Arch Auditor",
    tier: "auditor",
    scope: "folder",
    modelTier: "REVIEW_MODEL",
    promptName: "FOLDER_ANALYSIS_SYSTEM_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/folder-analysis.ts",
    openaiFile: "backend/src/backend/ai/openai/folder-analysis.ts",
    promptFile: "prompts/folder-analysis.ts",
    inputBudget: "Up to 400 ASCII tree nodes",
    outputContract: "JSON { org_score, grade, ideal_tree, migrations[≤15], annotations }",
    retryPolicy: "3x exp backoff (3s → 6s → 12s) on 429",
    axes: [
      "SoC",
      "Missing Dirs",
      "Misplaced Files",
      "Naming",
      "Boundaries",
      "Tests",
      "Config",
      "Feature/Layer",
    ],
    roleTag: "Clean Architecture Expert",
  },
  // Tier 3: Holistic Synthesizers (3)
  {
    id: "agent-synth-pr",
    code: "AG-08",
    name: "PR Holistic Synthesizer",
    tier: "synthesizer",
    scope: "pr",
    modelTier: "REVIEW / ENTERPRISE",
    promptName: "PR_SYNTHESIS_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/pr-review.ts",
    openaiFile: "backend/src/backend/ai/openai/pr-review.ts",
    promptFile: "prompts/pr-review-prompts.ts",
    inputBudget: "PR meta + file list + all file findings",
    outputContract: "JSON { health_score, 7-section summary, findings[] }",
    retryPolicy: "3x exp backoff (2s → 4s → 8s)",
    axes: ["Dedup", "Deterministic Score", "7-Header Exec Report"],
    roleTag: "Final PR Scorer & Compiler",
  },
  {
    id: "agent-synth-codebase",
    code: "AG-09",
    name: "Codebase Audit Synthesizer",
    tier: "synthesizer",
    scope: "codebase",
    modelTier: "REVIEW_MODEL",
    promptName: "CODEBASE_SYNTHESIS_SYSTEM_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/codebase-audit.ts",
    openaiFile: "backend/src/backend/ai/openai/codebase-audit.ts",
    promptFile: "prompts/codebase-audit.ts",
    inputBudget: "60 file manifest + merged chunk findings",
    outputContract: "JSON { health_score, ASCII tree + 7-section summary, ≤20 findings }",
    retryPolicy: "5x exp backoff (3s → 48s)",
    axes: ["Cross-File Dedup", "ASCII Tree Blueprint", "Top-20 Ranking"],
    roleTag: "Principal Arch Synthesizer",
  },
  {
    id: "agent-synth-api",
    code: "AG-10",
    name: "API & Load-Sim Synthesizer",
    tier: "synthesizer",
    scope: "api",
    modelTier: "REVIEW_MODEL",
    promptName: "API_SYNTHESIS_SYSTEM_PROMPT",
    geminiFile: "backend/src/backend/ai/gemini/api-analyser.ts",
    openaiFile: "backend/src/backend/ai/openai/api-analyser.ts",
    promptFile: "prompts/api-analyser.ts",
    inputBudget: "40 API files + merged chunk findings",
    outputContract: "JSON { health_score, 5-section summary + 3 Load Sims, ≤20 findings }",
    retryPolicy: "5x exp backoff (3s → 48s)",
    axes: ["DB Readiness Score", "Locking Synthesis", "3 Load Test Plans"],
    roleTag: "Principal DB Synthesizer",
  },
];

export const AI_FILE_TREE = [
  { path: "orchestrator.ts", role: "Master Router & Failover", group: "core" as const, lines: 488 },
  { path: "gemini/client.ts", role: "Raw HTTP & JSON Parser", group: "gemini" as const, lines: 95 },
  {
    path: "gemini/models.ts",
    role: "3-Tier Selector + Key Pool",
    group: "gemini" as const,
    lines: 57,
  },
  {
    path: "gemini/pr-review.ts",
    role: "3-Stage PR Pipeline",
    group: "gemini" as const,
    lines: 478,
  },
  {
    path: "gemini/codebase-audit.ts",
    role: "Chunked Codebase Engine",
    group: "gemini" as const,
    lines: 238,
  },
  {
    path: "gemini/api-analyser.ts",
    role: "API/DB Chunk Engine",
    group: "gemini" as const,
    lines: 247,
  },
  {
    path: "gemini/folder-analysis.ts",
    role: "Triage + Tree Architect",
    group: "gemini" as const,
    lines: 104,
  },
  {
    path: "gemini/prompts/* (6 files)",
    role: "Triage, PR, Codebase, API, Folder",
    group: "prompt" as const,
    lines: 510,
  },
  {
    path: "openai/client.ts + models.ts",
    role: "Mirror HTTP + Key Pool",
    group: "openai" as const,
    lines: 152,
  },
  {
    path: "openai/{pr,codebase,api,folder}.ts",
    role: "4 Mirror Failover Runners",
    group: "openai" as const,
    lines: 1067,
  },
  {
    path: "openai/prompts/* (6 files)",
    role: "6 Mirror System Prompts",
    group: "prompt" as const,
    lines: 510,
  },
];

export interface PipelineStage {
  step: string;
  title: string;
  shortLabel: string;
  module: string;
  fn: string;
  metric: string;
  input: string;
  output: string;
  colorVar: string;
  guards: string[];
}

export const PR_PIPELINE_STAGES: PipelineStage[] = [
  {
    step: "01",
    title: "Ingest & Credit Gate",
    shortLabel: "Ingest",
    module: "server.ts / review-processor",
    fn: "createReview() / webhook",
    metric: "< 50ms HTTP 202",
    input: "PR URL or GitHub Webhook",
    output: "reviews (pending) + review_queue row",
    colorVar: "var(--sev-low)",
    guards: [
      "HMAC-SHA256 timingSafeEqual",
      "Zod URL regex",
      "30-day credit renewal RPC",
      "Block-list check",
    ],
  },
  {
    step: "02",
    title: "Atomic Mutex Claim",
    shortLabel: "Queue",
    module: "queue.server.ts",
    fn: "claim_next_queue_item_v3()",
    metric: "< 15ms lock · 4 workers",
    input: "Pending queue item",
    output: "Row-locked worker task",
    colorVar: "var(--accent)",
    guards: [
      "FOR UPDATE SKIP LOCKED",
      "Dynamic queue_concurrency (15s TTL)",
      "SIGTERM 30s drain",
      "5^attempts backoff",
    ],
  },
  {
    step: "03",
    title: "3-Tier Diff Fetch",
    shortLabel: "Diff Fetch",
    module: "pull-request.server.ts",
    fn: "fetchPr() + aggregatedFallback",
    metric: "60,000 char cap",
    input: "owner / repo / PR #",
    output: "PR metadata + unified diff",
    colorVar: "var(--sev-low)",
    guards: [
      "Primary vnd.github.diff",
      "Fallback vnd.github.v3.diff",
      "Fallback /pulls/{n}/files patch stitch",
      "User OAuth token (5k req/hr)",
    ],
  },
  {
    step: "04",
    title: "Regex Noise Pruner",
    shortLabel: "Prune",
    module: "pr-review.ts",
    fn: "splitDiffByFile() + isNoiseFile()",
    metric: "0 LLM tokens",
    input: "Raw unified diff",
    output: "Code-only file diff map",
    colorVar: "var(--sev-ok)",
    guards: [
      "Drops node_modules/",
      "Drops package-lock/yarn/pnpm/bun",
      "Drops media, fonts, archives",
      "Drops dist/build/.next/.nuxt",
    ],
  },
  {
    step: "05",
    title: "Tier-1 AI Triage Gate",
    shortLabel: "AI Triage",
    module: "pr-review.ts + triage.ts",
    fn: "triageFileDiff()",
    metric: "maxTokens: 5",
    input: "1,500-char diff preview",
    output: "TRIVIAL (skip) | REVIEW",
    colorVar: "var(--sev-med)",
    guards: [
      "Skips docs/formatting/type-only",
      "Instant 100/100 if all trivial",
      "Fail-open on API error",
      "1s RPM pacing",
    ],
  },
  {
    step: "06",
    title: "±40L Context Slicer",
    shortLabel: "Slice ±40L",
    module: "pr-review.ts",
    fn: "extractContext() + headSha fetch",
    metric: "8,000 char cap/file",
    input: "headSha raw file + @@ hunks",
    output: "Imports (≤150L) + merged ±40L ranges",
    colorVar: "var(--accent)",
    guards: [
      "Exact line-number prefixes",
      "Overlapping window merge",
      "ES/CJS import extraction",
      "Cost-spike truncation",
    ],
  },
  {
    step: "07",
    title: "Tier-2 6-Axis File Audit",
    shortLabel: "6-Axis Audit",
    module: "orchestrator → gemini/openai",
    fn: "auditSingleFile()",
    metric: "JSON Mode · 3x Retry",
    input: "Compressed code slice",
    output: "Structured findings[] per file",
    colorVar: "var(--sev-high)",
    guards: [
      "6 priority axes",
      "Complete runnable suggested_fix",
      "No speculation constraint",
      "Pro auto-failover Gemini ↔ OpenAI",
    ],
  },
  {
    step: "08",
    title: "Synthesis, CDC & 1-Click Fix",
    shortLabel: "Synthesize",
    module: "pr-review + review-processor",
    fn: "saveResult() + applyFindingFix()",
    metric: "< 50ms WAL Push",
    input: "All file findings + PR meta",
    output: "Health Score + Realtime UI + Git Commit",
    colorVar: "var(--sev-ok)",
    guards: [
      "7-section executive markdown",
      "Max 15–20 normalized findings",
      "Supabase Realtime WebSocket",
      "1-click PUT commit + Email report",
    ],
  },
];

export const REVIEW_AXES = [
  {
    axis: "Security",
    weight: 25,
    color: "var(--sev-crit)",
    checks: ["SQLi / XSS / SSRF", "Auth Bypass", "Hardcoded Secrets", "Rate Limits"],
  },
  {
    axis: "Performance",
    weight: 15,
    color: "var(--sev-high)",
    checks: ["N+1 Queries", "Blocking I/O", "Missing Indexes", "Memory Leaks"],
  },
  {
    axis: "Architecture",
    weight: 12,
    color: "var(--sev-med)",
    checks: ["Layer Violations", "Circular Imports", "God Modules >500L", "Wrong Folder"],
  },
  {
    axis: "Reliability",
    weight: 10,
    color: "var(--sev-low)",
    checks: ["Race Conditions", "Null Dereference", "Swallowed Errors", "Non-Atomic TX"],
  },
  {
    axis: "Testability",
    weight: 5,
    color: "var(--accent)",
    checks: [
      "No DI / Singletons",
      "Time-Coupled Code",
      "Constructor Side-Effects",
      "Exact QA Cases",
    ],
  },
  {
    axis: "Readability",
    weight: 3,
    color: "var(--sev-ok)",
    checks: ["Dead Code", "Magic Constants", "Functions >20L", "Misleading Names"],
  },
];

export const API_AUDIT_PILLARS = [
  {
    axis: "SQL & Query Perf",
    weight: 40,
    color: "var(--sev-crit)",
    checks: ["Missing Indexes", "N+1 Loops", "Unbounded Selects", "No Pagination"],
  },
  {
    axis: "Concurrency & Locks",
    weight: 35,
    color: "var(--sev-high)",
    checks: ["Row-Lock Risks", "Non-Atomic TX", "State Race Hazards", "Long Transactions"],
  },
  {
    axis: "API Safety & Auth",
    weight: 25,
    color: "var(--sev-low)",
    checks: ["Schema Validation", "Rate Limiting", "CORS Policy", "Admin Exposure"],
  },
];

export const FOLDER_AUDIT_PILLARS = [
  { axis: "Separation of Concerns", weight: 20, color: "var(--accent)" },
  { axis: "Server/Client Boundary", weight: 18, color: "var(--sev-crit)" },
  { axis: "Misplaced Files", weight: 15, color: "var(--sev-high)" },
  { axis: "Missing Core Dirs", weight: 13, color: "var(--sev-med)" },
  { axis: "Naming Conventions", weight: 10, color: "var(--sev-low)" },
  { axis: "Feature vs Layer", weight: 10, color: "var(--sev-ok)" },
  { axis: "Test Co-Location", weight: 7, color: "var(--sev-low)" },
  { axis: "Config Hygiene", weight: 7, color: "var(--accent)" },
];

export const NFR_BENCHMARKS = [
  {
    metric: "API p95 Latency",
    value: "< 180ms",
    pct: 92,
    target: "Express REST Gateway",
    color: "var(--accent)",
  },
  {
    metric: "Queue Claim Lock",
    value: "< 15ms",
    pct: 96,
    target: "SKIP LOCKED RPC v3",
    color: "var(--sev-ok)",
  },
  {
    metric: "AI Auto-Failover",
    value: "< 250ms",
    pct: 94,
    target: "Gemini ↔ OpenAI",
    color: "var(--sev-low)",
  },
  {
    metric: "Realtime CDC Push",
    value: "< 50ms",
    pct: 95,
    target: "Postgres WAL → WSS",
    color: "var(--sev-ok)",
  },
  {
    metric: "PR Turnaround",
    value: "8 – 28s",
    pct: 86,
    target: "95% standard PRs",
    color: "var(--sev-med)",
  },
  {
    metric: "Platform SLA",
    value: "99.98%",
    pct: 99,
    target: "Dual-Engine Uptime",
    color: "var(--accent)",
  },
];

export interface DbDomainGroup {
  domain: string;
  color: string;
  tables: Array<{
    name: string;
    pk: string;
    keyCols: string[];
    rls: boolean;
    relations?: string;
  }>;
}

export const DB_DOMAINS: DbDomainGroup[] = [
  {
    domain: "Core Review Engine",
    color: "var(--accent)",
    tables: [
      {
        name: "reviews",
        pk: "id (uuid)",
        keyCols: ["review_type", "health_score", "status", "share_token"],
        rls: true,
        relations: "1:N findings",
      },
      {
        name: "findings",
        pk: "id (uuid)",
        keyCols: ["severity", "category", "bad_code", "suggested_fix"],
        rls: true,
        relations: "FK reviews",
      },
      {
        name: "review_queue",
        pk: "id (uuid)",
        keyCols: ["status", "attempts", "worker_id", "next_retry_at"],
        rls: true,
        relations: "RPC v3 mutex",
      },
      {
        name: "review_events",
        pk: "id (uuid)",
        keyCols: ["installation_id", "event_type", "payload"],
        rls: true,
        relations: "Webhook log",
      },
    ],
  },
  {
    domain: "Folder Intelligence",
    color: "var(--sev-low)",
    tables: [
      {
        name: "folder_analyses",
        pk: "id (uuid)",
        keyCols: ["organization_score", "grade", "ideal_tree", "folder_annotations"],
        rls: true,
        relations: "1:N actions",
      },
      {
        name: "folder_migration_actions",
        pk: "id (uuid)",
        keyCols: ["priority", "from_path", "to_path", "sort_order"],
        rls: true,
        relations: "FK folder_analyses",
      },
    ],
  },
  {
    domain: "Identity & Collaboration",
    color: "var(--sev-ok)",
    tables: [
      {
        name: "profiles",
        pk: "id (uuid)",
        keyCols: ["plan", "review_credits", "is_admin", "is_blocked", "has_password"],
        rls: true,
        relations: "1:N reviews",
      },
      {
        name: "teams",
        pk: "id (uuid)",
        keyCols: ["name", "owner_id"],
        rls: true,
        relations: "1:N members",
      },
      {
        name: "team_members",
        pk: "id (uuid)",
        keyCols: ["team_id", "user_id", "role"],
        rls: true,
        relations: "is_team_member()",
      },
      {
        name: "github_installations",
        pk: "id (uuid)",
        keyCols: ["installation_id", "account_login", "repository_selection"],
        rls: true,
        relations: "Webhook map",
      },
    ],
  },
  {
    domain: "Billing & Subscriptions",
    color: "var(--sev-high)",
    tables: [
      {
        name: "pricing_plans",
        pk: "id (text)",
        keyCols: ["price_monthly", "price_annual", "credits_per_month"],
        rls: true,
        relations: "INR Paise",
      },
      {
        name: "payment_transactions",
        pk: "id (razorpay_id)",
        keyCols: ["order_id", "user_id", "amount", "billing_cycle"],
        rls: true,
        relations: "Idempotency",
      },
    ],
  },
  {
    domain: "AI Vault, Ops & CMS",
    color: "var(--sev-med)",
    tables: [
      {
        name: "system_ai_keys",
        pk: "id (uuid)",
        keyCols: ["provider", "api_key_encrypted", "is_active"],
        rls: true,
        relations: "Round-robin",
      },
      {
        name: "system_settings",
        pk: "key (text)",
        keyCols: ["ai_provider", "parallel_engine_enabled", "queue_concurrency"],
        rls: true,
        relations: "10–15s TTL",
      },
      {
        name: "review_api_logs",
        pk: "id (uuid)",
        keyCols: ["request_id", "tokens", "latency_ms"],
        rls: true,
        relations: "Auto-purge",
      },
      {
        name: "blog_posts",
        pk: "id (uuid)",
        keyCols: ["slug", "title", "published"],
        rls: true,
        relations: "Public CMS",
      },
      {
        name: "user_feedback",
        pk: "id (uuid)",
        keyCols: ["user_id", "rating", "message"],
        rls: true,
        relations: "Admin inbox",
      },
    ],
  },
];

export const PG_RPCS = [
  { name: "claim_next_queue_item_v3", role: "Atomic FOR UPDATE SKIP LOCKED claim" },
  { name: "check_and_renew_profile_limits", role: "30-day cycle renewal & Pro expiry check" },
  { name: "upgrade_user_plan", role: "Atomic Pro upgrade (30d / 365d) + 150 cr" },
  { name: "deduct_review_credits", role: "Safe credit debit per review type" },
  { name: "is_admin / is_team_member", role: "RLS privilege guard functions" },
  { name: "purge_completed_queue_item", role: "Auto-cleanup DB trigger" },
];

export interface ApiEndpointSpec {
  method: "GET" | "POST";
  path: string;
  auth: "JWT" | "HMAC" | "Admin" | "Public";
  group: "Reviews" | "Folder AI" | "Billing" | "Webhooks" | "Admin & CMS";
  purpose: string;
}

export const API_ENDPOINTS: ApiEndpointSpec[] = [
  {
    method: "POST",
    path: "/api/reviews/create",
    auth: "JWT",
    group: "Reviews",
    purpose: "Validate PR/Workspace URL & create pending review",
  },
  {
    method: "POST",
    path: "/api/reviews/process-review",
    auth: "JWT",
    group: "Reviews",
    purpose: "Enqueue job into review_queue & trigger worker pool",
  },
  {
    method: "POST",
    path: "/api/reviews/apply-fix",
    auth: "JWT",
    group: "Reviews",
    purpose: "1-click patch commit directly to remote GitHub branch",
  },
  {
    method: "POST",
    path: "/api/reviews/post-styled",
    auth: "JWT",
    group: "Reviews",
    purpose: "Post DevPulse or Human-styled review comment on PR",
  },
  {
    method: "POST",
    path: "/api/reviews/retry",
    auth: "JWT",
    group: "Reviews",
    purpose: "Reset findings & re-run failed review",
  },
  {
    method: "POST",
    path: "/api/reviews/email-report",
    auth: "JWT",
    group: "Reviews",
    purpose: "Send HTML audit digest via Nodemailer",
  },
  {
    method: "POST",
    path: "/api/reviews/user-repos",
    auth: "JWT",
    group: "Reviews",
    purpose: "List user's GitHub repos via OAuth token",
  },
  {
    method: "POST",
    path: "/api/reviews/pr-pulls",
    auth: "JWT",
    group: "Reviews",
    purpose: "Fetch open pull requests for repo",
  },
  {
    method: "POST",
    path: "/api/reviews/git-tree",
    auth: "JWT",
    group: "Reviews",
    purpose: "Fetch recursive GitHub tree for workspace",
  },
  {
    method: "POST",
    path: "/api/reviews/user-profile",
    auth: "JWT",
    group: "Reviews",
    purpose: "Return plan, credits, expiry & admin role",
  },
  {
    method: "POST",
    path: "/api/folder-analysis/analyze",
    auth: "JWT",
    group: "Folder AI",
    purpose: "Run AI clean-architecture analysis on file tree",
  },
  {
    method: "POST",
    path: "/api/folder-analysis/save",
    auth: "JWT",
    group: "Folder AI",
    purpose: "Persist org score, ideal tree & migration actions",
  },
  {
    method: "POST",
    path: "/api/folder-analysis/get",
    auth: "JWT",
    group: "Folder AI",
    purpose: "Retrieve saved folder analysis by UUID",
  },
  {
    method: "POST",
    path: "/api/folder-analysis/get-by-token",
    auth: "Public",
    group: "Folder AI",
    purpose: "Public read-only shared folder audit",
  },
  {
    method: "POST",
    path: "/api/folder-analysis/list",
    auth: "JWT",
    group: "Folder AI",
    purpose: "List user's folder analysis history",
  },
  {
    method: "POST",
    path: "/api/folder-analysis/delete",
    auth: "JWT",
    group: "Folder AI",
    purpose: "Delete folder analysis record",
  },
  {
    method: "GET",
    path: "/api/pricing/plans",
    auth: "Public",
    group: "Billing",
    purpose: "Fetch INR pricing tiers (Free / Pro)",
  },
  {
    method: "POST",
    path: "/api/pricing/razorpay/checkout",
    auth: "JWT",
    group: "Billing",
    purpose: "Create Razorpay INR order (99,900 / 958,800 paise)",
  },
  {
    method: "POST",
    path: "/api/pricing/razorpay/verify",
    auth: "JWT",
    group: "Billing",
    purpose: "HMAC-SHA256 verify + idempotent upgrade_user_plan",
  },
  {
    method: "POST",
    path: "/api/public/github/webhook",
    auth: "HMAC",
    group: "Webhooks",
    purpose: "Auto-trigger PR review on open/reopen/synchronize",
  },
  {
    method: "POST",
    path: "/api/pricing/razorpay/webhook",
    auth: "HMAC",
    group: "Webhooks",
    purpose: "Redundant order.paid / payment.captured settlement",
  },
  {
    method: "GET",
    path: "/health",
    auth: "Public",
    group: "Webhooks",
    purpose: "CDN & Render 10-min self-pinger health check",
  },
  {
    method: "POST",
    path: "/api/admin/metrics",
    auth: "Admin",
    group: "Admin & CMS",
    purpose: "Aggregate reviews, credits, queue & latency stats",
  },
  {
    method: "POST",
    path: "/api/admin/update-settings",
    auth: "Admin",
    group: "Admin & CMS",
    purpose: "Hot-switch ai_provider & parallel_engine_enabled",
  },
  {
    method: "POST",
    path: "/api/admin/users + update-credits/plan",
    auth: "Admin",
    group: "Admin & CMS",
    purpose: "User search, credit grants, plan & block toggle",
  },
  {
    method: "GET",
    path: "/api/blog/posts + post-by-slug",
    auth: "Public",
    group: "Admin & CMS",
    purpose: "Published engineering blog CMS endpoints",
  },
];

export const DESIGN_TOKENS = {
  surfaces: [
    { name: "--bg", dark: "#0A0A0B", light: "#FAFAFA", usage: "Canvas" },
    { name: "--bg-elev", dark: "#111114", light: "#FFFFFF", usage: "Cards / Nav" },
    { name: "--bg-soft", dark: "#16161A", light: "#F2F2F4", usage: "Soft Fill" },
    { name: "--bg-code", dark: "#0F0F12", light: "#F6F6F8", usage: "Code Blocks" },
    { name: "--border", dark: "#1F1F25", light: "#E4E4E8", usage: "1px Hairline" },
  ],
  accent: [
    { name: "--accent", dark: "#BEF264", light: "#4D7C0F", usage: "Primary Pulse" },
    {
      name: "--accent-soft",
      dark: "rgba(190,242,100,0.12)",
      light: "rgba(77,124,15,0.10)",
      usage: "Tinted Pill",
    },
    { name: "--accent-ink", dark: "#0A0A0B", light: "#FFFFFF", usage: "Ink on Solid" },
  ],
  severity: [
    { level: "crit", name: "--sev-crit", dark: "#FB7185", light: "#DC2626", deduction: "-25 pts" },
    { level: "high", name: "--sev-high", dark: "#FB923C", light: "#EA580C", deduction: "-15 pts" },
    { level: "med", name: "--sev-med", dark: "#FBBF24", light: "#CA8A04", deduction: "-5 pts" },
    { level: "low", name: "--sev-low", dark: "#60A5FA", light: "#2563EB", deduction: "-2 pts" },
    { level: "ok", name: "--sev-ok", dark: "#34D399", light: "#059669", deduction: "0 pts" },
  ],
};
