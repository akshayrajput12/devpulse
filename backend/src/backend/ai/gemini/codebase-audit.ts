import { callGeminiRaw, parseJsonResponse, readGeminiText, type GeminiUsage } from "./client.js";
import { getGeminiApiKey, REVIEW_MODEL } from "./models.js";
import {
  CODEBASE_LEGACY_SYSTEM_PROMPT,
  CODEBASE_CHUNK_AUDIT_SYSTEM_PROMPT,
  CODEBASE_SYNTHESIS_SYSTEM_PROMPT,
} from "./prompts/codebase-audit.js";
import { logger } from "../../logging/logger.server.js";
import { isParallelEngineEnabled } from "../orchestrator.js";
import {
  buildBudgetedChunks,
  buildFallbackSynthesisReport,
  computeDeterministicHealthScore,
  formatNumberedFileBlock,
  isRetryableHttpStatus,
  mergeSynthesizedWithOriginals,
  normalizeAndDedupeFindings,
  runPhasePool,
} from "../chunking.js";

export type CodebaseAIResult = {
  health_score: number;
  summary: string;
  audited_files?: string[];
  findings: any[];
  usage: GeminiUsage;
  model: string;
};

async function auditFileChunk(params: {
  requestId: string;
  reviewId: string;
  repoFullName: string;
  chunkIndex: number;
  totalChunks: number;
  chunkFiles: string[];
  filesContent: Record<string, string>;
}): Promise<{ findings: any[]; usage: GeminiUsage }> {
  const fileBlocks = params.chunkFiles
    .map(path => formatNumberedFileBlock(path, params.filesContent[path] ?? "", 8000))
    .join("\n\n");

  const userContent = `REPOSITORY: ${params.repoFullName} (Phase Chunk ${params.chunkIndex + 1}/${params.totalChunks})\n\nFILES TO AUDIT IN THIS CHUNK:\n${params.chunkFiles.map(f => `- ${f}`).join("\n")}\n\nFILE CONTENTS:\n\n${fileBlocks}`;
  const maxRetries = 4;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const apiKey = getGeminiApiKey(); // Rotate key every attempt
    try {
      const res = await callGeminiRaw({
        requestId: params.requestId,
        reviewId: params.reviewId,
        model: REVIEW_MODEL,
        systemPrompt: CODEBASE_CHUNK_AUDIT_SYSTEM_PROMPT,
        userContent,
        apiKey,
        jsonMode: true,
      });

      if (res.ok) {
        const { text, usage } = await readGeminiText(res);
        const parsed = parseJsonResponse<{ findings?: any[] }>(text);
        return { findings: parsed.findings ?? [], usage };
      }

      const body = await res.text();
      if (!isRetryableHttpStatus(res.status) || attempt === maxRetries - 1) {
        throw new Error(`Gemini chunk audit error ${res.status}: ${body.slice(0, 400)}`);
      }
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
    }

    const delay = 2500 * Math.pow(2, attempt);
    logger.warn("gemini.codebase_chunk_retry", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      chunkIndex: params.chunkIndex,
      attempt: attempt + 1,
      delayMs: delay,
    });
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error("Gemini chunk audit failed after retries");
}

export async function callCodebaseAuditAI(params: {
  requestId: string;
  reviewId: string;
  repoFullName: string;
  filesContent: Record<string, string>;
}): Promise<CodebaseAIResult> {
  const files = Object.keys(params.filesContent);
  if (files.length === 0) {
    throw new Error(`No readable source files were found in ${params.repoFullName}.`);
  }

  const parallelEnabled = await isParallelEngineEnabled();
  const totalChars = files.reduce((acc, f) => acc + Math.min((params.filesContent[f] ?? "").length, 8000), 0);

  // Single-pass only when small BOTH in file count (≤ 10) AND character budget (≤ 32k)
  if (files.length <= 10 && totalChars <= 32_000 && !parallelEnabled) {
    logger.info("gemini.codebase_audit.single_step", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      fileCount: files.length,
      totalChars,
    });

    const fileBlocks = files
      .map(path => formatNumberedFileBlock(path, params.filesContent[path] ?? "", 8000))
      .join("\n\n");

    const userContent = `REPOSITORY: ${params.repoFullName}\n\nAUDITED FILES (${files.length}):\n${files.map(f => `- ${f}`).join("\n")}\n\nFILE CONTENTS:\n\n${fileBlocks}`;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const apiKey = getGeminiApiKey();
      try {
        const res = await callGeminiRaw({
          requestId: params.requestId,
          reviewId: params.reviewId,
          model: REVIEW_MODEL,
          systemPrompt: CODEBASE_LEGACY_SYSTEM_PROMPT,
          userContent,
          apiKey,
          jsonMode: true,
        });

        if (res.ok) {
          const { text, usage } = await readGeminiText(res);
          const parsed: any = parseJsonResponse(text);
          const findings = normalizeAndDedupeFindings(parsed.findings ?? [], 20, params.filesContent);
          return {
            health_score: computeDeterministicHealthScore(findings, parsed.health_score, files.length),
            summary: parsed.summary || "",
            audited_files: files,
            findings,
            usage,
            model: REVIEW_MODEL,
          };
        }

        const body = await res.text();
        if (!isRetryableHttpStatus(res.status) || attempt === 3) {
          throw new Error(`Gemini codebase audit error ${res.status}: ${body.slice(0, 400)}`);
        }
      } catch (err) {
        if (attempt === 3) throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 2500 * Math.pow(2, attempt)));
    }
  }

  // Phase 2: Token-Budget-Aware Chunk Partitioning
  const chunks = buildBudgetedChunks(files, params.filesContent, {
    maxFilesPerChunk: 8,
    maxCharsPerChunk: 36_000,
    maxCharsPerFile: 8_000,
  });

  logger.info("gemini.codebase_audit.phase_chunk_start", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    totalFiles: files.length,
    totalChunks: chunks.length,
    concurrency: parallelEnabled ? 2 : 1,
  });

  // Phase 3: Parallel-Bounded Chunk Audit with Partial-Success Isolation
  const chunkPool = await runPhasePool(chunks, parallelEnabled ? 2 : 1, async (chunkFiles, chunkIndex) => {
    return auditFileChunk({
      requestId: params.requestId,
      reviewId: params.reviewId,
      repoFullName: params.repoFullName,
      chunkIndex,
      totalChunks: chunks.length,
      chunkFiles,
      filesContent: params.filesContent,
    });
  });

  const mergedRaw: any[] = [];
  let chunkPromptTokens = 0;
  let chunkCandidateTokens = 0;
  let chunkTotalTokens = 0;
  let failedChunks = 0;

  for (const res of chunkPool) {
    if (res.ok) {
      mergedRaw.push(...res.value.findings);
      chunkPromptTokens += res.value.usage.promptTokenCount ?? 0;
      chunkCandidateTokens += res.value.usage.candidatesTokenCount ?? 0;
      chunkTotalTokens += res.value.usage.totalTokenCount ?? 0;
    } else {
      failedChunks += 1;
      logger.warn("gemini.codebase_chunk_failed_isolated", {
        requestId: params.requestId,
        reviewId: params.reviewId,
        chunkIndex: res.index,
        error: res.error,
      });
    }
  }

  // If ALL chunks failed, throw so orchestrator triggers OpenAI failover
  if (failedChunks === chunks.length) {
    throw new Error(`Gemini codebase audit failed on all ${failedChunks} chunk(s); triggering failover.`);
  }

  const normalizedFindings = normalizeAndDedupeFindings(mergedRaw, 25, params.filesContent);

  logger.info("gemini.codebase_audit.phase_chunk_complete", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    chunksCount: chunks.length,
    failedChunks,
    totalFindingsCollected: normalizedFindings.length,
  });

  // Phase 4: Holistic Synthesis + Lossless Code Hydration + Deterministic Score Safeguard
  const synthesisUserContent = `REPOSITORY: ${params.repoFullName}
AUDITED FILES (${files.length}):
${files.map(f => `- ${f}`).join("\n")}

ACCUMULATED CHUNK FINDINGS (${normalizedFindings.length}) — IMPORTANT: PRESERVE exact bad_code, suggested_fix, line_start, and line_end verbatim for every finding you include:
${JSON.stringify(normalizedFindings, null, 2)}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const apiKey = getGeminiApiKey();
    try {
      const res = await callGeminiRaw({
        requestId: params.requestId,
        reviewId: params.reviewId,
        model: REVIEW_MODEL,
        systemPrompt: CODEBASE_SYNTHESIS_SYSTEM_PROMPT,
        userContent: synthesisUserContent,
        apiKey,
        jsonMode: true,
      });

      if (res.ok) {
        const { text, usage } = await readGeminiText(res);
        const parsed: any = parseJsonResponse(text);
        const finalFindings = mergeSynthesizedWithOriginals(
          parsed.findings,
          normalizedFindings,
          params.filesContent,
          20,
        );
        const finalUsage: GeminiUsage = {
          promptTokenCount: chunkPromptTokens + (usage.promptTokenCount ?? 0),
          candidatesTokenCount: chunkCandidateTokens + (usage.candidatesTokenCount ?? 0),
          totalTokenCount: chunkTotalTokens + (usage.totalTokenCount ?? 0),
        };
        const healthScore = computeDeterministicHealthScore(finalFindings, parsed.health_score, files.length);

        logger.info("gemini.codebase_audit.synthesis_complete", {
          requestId: params.requestId,
          reviewId: params.reviewId,
          healthScore,
          findingsCount: finalFindings.length,
          usage: finalUsage,
        });

        return {
          health_score: healthScore,
          summary: parsed.summary || "",
          audited_files: files,
          findings: finalFindings,
          usage: finalUsage,
          model: REVIEW_MODEL,
        };
      }

      if (!isRetryableHttpStatus(res.status)) break;
    } catch (err) {
      logger.warn("gemini.codebase_synthesis_retry", {
        requestId: params.requestId,
        attempt: attempt + 1,
        error: String(err),
      });
    }
    await new Promise(resolve => setTimeout(resolve, 2500 * Math.pow(2, attempt)));
  }

  // Deterministic synthesis fallback preserves all audited chunk findings
  const fallback = buildFallbackSynthesisReport({
    scope: "codebase",
    targetName: params.repoFullName,
    files,
    findings: normalizedFindings,
    filesContent: params.filesContent,
    failedChunks,
  });
  return {
    ...fallback,
    audited_files: files,
    usage: {
      promptTokenCount: chunkPromptTokens,
      candidatesTokenCount: chunkCandidateTokens,
      totalTokenCount: chunkTotalTokens,
    },
    model: REVIEW_MODEL,
  };
}
