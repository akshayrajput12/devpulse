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
    /node_modules\//,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /bun\.lockb$/,
    /\.(png|jpe?g|gif|svg|ico|webp|pdf|zip|gz|tar|mp4|mp3|woff2?|eot|ttf)$/i,
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
      if (match) {
        currentLine = parseInt(match[1], 10);
      }
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
    (trimmed.includes("require(") &&
      (trimmed.startsWith("const ") || trimmed.startsWith("let ") || trimmed.startsWith("var ") || trimmed.startsWith("import ")))
  );
}

function extractContext(fileContent: string, changedLines: number[]): string {
  const lines = fileContent.split("\n");
  const totalLines = lines.length;
  if (changedLines.length === 0) return "";

  const ranges = changedLines.map(line => [
    Math.max(1, line - 40),
    Math.min(totalLines, line + 40)
  ]);

  ranges.sort((a, b) => a[0] - b[0]);
  const mergedRanges: [number, number][] = [];
  for (const range of ranges) {
    if (mergedRanges.length === 0) {
      mergedRanges.push(range as [number, number]);
    } else {
      const last = mergedRanges[mergedRanges.length - 1];
      if (range[0] <= last[1] + 1) {
        last[1] = Math.max(last[1], range[1]);
      } else {
        mergedRanges.push(range as [number, number]);
      }
    }
  }

  const sliceParts: string[] = [];

  const importLines: string[] = [];
  for (let i = 0; i < Math.min(totalLines, 150); i++) {
    const line = lines[i];
    if (isImportLine(line)) {
      importLines.push(`${i + 1}: ${line}`);
    }
  }
  if (importLines.length > 0) {
    sliceParts.push("// Imports:");
    sliceParts.push(importLines.join("\n"));
  }

  for (const [start, end] of mergedRanges) {
    sliceParts.push(`\n// --- Context: lines ${start} to ${end} ---`);
    const block: string[] = [];
    for (let i = start - 1; i < end; i++) {
      block.push(`${i + 1}: ${lines[i]}`);
    }
    sliceParts.push(block.join("\n"));
  }

  return sliceParts.join("\n");
}

async function tryFetchFileFromGithub(
  owner: string,
  repo: string,
  path: string,
  headSha: string,
  token: string | null
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.raw",
      "User-Agent": "devpulse",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${headSha}`;
    const res = await fetch(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    logger.warn("github.fetch_file_failed", { owner, repo, path, headSha, error: String(e) });
    return null;
  }
}

async function triageFileDiff(requestId: string, reviewId: string, fileDiff: string, apiKey: string) {
  try {
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
    logger.warn("openai.triage_failed_open", { requestId, reviewId, error });
    return "REVIEW";
  }
}

async function auditSingleFile(
  requestId: string,
  reviewId: string,
  filePath: string,
  fileSlice: string,
  apiKey: string,
  model: string,
  systemPrompt: string
): Promise<{ findings: any[]; usage: OpenAIUsage }> {
  // Cost Safeguard: Truncate file contents at 8,000 characters (approx 2,000 tokens)
  const compressedSlice = fileSlice.length > 8000 
    ? fileSlice.slice(0, 8000) + "\n\n...[Truncated due to context size limit (8k chars) to mitigate cost spikes]" 
    : fileSlice;
  const userContent = `File: ${filePath}\n\nCode context:\n${compressedSlice}`;
  let promptTokenCount = 0;
  let candidatesTokenCount = 0;
  let totalTokenCount = 0;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
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
        const parsed = parseJsonResponse(text) as { findings?: any[] };
        const findings = parsed.findings || [];
        return {
          findings: findings.map(f => ({ ...f, file: filePath })),
          usage: { promptTokenCount, candidatesTokenCount, totalTokenCount }
        };
      }

      const body = await res.text();
      if (res.status !== 429 || attempt === maxRetries - 1) {
        logger.warn("openai.file_audit_error", { filePath, status: res.status, body: body.slice(0, 300) });
        return { findings: [], usage: { promptTokenCount, candidatesTokenCount, totalTokenCount } };
      }
    } catch (err) {
      logger.warn("openai.file_audit_exception", { filePath, error: String(err) });
      if (attempt === maxRetries - 1) {
        return { findings: [], usage: { promptTokenCount, candidatesTokenCount, totalTokenCount } };
      }
    }
    const delay = 2000 * Math.pow(2, attempt);
    logger.warn("openai.file_audit_rate_limited_retry", {
      requestId,
      reviewId,
      filePath,
      attempt: attempt + 1,
      delayMs: delay,
      apiKeyLast4: apiKey ? apiKey.slice(-4) : "none",
    });
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
  const apiKey = getOpenAIApiKey();
  const model = selectModel(params.plan);
  const changedFiles = parseChangedFiles(params.diff);
  const fileDiffs = splitDiffByFile(params.diff);

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
  const triageStart = Date.now();
  const triageResults: Array<{ path: string; chunk: string; verdict: string }> = [];
  for (const [path, chunk] of activeEntries) {
    const verdict = await triageFileDiff(params.requestId, params.reviewId, chunk, apiKey);
    triageResults.push({ path, chunk, verdict });
    // Add artificial delay between triage calls to respect rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  logger.info("openai.triage_complete", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    fileCount: activeEntries.length,
    durationMs: Date.now() - triageStart,
  });

  const filesToReview = triageResults.filter(r => r.verdict === "REVIEW");
  const trivialCount = entries.length - filesToReview.length;

  if (filesToReview.length === 0) {
    return {
      health_score: 100,
      summary: `### 📌 PR Overview\nNo significant source code changes detected or all files are trivial/noise. Checked files: ${changedFiles.join(", ") || "none"}.\n\n### 🔒 Security Analysis\nNo security implications detected in the changes.\n\n### ⚡ Performance Analysis\nNo performance bottlenecks or optimization areas detected.\n\n### 🏗️ Architecture & Design\nChanges adhere perfectly to code placement and architectural patterns.\n\n### 🛡️ Reliability Analysis\nNo crash risk, unhandled error, or reliability concerns detected.\n\n### 🧪 Testability & QA Guide\n1. Verify build passes on staging.\n2. Manual validation of functional behavior if required.\n\n### 📖 Readability & Maintainability\nCode quality remains high and readable.`,
      changed_files: changedFiles,
      findings: [],
      usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
      model,
      triage: {
        fileCount: entries.length,
        trivialCount,
        reviewedCount: 0,
      }
    };
  }

  let totalPromptTokens = 0;
  let totalCandidatesTokens = 0;
  let totalTotalTokens = 0;

  const fileAudits: any[][] = [];
  for (const { path, chunk } of filesToReview) {
    const rawContent = await tryFetchFileFromGithub(
      params.owner,
      params.repo,
      path,
      params.headSha,
      params.token
    );
    if (!rawContent) {
      fileAudits.push([]);
      continue;
    }

    const changedLines = getChangedLineNumbers(chunk);
    if (changedLines.length === 0) {
      fileAudits.push([]);
      continue;
    }

    const slice = extractContext(rawContent, changedLines);
    if (!slice) {
      fileAudits.push([]);
      continue;
    }

    const { findings, usage } = await auditSingleFile(
      params.requestId,
      params.reviewId,
      path,
      slice,
      apiKey,
      model,
      fileAuditPrompt
    );

    totalPromptTokens += usage.promptTokenCount || 0;
    totalCandidatesTokens += usage.candidatesTokenCount || 0;
    totalTotalTokens += usage.totalTokenCount || 0;

    fileAudits.push(findings);
    // Add artificial delay between files to respect rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const allFindings = fileAudits.flat();

  const synthesisInput = {
    pr_metadata: params.prMeta,
    changed_files: changedFiles,
    parallel_audit_findings: allFindings,
  };
  const synthesisUserContent = JSON.stringify(synthesisInput, null, 2);

  let parsedSynthesis: any = null;
  let finalUsage: OpenAIUsage = {
    promptTokenCount: totalPromptTokens,
    candidatesTokenCount: totalCandidatesTokens,
    totalTokenCount: totalTotalTokens,
  };

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
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

      const body = await res.text();
      if (res.status !== 429 || attempt === maxRetries - 1) {
        throw new Error(`OpenAI synthesis failed with status ${res.status}: ${body.slice(0, 300)}`);
      }
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
    }
    const delay = 2000 * Math.pow(2, attempt);
    logger.warn("openai.pr_synthesis_rate_limited_retry", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      attempt: attempt + 1,
      delayMs: delay,
      apiKeyLast4: apiKey ? apiKey.slice(-4) : "none",
    });
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  if (!parsedSynthesis) {
    throw new Error("Failed to synthesize PR review findings");
  }

  const synthesizedFindings = (parsedSynthesis.findings || allFindings).map((f: any, idx: number) => {
    const original = allFindings[idx];
    return {
      ...f,
      file: f.file || original?.file || "unknown",
    };
  });

  return {
    health_score: parsedSynthesis.health_score ?? 100,
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
