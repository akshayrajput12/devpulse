/**
 * Shared Phase-Wise Chunking, Concurrency Isolation, Finding Normalization,
 * and Deterministic Health Score Engine for PR, Codebase, and API Audits.
 */

export type NormalizedSeverity = "crit" | "high" | "med" | "low" | "ok";

export type NormalizedFinding = {
  severity: NormalizedSeverity;
  category: string;
  title: string;
  description: string;
  file_path: string;
  file: string;
  line_start: number | null;
  line_end: number | null;
  bad_code: string;
  suggested_fix: string;
  confidence: number;
};

const SEV_PENALTY: Record<NormalizedSeverity, number> = {
  crit: 25,
  high: 15,
  med: 5,
  low: 2,
  ok: 0,
};

const SEV_RANK: Record<NormalizedSeverity, number> = {
  crit: 0,
  high: 1,
  med: 2,
  low: 3,
  ok: 4,
};

const VALID_CATEGORIES = new Set([
  "security",
  "performance",
  "architecture",
  "reliability",
  "testability",
  "readability",
]);

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

export function normalizeSeverity(raw: unknown): NormalizedSeverity {
  const s = String(raw ?? "low").trim().toLowerCase();
  if (s === "crit" || s === "critical" || s === "blocker") return "crit";
  if (s === "high" || s === "major" || s === "error") return "high";
  if (s === "med" || s === "medium" || s === "moderate" || s === "warning" || s === "warn") return "med";
  if (s === "ok" || s === "clean" || s === "pass" || s === "passed") return "ok";
  return "low";
}

export function normalizeCategory(raw: unknown): string {
  const c = String(raw ?? "reliability").trim().toLowerCase();
  if (VALID_CATEGORIES.has(c)) return c;
  if (c.includes("sec") || c.includes("auth") || c.includes("owasp")) return "security";
  if (c.includes("perf") || c.includes("sql") || c.includes("query") || c.includes("index")) return "performance";
  if (c.includes("arch") || c.includes("struct") || c.includes("design") || c.includes("layer")) return "architecture";
  if (c.includes("test") || c.includes("qa")) return "testability";
  if (c.includes("read") || c.includes("style") || c.includes("maint")) return "readability";
  return "reliability";
}

/**
 * Normalizes, validates, deduplicates, and ranks findings by severity DESC.
 */
export function normalizeAndDedupeFindings(rawFindings: any[], maxCount = 20): NormalizedFinding[] {
  const seen = new Set<string>();
  const cleaned: NormalizedFinding[] = [];

  for (const item of rawFindings || []) {
    if (!item || typeof item !== "object") continue;

    const severity = normalizeSeverity(item.severity);
    const category = normalizeCategory(item.category);
    const filePath = String(item.file_path || item.file || "unknown").trim();
    const title = String(item.title || "Code Quality Finding").trim().slice(0, 200);
    const lineStart =
      typeof item.line_start === "number" && Number.isFinite(item.line_start) && item.line_start > 0
        ? Math.round(item.line_start)
        : null;
    const lineEnd =
      typeof item.line_end === "number" && Number.isFinite(item.line_end) && item.line_end > 0
        ? Math.round(item.line_end)
        : lineStart;

    const dedupeKey = `${filePath.toLowerCase()}::${lineStart ?? 0}::${title.toLowerCase().slice(0, 60)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const rawConf = Number(item.confidence);
    const confidence = Number.isFinite(rawConf)
      ? Math.max(10, Math.min(100, Math.round(rawConf)))
      : 82;

    cleaned.push({
      severity,
      category,
      title,
      description: String(item.description || "").trim(),
      file_path: filePath,
      file: filePath,
      line_start: lineStart,
      line_end: lineEnd,
      bad_code: String(item.bad_code || ""),
      suggested_fix: String(item.suggested_fix || ""),
      confidence,
    });
  }

  cleaned.sort((a, b) => {
    const rankDiff = SEV_RANK[a.severity] - SEV_RANK[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return b.confidence - a.confidence;
  });

  return cleaned.slice(0, maxCount);
}

/**
 * Deterministic Health Score safeguard:
 * Computes calibrated score from severity counts and prevents AI hallucinations
 * (e.g., returning 100 when critical issues exist, or NaN / out-of-range values).
 */
export function computeDeterministicHealthScore(
  findings: Array<{ severity?: string }>,
  aiProposedScore?: unknown,
): number {
  let penalty = 0;
  let actionableCount = 0;

  for (const f of findings || []) {
    const sev = normalizeSeverity(f.severity);
    if (sev !== "ok") {
      actionableCount += 1;
      penalty += SEV_PENALTY[sev];
    }
  }

  const deterministic = Math.max(0, Math.min(100, 100 - penalty));

  if (typeof aiProposedScore === "number" && Number.isFinite(aiProposedScore)) {
    const clampedAi = Math.max(0, Math.min(100, Math.round(aiProposedScore)));
    // Never allow AI to report 100 when actionable findings exist
    if (actionableCount > 0 && clampedAi >= 98) {
      return Math.min(deterministic, 95);
    }
    // Keep AI score within reasonable ±15 band of deterministic baseline
    if (Math.abs(clampedAi - deterministic) <= 15) {
      return clampedAi;
    }
    return Math.round((clampedAi + deterministic) / 2);
  }

  return deterministic;
}

/**
 * Token-budget-aware phase chunking for large codebases & API repos.
 * Packs files into batches respecting BOTH max file count and max character budget.
 */
export function buildBudgetedChunks(
  files: string[],
  filesContent: Record<string, string>,
  options?: { maxFilesPerChunk?: number; maxCharsPerChunk?: number; maxCharsPerFile?: number },
): string[][] {
  const maxFilesPerChunk = options?.maxFilesPerChunk ?? 8;
  const maxCharsPerChunk = options?.maxCharsPerChunk ?? 36_000;
  const maxCharsPerFile = options?.maxCharsPerFile ?? 8_000;

  const chunks: string[][] = [];
  let current: string[] = [];
  let currentChars = 0;

  for (const file of files) {
    const rawLen = (filesContent[file] ?? "").length;
    const effectiveLen = Math.min(rawLen, maxCharsPerFile) + file.length + 64;

    if (
      current.length > 0 &&
      (current.length >= maxFilesPerChunk || currentChars + effectiveLen > maxCharsPerChunk)
    ) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(file);
    currentChars += effectiveLen;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Executes phase workers with bounded concurrency and partial-success isolation.
 */
export async function runPhasePool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Array<{ ok: true; value: R; index: number } | { ok: false; error: string; index: number }>> {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  const results: Array<{ ok: true; value: R; index: number } | { ok: false; error: string; index: number }> =
    new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const idx = cursor++;
      try {
        const value = await worker(items[idx], idx);
        results[idx] = { ok: true, value, index: idx };
      } catch (err) {
        results[idx] = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          index: idx,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, () => next()));
  return results;
}

/**
 * Robust JSON extractor that handles markdown code fences, leading/trailing prose,
 * and trailing commas without crashing.
 */
export function parseLenientJson<T>(text: string, providerLabel = "AI"): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting the outermost JSON object
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const candidate = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // Strip trailing commas before } or ]
        const repaired = candidate.replace(/,\s*([}\]])/g, "$1");
        try {
          return JSON.parse(repaired);
        } catch {
          // Fall through
        }
      }
    }
    throw new Error(`${providerLabel} returned a non-JSON response`);
  }
}

/**
 * Deterministic fallback synthesis report if the final synthesis LLM call fails
 * after chunk/file audits already succeeded — preserves all findings instead of failing!
 */
export function buildFallbackSynthesisReport(params: {
  scope: "pr" | "codebase" | "api";
  targetName: string;
  files: string[];
  findings: NormalizedFinding[];
  failedChunks?: number;
}): { health_score: number; summary: string; findings: NormalizedFinding[] } {
  const findings = normalizeAndDedupeFindings(params.findings, 20);
  const score = computeDeterministicHealthScore(findings);

  const byCat = (cat: string) => findings.filter(f => f.category === cat && f.severity !== "ok");
  const formatBullets = (list: NormalizedFinding[], emptyMsg: string) =>
    list.length
      ? list.map(f => `- **[${f.severity.toUpperCase()}] ${f.title}** (\`${f.file_path}\`): ${f.description.slice(0, 180)}`).join("\n")
      : emptyMsg;

  const partialNote =
    params.failedChunks && params.failedChunks > 0
      ? `\n\n> Note: ${params.failedChunks} chunk(s) hit transient upstream limits; all remaining audited chunks are included below.`
      : "";

  if (params.scope === "api") {
    const summary = [
      `### 📊 Database & Query Performance\n${formatBullets(byCat("performance"), "No critical SQL or N+1 bottlenecks surfaced in audited chunks.")}${partialNote}`,
      `### ⚡ Concurrency & Locking Audit\n${formatBullets(byCat("reliability"), "No locking deadlocks or race conditions flagged.")}`,
      `### 🛡️ API Safety & Gateways\n${formatBullets(byCat("security"), "No critical API authorization or injection gaps detected.")}`,
      `### 🏗️ Backend Architecture & Layering\n${formatBullets(byCat("architecture"), `Audited ${params.files.length} backend files in ${params.targetName}.`)}`,
      `### 🧪 Load Simulation & Scalability Scenarios\n1. **Baseline Read Traffic:** 50 VUs for 2m verifying p95 < 200ms.\n2. **Spike Concurrency:** Ramp 20 → 200 VUs over 60s targeting write endpoints to validate row locks.\n3. **Sustained Soak:** 75 VUs for 10m checking connection pool stability and memory growth.`,
    ].join("\n\n");
    return { health_score: score, summary, findings };
  }

  const header1 = params.scope === "codebase" ? "### 📌 Codebase & Folder Architecture" : "### 📌 PR Overview";
  const summary = [
    `${header1}\nCompleted phase-wise audit across **${params.files.length} files** in \`${params.targetName}\`. Detected **${findings.filter(f => f.severity !== "ok").length}** actionable issues with a deterministic health score of **${score}/100**.${partialNote}`,
    `### 🔒 Security Analysis\n${formatBullets(byCat("security"), "No confirmed security vulnerabilities detected in audited scope.")}`,
    `### ⚡ Performance Analysis\n${formatBullets(byCat("performance"), "No high-impact performance bottlenecks detected.")}`,
    `### 🏗️ Architecture & Design\n${formatBullets(byCat("architecture"), "No major structural or layering violations detected.")}`,
    `### 🛡️ Reliability Analysis\n${formatBullets(byCat("reliability"), "No crash paths or unhandled failure modes flagged.")}`,
    `### 🧪 Testability & QA Guide\n${formatBullets(byCat("testability"), "1. Add unit tests covering modified critical paths.\n2. Verify error-handling branches and boundary inputs.")}`,
    `### 📖 Readability & Maintainability\n${formatBullets(byCat("readability"), "Code readability and maintainability look solid across audited files.")}`,
  ].join("\n\n");

  return { health_score: score, summary, findings };
}
