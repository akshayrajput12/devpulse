import { callGeminiRaw, parseJsonResponse, readGeminiText, type GeminiUsage } from "./client.js";
import { getGeminiApiKey, REVIEW_MODEL } from "./models.js";
import {
  API_CHUNK_AUDIT_SYSTEM_PROMPT,
  API_SYNTHESIS_SYSTEM_PROMPT,
} from "./prompts/api-analyser.js";
import { logger } from "../../logging/logger.server.js";
import { isParallelEngineEnabled } from "../orchestrator.js";

export type ApiAnalysisAIResult = {
  health_score: number;
  summary: string;
  audited_files?: string[];
  findings: any[];
  usage: GeminiUsage;
  model: string;
};

const API_PATH_PATTERNS = [
  /^(src\/)?(api|routes\/api|server|controllers?|services?|middleware|models?|db|database|repositories?|handlers?)\//i,
  /\.(controller|service|repository|handler|model|schema|migration|query|resolver)\.(ts|js)$/i,
  /\b(postgres|prisma|drizzle|typeorm|sequelize|mongoose|knex|sql)\b/i,
  /^(src\/)?routes?\//i,
];

export function selectApiFiles(allFiles: string[], requestedFiles?: string[]): string[] {
  if (requestedFiles && requestedFiles.length > 0) {
    return requestedFiles.filter(f => allFiles.includes(f));
  }
  return allFiles.filter(path =>
    API_PATH_PATTERNS.some(pattern => pattern.test(path))
  ).slice(0, 40);
}

async function auditApiChunk(params: {
  requestId: string;
  reviewId: string;
  repoFullName: string;
  chunkFiles: string[];
  filesContent: Record<string, string>;
  apiKey: string;
}): Promise<{ findings: any[]; usage: GeminiUsage }> {
  const fileBlocks = params.chunkFiles.map(path => {
    const content = params.filesContent[path] ?? "";
    return `=== FILE: ${path} ===\n${content.slice(0, 8000)}${content.length > 8000 ? "\n... (truncated)" : ""}`;
  }).join("\n\n");

  const userContent = `REPOSITORY: ${params.repoFullName}\n\nAPI/BACKEND FILES TO AUDIT IN THIS CHUNK:\n${params.chunkFiles.map(f => `- ${f}`).join("\n")}\n\nFILE CONTENTS:\n\n${fileBlocks}`;
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const res = await callGeminiRaw({
      requestId: params.requestId,
      reviewId: params.reviewId,
      model: REVIEW_MODEL,
      systemPrompt: API_CHUNK_AUDIT_SYSTEM_PROMPT,
      userContent,
      apiKey: params.apiKey,
      jsonMode: true,
    });

    if (res.ok) {
      const { text, usage } = await readGeminiText(res);
      const parsed: any = parseJsonResponse(text);
      return { findings: parsed.findings ?? [], usage };
    }

    const body = await res.text();
    if (res.status !== 429 || attempt === maxRetries - 1) {
      throw new Error(`Gemini API analyser chunk error ${res.status}: ${body.slice(0, 500)}`);
    }

    const delay = 3000 * Math.pow(2, attempt);
    logger.warn("gemini.api_chunk_rate_limited_retry", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      attempt: attempt + 1,
      delayMs: delay,
      apiKeyLast4: params.apiKey ? params.apiKey.slice(-4) : "none",
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
  const apiKey = getGeminiApiKey();
  const files = Object.keys(params.filesContent);
  const parallelEnabled = await isParallelEngineEnabled();

  logger.info("gemini.api_analysis.start", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    totalFiles: files.length,
    parallelEnabled,
  });

  if (files.length <= 15 || !parallelEnabled) {
    const fileBlocks = files.map(path => {
      const content = params.filesContent[path] ?? "";
      return `=== FILE: ${path} ===\n${content.slice(0, 8000)}${content.length > 8000 ? "\n... (truncated)" : ""}`;
    }).join("\n\n");

    const userContent = `REPOSITORY: ${params.repoFullName}\n\nAPI/BACKEND FILES (${files.length}):\n${files.map(f => `- ${f}`).join("\n")}\n\nFILE CONTENTS:\n\n${fileBlocks}`;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      const res = await callGeminiRaw({
        requestId: params.requestId,
        reviewId: params.reviewId,
        model: REVIEW_MODEL,
        systemPrompt: API_SYNTHESIS_SYSTEM_PROMPT,
        userContent,
        apiKey,
        jsonMode: true,
      });

      if (res.ok) {
        const { text, usage } = await readGeminiText(res);
        const parsed: any = parseJsonResponse(text);
        parsed.audited_files = parsed.audited_files?.length ? parsed.audited_files : files;
        return { ...parsed, usage, model: REVIEW_MODEL };
      }

      const body = await res.text();
      if (res.status !== 429 || attempt === maxRetries - 1) {
        throw new Error(`Gemini API analyser error ${res.status}: ${body.slice(0, 500)}`);
      }

      const delay = 3000 * Math.pow(2, attempt);
      logger.warn("gemini.api_single_step_rate_limited_retry", {
        requestId: params.requestId,
        reviewId: params.reviewId,
        attempt: attempt + 1,
        delayMs: delay,
        apiKeyLast4: apiKey ? apiKey.slice(-4) : "none",
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Gemini API analyser failed after retries");
  }

  const chunkSize = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < files.length; i += chunkSize) {
    chunks.push(files.slice(i, i + chunkSize));
  }

  const chunkResults: Array<{ findings: any[]; usage: GeminiUsage }> = [];
  for (const chunkFiles of chunks) {
    const chunkRes = await auditApiChunk({
      requestId: params.requestId,
      reviewId: params.reviewId,
      repoFullName: params.repoFullName,
      chunkFiles,
      filesContent: params.filesContent,
      apiKey,
    });
    chunkResults.push(chunkRes);
    // Add artificial delay between chunks to respect Gemini RPM rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const mergedFindings: any[] = [];
  let chunkPromptTokens = 0;
  let chunkCandidateTokens = 0;
  let chunkTotalTokens = 0;

  for (const res of chunkResults) {
    mergedFindings.push(...res.findings);
    chunkPromptTokens += res.usage.promptTokenCount ?? 0;
    chunkCandidateTokens += res.usage.candidatesTokenCount ?? 0;
    chunkTotalTokens += res.usage.totalTokenCount ?? 0;
  }

  logger.info("gemini.api_analysis.parallel_chunk_complete", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    chunksCount: chunks.length,
    totalFindingsCollected: mergedFindings.length,
  });

  const synthesisUserContent = `REPOSITORY: ${params.repoFullName}
AUDITED API/BACKEND FILES (${files.length}):
${files.map(f => `- ${f}`).join("\n")}

ACCUMULATED CHUNK FINDINGS (${mergedFindings.length}):
${JSON.stringify(mergedFindings, null, 2)}`;

  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
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

      const finalUsage: GeminiUsage = {
        promptTokenCount: chunkPromptTokens + (usage.promptTokenCount ?? 0),
        candidatesTokenCount: chunkCandidateTokens + (usage.candidatesTokenCount ?? 0),
        totalTokenCount: chunkTotalTokens + (usage.totalTokenCount ?? 0),
      };

      parsed.audited_files = files;

      logger.info("gemini.api_analysis.synthesis_complete", {
        requestId: params.requestId,
        reviewId: params.reviewId,
        healthScore: parsed.health_score,
        findingsCount: parsed.findings?.length ?? 0,
        usage: finalUsage,
      });

      return { ...parsed, usage: finalUsage, model: REVIEW_MODEL };
    }

    const body = await res.text();
    if (res.status !== 429 || attempt === maxRetries - 1) {
      throw new Error(`Gemini API analysis synthesis error ${res.status}: ${body.slice(0, 500)}`);
    }

    const delay = 3000 * Math.pow(2, attempt);
    logger.warn("gemini.api_synthesis_rate_limited_retry", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      attempt: attempt + 1,
      delayMs: delay,
      apiKeyLast4: apiKey ? apiKey.slice(-4) : "none",
    });
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error("Gemini API analyser synthesis failed after retries");
}
