import { callOpenAIRaw, parseJsonResponse, readOpenAIText, type OpenAIUsage } from "./client.js";
import { getOpenAIApiKey, REVIEW_MODEL } from "./models.js";
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
  isRetryableHttpStatus,
  normalizeAndDedupeFindings,
  runPhasePool,
} from "../chunking.js";

export type CodebaseAIResult = {
  health_score: number;
  summary: string;
  audited_files?: string[];
  findings: any[];
  usage: OpenAIUsage;
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
}): Promise<{ findings: any[]; usage: OpenAIUsage }> {
  const fileBlocks = params.chunkFiles
    .map(path => {
      const content = params.filesContent[path] ?? "";
      return `=== FILE: ${path} ===\n${content.slice(0, 8000)}${content.length > 8000 ? "\n... (truncated)" : ""}`;
    })
    .join("\n\n");

  const userContent = `REPOSITORY: ${params.repoFullName} (Phase Chunk ${params.chunkIndex + 1}/${params.totalChunks})\n\nFILES TO AUDIT IN THIS CHUNK:\n${params.chunkFiles.map(f => `- ${f}`).join("\n")}\n\nFILE CONTENTS:\n\n${fileBlocks}`;
  const maxRetries = 4;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const apiKey = getOpenAIApiKey();
    try {
      const res = await callOpenAIRaw({
        requestId: params.requestId,
        reviewId: params.reviewId,
        model: REVIEW_MODEL,
        systemPrompt: CODEBASE_CHUNK_AUDIT_SYSTEM_PROMPT,
        userContent,
        apiKey,
        jsonMode: true,
      });

      if (res.ok) {
        const { text, usage } = await readOpenAIText(res);
        const parsed = parseJsonResponse<{ findings?: any[] }>(text);
        return { findings: parsed.findings ?? [], usage };
      }

      const body = await res.text();
      if (!isRetryableHttpStatus(res.status) || attempt === maxRetries - 1) {
        throw new Error(`OpenAI chunk audit error ${res.status}: ${body.slice(0, 400)}`);
      }
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
    }

    const delay = 2500 * Math.pow(2, attempt);
    logger.warn("openai.codebase_chunk_retry", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      chunkIndex: params.chunkIndex,
      attempt: attempt + 1,
      delayMs: delay,
    });
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error("OpenAI chunk audit failed after retries");
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

  if (files.length <= 10 && totalChars <= 32_000 && !parallelEnabled) {
    const fileBlocks = files
      .map(path => {
        const content = params.filesContent[path] ?? "";
        return `=== FILE: ${path} ===\n${content.slice(0, 8000)}${content.length > 8000 ? "\n... (truncated)" : ""}`;
      })
      .join("\n\n");

    const userContent = `REPOSITORY: ${params.repoFullName}\n\nAUDITED FILES (${files.length}):\n${files.map(f => `- ${f}`).join("\n")}\n\nFILE CONTENTS:\n\n${fileBlocks}`;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const apiKey = getOpenAIApiKey();
      try {
        const res = await callOpenAIRaw({
          requestId: params.requestId,
          reviewId: params.reviewId,
          model: REVIEW_MODEL,
          systemPrompt: CODEBASE_LEGACY_SYSTEM_PROMPT,
          userContent,
          apiKey,
          jsonMode: true,
        });

        if (res.ok) {
          const { text, usage } = await readOpenAIText(res);
          const parsed: any = parseJsonResponse(text);
          const findings = normalizeAndDedupeFindings(parsed.findings ?? [], 20);
          return {
            health_score: computeDeterministicHealthScore(findings, parsed.health_score),
            summary: parsed.summary || "",
            audited_files: files,
            findings,
            usage,
            model: REVIEW_MODEL,
          };
        }

        const body = await res.text();
        if (!isRetryableHttpStatus(res.status) || attempt === 3) {
          throw new Error(`OpenAI codebase audit error ${res.status}: ${body.slice(0, 400)}`);
        }
      } catch (err) {
        if (attempt === 3) throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 2500 * Math.pow(2, attempt)));
    }
  }

  const chunks = buildBudgetedChunks(files, params.filesContent, {
    maxFilesPerChunk: 8,
    maxCharsPerChunk: 36_000,
    maxCharsPerFile: 8_000,
  });

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
      logger.warn("openai.codebase_chunk_failed_isolated", {
        requestId: params.requestId,
        reviewId: params.reviewId,
        chunkIndex: res.index,
        error: res.error,
      });
    }
  }

  if (failedChunks === chunks.length) {
    throw new Error(`OpenAI codebase audit failed on all ${failedChunks} chunk(s).`);
  }

  const normalizedFindings = normalizeAndDedupeFindings(mergedRaw, 25);

  const synthesisUserContent = `REPOSITORY: ${params.repoFullName}
AUDITED FILES (${files.length}):
${files.map(f => `- ${f}`).join("\n")}

ACCUMULATED CHUNK FINDINGS (${normalizedFindings.length}):
${JSON.stringify(normalizedFindings, null, 2)}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const apiKey = getOpenAIApiKey();
    try {
      const res = await callOpenAIRaw({
        requestId: params.requestId,
        reviewId: params.reviewId,
        model: REVIEW_MODEL,
        systemPrompt: CODEBASE_SYNTHESIS_SYSTEM_PROMPT,
        userContent: synthesisUserContent,
        apiKey,
        jsonMode: true,
      });

      if (res.ok) {
        const { text, usage } = await readOpenAIText(res);
        const parsed: any = parseJsonResponse(text);
        const finalFindings = normalizeAndDedupeFindings(
          parsed.findings?.length ? parsed.findings : normalizedFindings,
          20,
        );
        const finalUsage: OpenAIUsage = {
          promptTokenCount: chunkPromptTokens + (usage.promptTokenCount ?? 0),
          candidatesTokenCount: chunkCandidateTokens + (usage.candidatesTokenCount ?? 0),
          totalTokenCount: chunkTotalTokens + (usage.totalTokenCount ?? 0),
        };
        const healthScore = computeDeterministicHealthScore(finalFindings, parsed.health_score);

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
      logger.warn("openai.codebase_synthesis_retry", {
        requestId: params.requestId,
        attempt: attempt + 1,
        error: String(err),
      });
    }
    await new Promise(resolve => setTimeout(resolve, 2500 * Math.pow(2, attempt)));
  }

  const fallback = buildFallbackSynthesisReport({
    scope: "codebase",
    targetName: params.repoFullName,
    files,
    findings: normalizedFindings,
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
