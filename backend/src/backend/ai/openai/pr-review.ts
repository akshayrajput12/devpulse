import { callOpenAIRaw, parseJsonResponse, readOpenAIText, type OpenAIUsage } from "./client.js";
import { getOpenAIApiKey, selectModel, TRIAGE_MODEL } from "./models.js";
import { TRIAGE_PR_PROMPT } from "./prompts/triage.js";
import {
  PR_FILE_AUDIT_PROMPT,
  PR_SYNTHESIS_PROMPT,
  FOLDER_FILE_AUDIT_PROMPT,
  FOLDER_SYNTHESIS_PROMPT,
} from "./prompts/pr-review-prompts.js";
import { API_CHUNK_AUDIT_SYSTEM_PROMPT, API_SYNTHESIS_SYSTEM_PROMPT } from "./prompts/api-analyser.js";
import { CODEBASE_CHUNK_AUDIT_SYSTEM_PROMPT, CODEBASE_SYNTHESIS_SYSTEM_PROMPT } from "./prompts/codebase-audit.js";
import { logger } from "../../logging/logger.server.js";
import { isParallelEngineEnabled } from "../orchestrator.js";
import {
  buildFallbackSynthesisReport,
  computeDeterministicHealthScore,
  isRetryableHttpStatus,
  normalizeAndDedupeFindings,
  runPhasePool,
} from "../chunking.js";

export type ReviewAIResult = {
  health_score: number;
  summary: string;
  changed_files?: string[];
  findings: any[];
  usage: OpenAIUsage;
  model: string;
  triage: {
    fileCount: number;
    trivialCount: number;
    reviewedCount: number;
  };
};

function isNoiseFile(path: string): boolean {
  const noisePatterns = [
    /(^|\/)node_modules\//i,
    /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|poetry\.lock|Cargo\.lock)$/i,
    /\.(png|jpe?g|gif|svg|ico|webp|pdf|zip|gz|tar|mp4|mp3|woff2?|eot|ttf|map|min\.js|min\.css)$/i,
    /^(dist|build|out|\.next|\.nuxt|\.svelte-kit)\//i,
  ];
  return noisePatterns.some(pat => pat.test(path));
}

function parseChangedFiles(diff: string) {
  const files: string[] = [];
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      const file = line.slice(6).trim();
      if (file && file !== "/dev/null") files.push(file);
    }
  }
  return [...new Set(files)];
}

function splitDiffByFile(diff: string): Record<string, string> {
  const files: Record<string, string> = {};
  let currentFile = "";
  const lines: string[] = [];

  function flush() {
    if (currentFile && lines.length) files[currentFile] = lines.join("\n");
  }

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      flush();
      currentFile = "";
      lines.length = 0;
      lines.push(line);
    } else if (line.startsWith("+++ b/") && !currentFile) {
      currentFile = line.slice(6).trim();
      lines.push(line);
    } else {
      lines.push(line);
    }
  }
  flush();
  return files;
}

function getChangedLineNumbers(fileDiff: string): number[] {
  const changedLines: number[] = [];
  let currentLine = 0;

  for (const line of fileDiff.split("\n")) {
    if (line.startsWith("@@ ")) {
      const match = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (match) currentLine = parseInt(match[1], 10);
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      changedLines.push(currentLine);
      currentLine++;
    } else if (line.startsWith(" ") || line.startsWith("\\")) {
      currentLine++;
    }
  }
  return changedLines;
}

function isImportLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("import ") ||
    trimmed.startsWith("} from ") ||
    trimmed.startsWith("export * from ") ||
    trimmed.startsWith("from ") ||
    (trimmed.includes("require(") &&
      (trimmed.startsWith("const ") || trimmed.startsWith("let ") || trimmed.startsWith("var ") || trimmed.startsWith("import ")))
  );
}

function extractContext(fileContent: string, changedLines: number[]): string {
  const lines = fileContent.split("\n");
  const totalLines = lines.length;
  if (changedLines.length === 0) return "";

  const ranges = changedLines.map(line => [Math.max(1, line - 40), Math.min(totalLines, line + 40)]);
  ranges.sort((a, b) => a[0] - b[0]);
  const mergedRanges: [number, number][] = [];
  for (const range of ranges) {
    if (mergedRanges.length === 0) {
      mergedRanges.push(range as [number, number]);
    } else {
      const last = mergedRanges[mergedRanges.length - 1];
      if (range[0] <= last[1] + 1) last[1] = Math.max(last[1], range[1]);
      else mergedRanges.push(range as [number, number]);
    }
  }

  const sliceParts: string[] = [];
  const importLines: string[] = [];
  for (let i = 0; i < Math.min(totalLines, 150); i++) {
    if (isImportLine(lines[i])) importLines.push(`${i + 1}: ${lines[i]}`);
  }
  if (importLines.length > 0) {
    sliceParts.push("// Imports:");
    sliceParts.push(importLines.join("\n"));
  }

  for (const [start, end] of mergedRanges) {
    sliceParts.push(`\n// --- Context: lines ${start} to ${end} ---`);
    const block: string[] = [];
    for (let i = start - 1; i < end; i++) block.push(`${i + 1}: ${lines[i]}`);
    sliceParts.push(block.join("\n"));
  }

  return sliceParts.join("\n");
}

async function tryFetchFileFromGithub(
  owner: string,
  repo: string,
  path: string,
  headSha: string,
  token: string | null,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.raw",
      "User-Agent": "devpulse",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const encodedPath = path
      .split("/")
      .map(seg => encodeURIComponent(seg))
      .join("/");
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(headSha)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    logger.warn("github.fetch_file_failed", { owner, repo, path, headSha, error: String(e) });
    return null;
  }
}

async function triageFileDiff(requestId: string, reviewId: string, fileDiff: string) {
  try {
    const apiKey = getOpenAIApiKey();
    const res = await callOpenAIRaw({
      requestId,
      reviewId,
      model: TRIAGE_MODEL,
      systemPrompt: TRIAGE_PR_PROMPT,
      userContent: fileDiff.slice(0, 1500),
      apiKey,
      maxTokens: 5,
    });
    if (!res.ok) return "REVIEW";
    const { text, usage } = await readOpenAIText(res);
    logger.info("openai.triage_usage", { requestId, reviewId, model: TRIAGE_MODEL, usage });
    return text.trim().toUpperCase().includes("TRIVIAL") ? "TRIVIAL" : "REVIEW";
  } catch (error) {
    logger.warn("openai.triage_failed_open", { requestId, reviewId, error: String(error) });
    return "REVIEW";
  }
}

async function auditSingleFile(
  requestId: string,
  reviewId: string,
  filePath: string,
  fileSlice: string,
  model: string,
  systemPrompt: string,
): Promise<{ findings: any[]; usage: OpenAIUsage }> {
  const compressedSlice =
    fileSlice.length > 8000
      ? fileSlice.slice(0, 8000) + "\n\n...[Truncated at 8k chars cost safeguard]"
      : fileSlice;
  const userContent = `File: ${filePath}\n\nCode context:\n${compressedSlice}`;
  let promptTokenCount = 0;
  let candidatesTokenCount = 0;
  let totalTokenCount = 0;

  const maxRetries = 4;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getOpenAIApiKey();
    try {
      const res = await callOpenAIRaw({
        requestId,
        reviewId,
        model,
        systemPrompt,
        userContent,
        apiKey,
        jsonMode: true,
      });

      if (res.ok) {
        const { text, usage } = await readOpenAIText(res);
        if (usage) {
          promptTokenCount += usage.promptTokenCount || 0;
          candidatesTokenCount += usage.candidatesTokenCount || 0;
          totalTokenCount += usage.totalTokenCount || 0;
        }
        const parsed = parseJsonResponse<{ findings?: any[] }>(text);
        const findings = (parsed.findings || []).map(f => ({
          ...f,
          file: f.file || f.file_path || filePath,
          file_path: f.file_path || f.file || filePath,
        }));
        return {
          findings,
          usage: { promptTokenCount, candidatesTokenCount, totalTokenCount },
        };
      }

      const body = await res.text();
      if (!isRetryableHttpStatus(res.status) || attempt === maxRetries - 1) {
        throw new Error(`OpenAI file audit failed (${res.status}) for ${filePath}: ${body.slice(0, 250)}`);
      }
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
    }

    const delay = 2000 * Math.pow(2, attempt);
    logger.warn("openai.file_audit_retry", { requestId, reviewId, filePath, attempt: attempt + 1, delayMs: delay });
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return { findings: [], usage: { promptTokenCount, candidatesTokenCount, totalTokenCount } };
}

export async function callPrReviewAI(params: {
  requestId: string;
  reviewId: string;
  prMeta: string;
  diff: string;
  plan?: string;
  owner: string;
  repo: string;
  headSha: string;
  token: string | null;
  reviewType?: "pr" | "codebase" | "api" | "folder";
}): Promise<ReviewAIResult> {
  const model = selectModel(params.plan);
  const changedFiles = parseChangedFiles(params.diff);
  const fileDiffs = splitDiffByFile(params.diff);
  const parallelEnabled = await isParallelEngineEnabled();

  const reviewType = params.reviewType || "pr";
  let fileAuditPrompt = PR_FILE_AUDIT_PROMPT;
  let synthesisPrompt = PR_SYNTHESIS_PROMPT;

  if (reviewType === "api") {
    fileAuditPrompt = API_CHUNK_AUDIT_SYSTEM_PROMPT;
    synthesisPrompt = API_SYNTHESIS_SYSTEM_PROMPT;
  } else if (reviewType === "codebase") {
    fileAuditPrompt = CODEBASE_CHUNK_AUDIT_SYSTEM_PROMPT;
    synthesisPrompt = CODEBASE_SYNTHESIS_SYSTEM_PROMPT;
  } else if (reviewType === "folder") {
    fileAuditPrompt = FOLDER_FILE_AUDIT_PROMPT;
    synthesisPrompt = FOLDER_SYNTHESIS_PROMPT;
  }

  const entries = Object.entries(fileDiffs);
  const activeEntries = entries.filter(([path]) => !isNoiseFile(path));

  const triagePool = await runPhasePool(activeEntries, parallelEnabled ? 2 : 1, async ([path, chunk]) => {
    const verdict = await triageFileDiff(params.requestId, params.reviewId, chunk);
    return { path, chunk, verdict };
  });

  const triageResults = triagePool.map((res, idx) =>
    res.ok ? res.value : { path: activeEntries[idx][0], chunk: activeEntries[idx][1], verdict: "REVIEW" },
  );

  const filesToReview = triageResults.filter(r => r.verdict === "REVIEW");
  const trivialCount = entries.length - filesToReview.length;

  if (filesToReview.length === 0) {
    return {
      health_score: 100,
      summary: `### 📌 PR Overview\nNo significant source code changes detected or all files are trivial/noise. Checked files: ${changedFiles.join(", ") || "none"}.\n\n### 🔒 Security Analysis\nNo security implications detected in the changes.\n\n### ⚡ Performance Analysis\nNo performance bottlenecks or optimization areas detected.\n\n### 🏗️ Architecture & Design\nChanges adhere cleanly to architectural boundaries.\n\n### 🛡️ Reliability Analysis\nNo crash risk or unhandled error concerns detected.\n\n### 🧪 Testability & QA Guide\n1. Verify build passes on staging.\n\n### 📖 Readability & Maintainability\nCode quality remains clean and readable.`,
      changed_files: changedFiles,
      findings: [],
      usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
      model,
      triage: { fileCount: entries.length, trivialCount, reviewedCount: 0 },
    };
  }

  const auditPool = await runPhasePool(filesToReview, parallelEnabled ? 2 : 1, async ({ path, chunk }) => {
    const rawContent = await tryFetchFileFromGithub(params.owner, params.repo, path, params.headSha, params.token);
    const changedLines = getChangedLineNumbers(chunk);
    const slice = rawContent && changedLines.length > 0 ? extractContext(rawContent, changedLines) : chunk;
    if (!slice) return { findings: [], usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 } };
    return auditSingleFile(params.requestId, params.reviewId, path, slice, model, fileAuditPrompt);
  });

  let totalPromptTokens = 0;
  let totalCandidatesTokens = 0;
  let totalTotalTokens = 0;
  let failedFiles = 0;
  const rawFindings: any[] = [];

  for (const res of auditPool) {
    if (res.ok) {
      rawFindings.push(...res.value.findings);
      totalPromptTokens += res.value.usage.promptTokenCount || 0;
      totalCandidatesTokens += res.value.usage.candidatesTokenCount || 0;
      totalTotalTokens += res.value.usage.totalTokenCount || 0;
    } else {
      failedFiles += 1;
      logger.warn("openai.pr_file_phase_failed", {
        requestId: params.requestId,
        reviewId: params.reviewId,
        error: res.error,
      });
    }
  }

  if (failedFiles === filesToReview.length) {
    throw new Error(`OpenAI PR audit failed on all ${failedFiles} file(s).`);
  }

  const normalizedFindings = normalizeAndDedupeFindings(rawFindings, 20);
  const synthesisUserContent = JSON.stringify(
    {
      pr_metadata: params.prMeta,
      changed_files: changedFiles,
      parallel_audit_findings: normalizedFindings,
    },
    null,
    2,
  );

  let parsedSynthesis: any = null;
  const finalUsage: OpenAIUsage = {
    promptTokenCount: totalPromptTokens,
    candidatesTokenCount: totalCandidatesTokens,
    totalTokenCount: totalTotalTokens,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const apiKey = getOpenAIApiKey();
    try {
      const res = await callOpenAIRaw({
        requestId: params.requestId,
        reviewId: params.reviewId,
        model,
        systemPrompt: synthesisPrompt,
        userContent: synthesisUserContent,
        apiKey,
        jsonMode: true,
      });

      if (res.ok) {
        const { text, usage } = await readOpenAIText(res);
        if (usage) {
          finalUsage.promptTokenCount = (finalUsage.promptTokenCount || 0) + (usage.promptTokenCount || 0);
          finalUsage.candidatesTokenCount = (finalUsage.candidatesTokenCount || 0) + (usage.candidatesTokenCount || 0);
          finalUsage.totalTokenCount = (finalUsage.totalTokenCount || 0) + (usage.totalTokenCount || 0);
        }
        parsedSynthesis = parseJsonResponse(text);
        break;
      }

      if (!isRetryableHttpStatus(res.status)) break;
    } catch (err) {
      logger.warn("openai.pr_synthesis_attempt_failed", {
        requestId: params.requestId,
        attempt: attempt + 1,
        error: String(err),
      });
    }
    await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempt)));
  }

  if (!parsedSynthesis) {
    const fallback = buildFallbackSynthesisReport({
      scope: "pr",
      targetName: `${params.owner}/${params.repo}`,
      files: changedFiles,
      findings: normalizedFindings,
      failedChunks: failedFiles,
    });
    return {
      ...fallback,
      changed_files: changedFiles,
      usage: finalUsage,
      model,
      triage: { fileCount: entries.length, trivialCount, reviewedCount: filesToReview.length },
    };
  }

  const synthesizedFindings = normalizeAndDedupeFindings(
    parsedSynthesis.findings?.length ? parsedSynthesis.findings : normalizedFindings,
    20,
  );
  const healthScore = computeDeterministicHealthScore(synthesizedFindings, parsedSynthesis.health_score);

  return {
    health_score: healthScore,
    summary: parsedSynthesis.summary || "No review summary available.",
    changed_files: changedFiles,
    findings: synthesizedFindings,
    usage: finalUsage,
    model,
    triage: {
      fileCount: entries.length,
      trivialCount,
      reviewedCount: filesToReview.length,
    },
  };
}
