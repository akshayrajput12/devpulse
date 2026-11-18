import { callGeminiRaw, parseJsonResponse, readGeminiText, type GeminiUsage } from "./client.js";
import { getGeminiApiKey, REVIEW_MODEL } from "./models.js";
import {
  API_CHUNK_AUDIT_SYSTEM_PROMPT,
  API_SYNTHESIS_SYSTEM_PROMPT,
} from "./prompts/api-analyser.js";
import { logger } from "../../logging/logger.server.js";
import { isParallelEngineEnabled } from "../orchestrator.js";
import { isRepoNoisePath } from "../../github/repository.server.js";
import {
  buildBudgetedChunks,
  buildFallbackSynthesisReport,
  computeDeterministicHealthScore,
  isRetryableHttpStatus,
  normalizeAndDedupeFindings,
  runPhasePool,
} from "../chunking.js";

export type ApiAnalysisAIResult = {
  health_score: number;
  summary: string;
  audited_files?: string[];
  findings: any[];
  usage: GeminiUsage;
  model: string;
};

const API_PATH_PATTERNS = [
  /(^|\/)(api|routes\/api|server|backend|controllers?|services?|middleware|models?|db|database|repositories?|handlers?|functions?|endpoints?|graphql|rpc|migrations?)\//i,
  /\.(controller|service|repository|handler|model|schema|migration|query|resolver|server|router|route)\.(ts|js|py|go|java|rs|cs)$/i,
  /\b(postgres|prisma|drizzle|typeorm|sequelize|mongoose|knex|sql|supabase|redis|express|fastapi|django|flask|gin|fiber)\b/i,
  /(^|\/)routes?\//i,
  /\.(sql|prisma|graphql)$/i,
];

const SOURCE_CODE_EXT = /\.(ts|tsx|js|jsx|py|go|java|rs|cs|rb|php|sql|prisma|graphql)$/i;

export function selectApiFiles(allFiles: string[], requestedFiles?: string[]): string[] {
  const cleanAll = allFiles.filter(f => !isRepoNoisePath(f));
  if (requestedFiles && requestedFiles.length > 0) {
    const matched = requestedFiles.filter(f => cleanAll.includes(f));
    if (matched.length > 0) return matched.slice(0, 50);
  }
  const strict = cleanAll.filter(path => API_PATH_PATTERNS.some(pattern => pattern.test(path)));
  if (strict.length > 0) {
    return strict.slice(0, 50);
  }
  // Smart fallback: if repo uses custom layout, select top source files so API audit never fails empty
  return cleanAll.filter(path => SOURCE_CODE_EXT.test(path)).slice(0, 30);
}

async function auditApiChunk(params: {
  requestId: string;
  reviewId: string;
  repoFullName: string;
  chunkIndex: number;
  totalChunks: number;
  chunkFiles: string[];
  filesContent: Record<string, string>;
}): Promise<{ findings: any[]; usage: GeminiUsage }> {
  const fileBlocks = params.chunkFiles
    .map(path => {
      const content = params.filesContent[path] ?? "";
      return `=== FILE: ${path} ===\n${content.slice(0, 8000)}${content.length > 8000 ? "\n... (truncated)" : ""}`;
    })
    .join("\n\n");

  const userContent = `REPOSITORY: ${params.repoFullName} (API Phase Chunk ${params.chunkIndex + 1}/${params.totalChunks})\n\nAPI/BACKEND FILES TO AUDIT IN THIS CHUNK:\n${params.chunkFiles.map(f => `- ${f}`).join("\n")}\n\nFILE CONTENTS:\n\n${fileBlocks}`;
  const maxRetries = 4;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const apiKey = getGeminiApiKey();
    try {
      const res = await callGeminiRaw({
        requestId: params.requestId,
        reviewId: params.reviewId,
        model: REVIEW_MODEL,
        systemPrompt: API_CHUNK_AUDIT_SYSTEM_PROMPT,
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
        throw new Error(`Gemini API analyser chunk error ${res.status}: ${body.slice(0, 400)}`);
      }
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
    }

    const delay = 2500 * Math.pow(2, attempt);
    logger.warn("gemini.api_chunk_retry", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      chunkIndex: params.chunkIndex,
      attempt: attempt + 1,
      delayMs: delay,
    });
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error("Gemini API analyser chunk failed after retries");
}

export async function callApiAnalysisAI(params: {
  requestId: string;
  reviewId: string;
  repoFullName: string;
  filesContent: Record<string, string>;
}): Promise<ApiAnalysisAIResult> {
  const files = Object.keys(params.filesContent);
  if (files.length === 0) {
    throw new Error(`No API or backend files were found in ${params.repoFullName}.`);
  }

  const parallelEnabled = await isParallelEngineEnabled();
  const chunks = buildBudgetedChunks(files, params.filesContent, {
    maxFilesPerChunk: 8,
    maxCharsPerChunk: 36_000,
    maxCharsPerFile: 8_000,
  });

  logger.info("gemini.api_analysis.phase_start", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    totalFiles: files.length,
    totalChunks: chunks.length,
    concurrency: parallelEnabled ? 2 : 1,
  });

  const chunkPool = await runPhasePool(chunks, parallelEnabled ? 2 : 1, async (chunkFiles, chunkIndex) => {
    return auditApiChunk({
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
      logger.warn("gemini.api_chunk_failed_isolated", {
        requestId: params.requestId,
        reviewId: params.reviewId,
        chunkIndex: res.index,
        error: res.error,
      });
    }
  }

  if (failedChunks === chunks.length) {
    throw new Error(`Gemini API audit failed on all ${failedChunks} chunk(s); triggering failover.`);
  }

  const normalizedFindings = normalizeAndDedupeFindings(mergedRaw, 25);

  const synthesisUserContent = `REPOSITORY: ${params.repoFullName}
AUDITED API/BACKEND FILES (${files.length}):
${files.map(f => `- ${f}`).join("\n")}

ACCUMULATED CHUNK FINDINGS (${normalizedFindings.length}):
${JSON.stringify(normalizedFindings, null, 2)}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const apiKey = getGeminiApiKey();
    try {
      const res = await callGeminiRaw({
        requestId: params.requestId,
        reviewId: params.reviewId,
        model: REVIEW_MODEL,
        systemPrompt: API_SYNTHESIS_SYSTEM_PROMPT,
        userContent: synthesisUserContent,
        apiKey,
        jsonMode: true,
      });

      if (res.ok) {
        const { text, usage } = await readGeminiText(res);
        const parsed: any = parseJsonResponse(text);
        const finalFindings = normalizeAndDedupeFindings(
          parsed.findings?.length ? parsed.findings : normalizedFindings,
          20,
        );
        const finalUsage: GeminiUsage = {
          promptTokenCount: chunkPromptTokens + (usage.promptTokenCount ?? 0),
          candidatesTokenCount: chunkCandidateTokens + (usage.candidatesTokenCount ?? 0),
          totalTokenCount: chunkTotalTokens + (usage.totalTokenCount ?? 0),
        };
        const healthScore = computeDeterministicHealthScore(finalFindings, parsed.health_score);

        logger.info("gemini.api_analysis.synthesis_complete", {
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
      logger.warn("gemini.api_synthesis_retry", {
        requestId: params.requestId,
        attempt: attempt + 1,
        error: String(err),
      });
    }
    await new Promise(resolve => setTimeout(resolve, 2500 * Math.pow(2, attempt)));
  }

  const fallback = buildFallbackSynthesisReport({
    scope: "api",
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
