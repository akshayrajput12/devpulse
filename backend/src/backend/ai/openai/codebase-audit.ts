import { callOpenAIRaw, parseJsonResponse, readOpenAIText, type OpenAIUsage } from "./client.js";
import { getOpenAIApiKey, REVIEW_MODEL } from "./models.js";
import {
  CODEBASE_LEGACY_SYSTEM_PROMPT,
  CODEBASE_CHUNK_AUDIT_SYSTEM_PROMPT,
  CODEBASE_SYNTHESIS_SYSTEM_PROMPT,
} from "./prompts/codebase-audit.js";
import { logger } from "../../logging/logger.server.js";
import { isParallelEngineEnabled } from "../orchestrator.js";

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
  chunkFiles: string[];
  filesContent: Record<string, string>;
  apiKey: string;
}): Promise<{ findings: any[]; usage: OpenAIUsage }> {
  const fileBlocks = params.chunkFiles.map(path => {
    const content = params.filesContent[path] ?? "";
    return `=== FILE: ${path} ===\n${content.slice(0, 8000)}${content.length > 8000 ? "\n... (truncated)" : ""}`;
  }).join("\n\n");

  const userContent = `REPOSITORY: ${params.repoFullName}\n\nFILES TO AUDIT IN THIS CHUNK:\n${params.chunkFiles.map(f => `- ${f}`).join("\n")}\n\nFILE CONTENTS:\n\n${fileBlocks}`;
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const res = await callOpenAIRaw({
      requestId: params.requestId,
      reviewId: params.reviewId,
      model: REVIEW_MODEL,
      systemPrompt: CODEBASE_CHUNK_AUDIT_SYSTEM_PROMPT,
      userContent,
      apiKey: params.apiKey,
      jsonMode: true,
    });

    if (res.ok) {
      const { text, usage } = await readOpenAIText(res);
      const parsed: any = parseJsonResponse(text);
      return { findings: parsed.findings ?? [], usage };
    }

    const body = await res.text();
    if (res.status !== 429 || attempt === maxRetries - 1) {
      throw new Error(`OpenAI chunk audit API error ${res.status}: ${body.slice(0, 500)}`);
    }

    const delay = 3000 * Math.pow(2, attempt);
    logger.warn("openai.chunk_rate_limited_retry", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      attempt: attempt + 1,
      delayMs: delay,
      apiKeyLast4: params.apiKey ? params.apiKey.slice(-4) : "none",
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
  const apiKey = getOpenAIApiKey();
  const files = Object.keys(params.filesContent);
  const parallelEnabled = await isParallelEngineEnabled();

  if (files.length <= 15 || !parallelEnabled) {
    logger.info("openai.codebase_audit.single_step", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      fileCount: files.length,
      parallelEnabled,
    });
    
    const fileBlocks = files.map(path => {
      const content = params.filesContent[path] ?? "";
      return `=== FILE: ${path} ===\n${content.slice(0, 8000)}${content.length > 8000 ? "\n... (truncated)" : ""}`;
    }).join("\n\n");

    const userContent = `REPOSITORY: ${params.repoFullName}\n\nAUDITED FILES (${files.length}):\n${files.map(f => `- ${f}`).join("\n")}\n\nFILE CONTENTS:\n\n${fileBlocks}`;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
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
        parsed.audited_files = parsed.audited_files?.length ? parsed.audited_files : files;
        return { ...parsed, usage, model: REVIEW_MODEL };
      }

      const body = await res.text();
      if (res.status !== 429 || attempt === maxRetries - 1) {
        throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 500)}`);
      }

      const delay = 3000 * Math.pow(2, attempt);
      logger.warn("openai.single_step_rate_limited_retry", {
        requestId: params.requestId,
        reviewId: params.reviewId,
        attempt: attempt + 1,
        delayMs: delay,
        apiKeyLast4: apiKey ? apiKey.slice(-4) : "none",
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("OpenAI codebase audit failed after retries");
  }

  logger.info("openai.codebase_audit.parallel_chunk_start", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    totalFiles: files.length,
  });

  const chunkSize = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < files.length; i += chunkSize) {
    chunks.push(files.slice(i, i + chunkSize));
  }

  const chunkResults: Array<{ findings: any[]; usage: OpenAIUsage }> = [];
  for (const chunkFiles of chunks) {
    const chunkRes = await auditFileChunk({
      requestId: params.requestId,
      reviewId: params.reviewId,
      repoFullName: params.repoFullName,
      chunkFiles,
      filesContent: params.filesContent,
      apiKey,
    });
    chunkResults.push(chunkRes);
    // Add artificial delay between chunks to respect OpenAI RPM rate limit
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

  logger.info("openai.codebase_audit.parallel_chunk_complete", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    chunksCount: chunks.length,
    totalFindingsCollected: mergedFindings.length,
  });

  const synthesisUserContent = `REPOSITORY: ${params.repoFullName}
AUDITED FILES (${files.length}):
${files.map(f => `- ${f}`).join("\n")}

ACCUMULATED CHUNK FINDINGS (${mergedFindings.length}):
${JSON.stringify(mergedFindings, null, 2)}`;

  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
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

      const finalUsage: OpenAIUsage = {
        promptTokenCount: chunkPromptTokens + (usage.promptTokenCount ?? 0),
        candidatesTokenCount: chunkCandidateTokens + (usage.candidatesTokenCount ?? 0),
        totalTokenCount: chunkTotalTokens + (usage.totalTokenCount ?? 0),
      };

      parsed.audited_files = files;
      
      logger.info("openai.codebase_audit.synthesis_complete", {
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
      throw new Error(`OpenAI codebase synthesis API error ${res.status}: ${body.slice(0, 500)}`);
    }

    const delay = 3000 * Math.pow(2, attempt);
    logger.warn("openai.synthesis_rate_limited_retry", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      attempt: attempt + 1,
      delayMs: delay,
      apiKeyLast4: apiKey ? apiKey.slice(-4) : "none",
    });
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error("OpenAI codebase audit synthesis failed after retries");
}
