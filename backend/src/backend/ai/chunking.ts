/**
 * Shared Phase-Wise Chunking, Concurrency Isolation, Source Hydration,
 * Finding Normalization, and Deterministic Health Score Engine for PR, Codebase, and API Audits.
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
 * Formats a file with 1-based line numbers so LLMs report exact line_start / line_end,
 * and adds an explicit non-error marker when context trimming occurs so LLMs never
 * hallucinate "truncated file / syntax error" findings.
 */
export function formatNumberedFileBlock(path: string, content: string, maxChars = 8000): string {
  const lines = (content ?? "").split("\n");
  const out: string[] = [];
  let charCount = 0;
  let truncated = false;

  for (let i = 0; i < lines.length; i += 1) {
    const numbered = `${i + 1}: ${lines[i]}`;
    if (charCount + numbered.length + 1 > maxChars) {
      truncated = true;
      break;
    }
    out.push(numbered);
    charCount += numbered.length + 1;
  }

  const footer = truncated
    ? `\n/* [DEVPULSE_CONTEXT_LIMIT: Remaining ${lines.length - out.length} lines omitted for token budget. File is NOT truncated in git — DO NOT report truncation or EOF as a syntax error.] */`
    : "";

  return `=== FILE: ${path} (${lines.length} lines) ===\n${out.join("\n")}${footer}`;
}

function isFalseTruncationHallucination(title: string, description: string): boolean {
  const combined = `${title} ${description}`.toLowerCase();
  return (
    (combined.includes("truncated") &&
      (combined.includes("syntax error") ||
        combined.includes("incomplete") ||
        combined.includes("cut off") ||
        combined.includes("eof") ||
        combined.includes("context size") ||
        combined.includes("devpulse_context_limit"))) ||
    title.toLowerCase().includes("truncated file")
  );
}

function isWeakCodeSnippet(code?: string | null): boolean {
  if (!code) return true;
  const t = code.trim();
  if (t.length < 4) return true;
  const lower = t.toLowerCase();
  return (
    lower === "// no code captured" ||
    lower === "// no fix available" ||
    lower === "..." ||
    lower === "n/a" ||
    lower === "none"
  );
}

/**
 * Extracts real source code from filesContent when an LLM omitted or abbreviated bad_code.
 */
export function extractSnippetFromSource(
  source: string,
  lineStart: number | null,
  lineEnd: number | null,
  title: string,
  description: string,
): { snippet: string; lineStart: number | null; lineEnd: number | null } {
  const lines = source.split("\n");
  if (lines.length === 0) return { snippet: "", lineStart, lineEnd };

  // 1. If we have valid line numbers, extract the exact block (±2 lines context, max 24 lines)
  if (lineStart && lineStart >= 1 && lineStart <= lines.length) {
    const startIdx = Math.max(0, lineStart - 2);
    const targetEnd = lineEnd && lineEnd >= lineStart ? lineEnd : lineStart + 6;
    const endIdx = Math.min(lines.length, Math.max(startIdx + 6, Math.min(targetEnd + 2, startIdx + 24)));
    return {
      snippet: lines.slice(startIdx, endIdx).join("\n").trimEnd(),
      lineStart: startIdx + 1,
      lineEnd: endIdx,
    };
  }

  // 2. Otherwise search for high-signal code identifiers mentioned in title or description
  const text = `${title} ${description}`;
  const backtickTokens = [...text.matchAll(/`([A-Za-z0-9_.$[\]-]{3,50})`/g)].map(m => m[1]);
  const camelTokens = [...text.matchAll(/\b([a-z]+[A-Z][A-Za-z0-9_]{2,}|[A-Z][a-z]+[A-Z][A-Za-z0-9_]{2,})\b/g)].map(
    m => m[1],
  );
  const keywordHints: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("dangerouslysetinnerhtml") || lower.includes("xss")) keywordHints.push("dangerouslySetInnerHTML", "innerHTML");
  if (lower.includes("password") || lower.includes("credential")) keywordHints.push("password", "bcrypt", "compare", "secret");
  if (lower.includes("json.parse") || lower.includes("json parsing")) keywordHints.push("JSON.parse");
  if (lower.includes("ssl") || lower.includes("rejectunauthorized")) keywordHints.push("rejectUnauthorized", "ssl");
  if (lower.includes("upload") || lower.includes("multer") || lower.includes("file")) keywordHints.push("multer", "upload", "req.file", "formData");
  if (lower.includes("sql") || lower.includes("query") || lower.includes("injection")) keywordHints.push("SELECT ", "query(", "execute(", "raw(");
  if (lower.includes("dom") || lower.includes("queryselector")) keywordHints.push("document.", "querySelector", "getElementById");
  if (lower.includes("bootstrap") || lower.includes("schema") || lower.includes("init")) keywordHints.push("CREATE TABLE", "init", "bootstrap");
  if (lower.includes("auth") || lower.includes("admin") || lower.includes("role")) keywordHints.push("isAdmin", "role", "localStorage", "session");

  const searchTerms = [...new Set([...backtickTokens, ...camelTokens, ...keywordHints])];

  for (const term of searchTerms) {
    const idx = lines.findIndex(line => line.toLowerCase().includes(term.toLowerCase()));
    if (idx !== -1) {
      const startIdx = Math.max(0, idx - 2);
      const endIdx = Math.min(lines.length, idx + 12);
      return {
        snippet: lines.slice(startIdx, endIdx).join("\n").trimEnd(),
        lineStart: startIdx + 1,
        lineEnd: endIdx,
      };
    }
  }

  // 3. Final fallback: return the first meaningful 16 lines of the file
  const firstNonEmpty = Math.max(0, lines.findIndex(l => l.trim().length > 0));
  const endIdx = Math.min(lines.length, firstNonEmpty + 16);
  return {
    snippet: lines.slice(firstNonEmpty, endIdx).join("\n").trimEnd(),
    lineStart: firstNonEmpty + 1,
    lineEnd: endIdx,
  };
}

function findSourceForPath(filePath: string, filesContent?: Record<string, string>): string | null {
  if (!filesContent || !filePath) return null;
  if (filesContent[filePath]) return filesContent[filePath];
  const normalizedTarget = filePath.replace(/^\.?\//, "").toLowerCase();
  for (const [k, v] of Object.entries(filesContent)) {
    const nk = k.replace(/^\.?\//, "").toLowerCase();
    if (nk === normalizedTarget || nk.endsWith(`/${normalizedTarget}`) || normalizedTarget.endsWith(`/${nk}`)) {
      return v;
    }
  }
  return null;
}

/**
 * Normalizes, filters hallucinations, deduplicates, hydrates missing code snippets
 * from filesContent, and ranks findings by severity DESC.
 */
export function normalizeAndDedupeFindings(
  rawFindings: any[],
  maxCount = 20,
  filesContent?: Record<string, string>,
): NormalizedFinding[] {
  const seen = new Set<string>();
  const cleaned: NormalizedFinding[] = [];

  for (const item of rawFindings || []) {
    if (!item || typeof item !== "object") continue;

    const severity = normalizeSeverity(item.severity);
    const category = normalizeCategory(item.category);
    const filePath = String(item.file_path || item.file || "unknown").trim();
    const title = String(item.title || "Code Quality Finding").trim().slice(0, 200);
    const description = String(item.description || "").trim();

    if (isFalseTruncationHallucination(title, description)) continue;

    let lineStart =
      typeof item.line_start === "number" && Number.isFinite(item.line_start) && item.line_start > 0
        ? Math.round(item.line_start)
        : null;
    let lineEnd =
      typeof item.line_end === "number" && Number.isFinite(item.line_end) && item.line_end > 0
        ? Math.round(item.line_end)
        : lineStart;

    let badCode = String(item.bad_code || "").trim();
    const suggestedFix = String(item.suggested_fix || "").trim();

    // Hydrate bad_code directly from the real source file if missing or empty
    if (isWeakCodeSnippet(badCode) && severity !== "ok") {
      const source = findSourceForPath(filePath, filesContent);
      if (source) {
        const extracted = extractSnippetFromSource(source, lineStart, lineEnd, title, description);
        if (extracted.snippet) {
          badCode = extracted.snippet;
          if (!lineStart && extracted.lineStart) lineStart = extracted.lineStart;
          if (!lineEnd && extracted.lineEnd) lineEnd = extracted.lineEnd;
        }
      }
    }

    const dedupeKey = `${filePath.toLowerCase()}::${lineStart ?? 0}::${title.toLowerCase().slice(0, 50)}`;
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
      description,
      file_path: filePath,
      file: filePath,
      line_start: lineStart,
      line_end: lineEnd,
      bad_code: badCode,
      suggested_fix: suggestedFix,
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

function tokenOverlapScore(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let hits = 0;
  for (const w of wordsA) if (wordsB.has(w)) hits += 1;
  return hits / Math.max(wordsA.size, wordsB.size);
}

/**
 * Merges Phase-4 Synthesizer output back with Phase-3 Chunk Findings & raw filesContent
 * so `bad_code`, `suggested_fix`, `line_start`, and `line_end` are NEVER lost when the
 * Synthesizer summarizes or condenses findings!
 */
export function mergeSynthesizedWithOriginals(
  synthesizedRaw: any[] | undefined,
  originals: NormalizedFinding[],
  filesContent?: Record<string, string>,
  maxCount = 20,
): NormalizedFinding[] {
  if (!synthesizedRaw || synthesizedRaw.length === 0) {
    return normalizeAndDedupeFindings(originals, maxCount, filesContent);
  }

  const hydrated = synthesizedRaw.map((synth: any) => {
    if (!synth || typeof synth !== "object") return synth;
    const synthFile = String(synth.file_path || synth.file || "").trim().toLowerCase();
    const synthTitle = String(synth.title || "");

    // Find best matching Phase-3 original finding
    let bestMatch: NormalizedFinding | null = null;
    let bestScore = -1;

    for (const orig of originals) {
      const origFile = orig.file_path.toLowerCase();
      const sameFile =
        synthFile &&
        (origFile === synthFile || origFile.endsWith(`/${synthFile}`) || synthFile.endsWith(`/${origFile}`));
      const titleSim = tokenOverlapScore(synthTitle, orig.title);
      const lineBonus = synth.line_start && orig.line_start && Math.abs(synth.line_start - orig.line_start) <= 5 ? 0.5 : 0;
      const score = (sameFile ? 1.0 : 0) + titleSim + lineBonus;

      if (score > bestScore && (sameFile || titleSim >= 0.45)) {
        bestScore = score;
        bestMatch = orig;
      }
    }

    if (!bestMatch) return synth;

    const synthBad = String(synth.bad_code || "").trim();
    const synthFix = String(synth.suggested_fix || "").trim();

    return {
      ...synth,
      file_path: synth.file_path || synth.file || bestMatch.file_path,
      file: synth.file || synth.file_path || bestMatch.file_path,
      line_start: synth.line_start ?? bestMatch.line_start,
      line_end: synth.line_end ?? bestMatch.line_end,
      bad_code: !isWeakCodeSnippet(synthBad) ? synthBad : bestMatch.bad_code,
      suggested_fix: !isWeakCodeSnippet(synthFix) ? synthFix : bestMatch.suggested_fix,
      description: String(synth.description || "").length >= 20 ? synth.description : bestMatch.description,
    };
  });

  // Also ensure category diversity: if Synthesis dropped findings from other categories that were found in chunks, keep top ones up to maxCount
  const merged = normalizeAndDedupeFindings(hydrated, maxCount, filesContent);
  if (merged.length < maxCount && originals.length > merged.length) {
    const existingCats = new Set(merged.map(f => f.category));
    const extras = originals.filter(o => o.severity !== "ok" && !existingCats.has(o.category));
    if (extras.length > 0) {
      return normalizeAndDedupeFindings([...merged, ...extras], maxCount, filesContent);
    }
  }

  return merged;
}

/**
 * Deterministic Health Score safeguard:
 * - For PRs (≤ 15 files): direct calibrated severity subtraction.
 * - For large multi-file codebase/API audits (> 15 files): smooth diminishing-returns
 *   scaling so auditing 80 files reflects real repo health instead of collapsing every
 *   large repository to 0–9/100.
 */
export function computeDeterministicHealthScore(
  findings: Array<{ severity?: string }>,
  aiProposedScore?: unknown,
  auditedFileCount = 1,
): number {
  let rawPenalty = 0;
  let actionableCount = 0;

  for (const f of findings || []) {
    const sev = normalizeSeverity(f.severity);
    if (sev !== "ok") {
      actionableCount += 1;
      rawPenalty += SEV_PENALTY[sev];
    }
  }

  let deterministic: number;
  if (auditedFileCount > 15 && rawPenalty > 0) {
    // Smooth exponential decay calibrated for multi-file repos (e.g. 6 high + 4 med across 80 files -> ~42/100)
    const scaleFactor = Math.min(2.2, 1 + Math.log10(auditedFileCount / 10) * 0.9);
    const effectivePenalty = rawPenalty / scaleFactor;
    deterministic = Math.max(15, Math.min(96, Math.round(100 * Math.exp(-effectivePenalty / 85))));
  } else {
    deterministic = Math.max(0, Math.min(100, 100 - rawPenalty));
  }

  if (typeof aiProposedScore === "number" && Number.isFinite(aiProposedScore)) {
    const clampedAi = Math.max(0, Math.min(100, Math.round(aiProposedScore)));
    if (actionableCount > 0 && clampedAi >= 98) {
      return Math.min(deterministic, 95);
    }
    if (Math.abs(clampedAi - deterministic) <= 15) {
      return clampedAi;
    }
    return Math.round((clampedAi + deterministic) / 2);
  }

  return deterministic;
}

/**
 * Token-budget-aware phase chunking for large codebases & API repos.
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
 * Robust JSON extractor handling markdown fences, surrounding prose, and trailing commas.
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
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      const candidate = cleaned.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
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
 * Deterministic fallback synthesis report if the final synthesis LLM call fails.
 */
export function buildFallbackSynthesisReport(params: {
  scope: "pr" | "codebase" | "api";
  targetName: string;
  files: string[];
  findings: NormalizedFinding[];
  filesContent?: Record<string, string>;
  failedChunks?: number;
}): { health_score: number; summary: string; findings: NormalizedFinding[] } {
  const findings = normalizeAndDedupeFindings(params.findings, 20, params.filesContent);
  const score = computeDeterministicHealthScore(findings, undefined, params.files.length);

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
