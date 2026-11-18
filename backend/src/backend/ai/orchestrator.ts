import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, hasUsableServiceRoleKey } from "../config/env.server.js";
import { logger } from "../logging/logger.server.js";
import { hasGeminiKeyAvailable } from "./gemini/models.js";
import { hasOpenAIKeyAvailable } from "./openai/models.js";

export { selectApiFiles } from "./gemini/api-analyser.js";

export type FolderAnalysisResult = {
  organization_score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  stack_detected: string;
  current_analysis: {
    strengths: string[];
    weaknesses: string[];
    critical_issues: string[];
  };
  ideal_structure: {
    description: string;
    tree: string;
    key_decisions: string[];
  };
  migration_actions: Array<{
    priority: "critical" | "high" | "medium" | "low";
    action: string;
    from: string;
    to: string;
    reason: string;
  }>;
  folder_annotations: Record<string, { status: "good" | "warning" | "critical" | "missing"; note: string }>;
  usage?: any;
  model?: string;
};

// Gemini Imports
import { callFolderAnalysisAI as callFolderAnalysisGemini } from "./gemini/folder-analysis.js";
import { callApiAnalysisAI as callApiAnalysisGemini } from "./gemini/api-analyser.js";
import { callCodebaseAuditAI as callCodebaseAuditGemini } from "./gemini/codebase-audit.js";
import { callPrReviewAI as callPrReviewGemini } from "./gemini/pr-review.js";

// OpenAI Imports
import { callFolderAnalysisAI as callFolderAnalysisOpenAI } from "./openai/folder-analysis.js";
import { callApiAnalysisAI as callApiAnalysisOpenAI } from "./openai/api-analyser.js";
import { callCodebaseAuditAI as callCodebaseAuditOpenAI } from "./openai/codebase-audit.js";
import { callPrReviewAI as callPrReviewOpenAI } from "./openai/pr-review.js";

function getSupabaseClient() {
  const url = getRequiredEnv("SUPABASE_URL");
  const key = hasUsableServiceRoleKey()
    ? getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    : getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

let cachedProvider: "gemini" | "openai" | "both" | null = null;
let cacheExpiry = 0;

export async function getActiveAIProvider(): Promise<"gemini" | "openai" | "both"> {
  const now = Date.now();
  if (cachedProvider && now < cacheExpiry) {
    return cachedProvider;
  }

  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("system_settings")
      .select("value")
      .eq("key", "ai_provider")
      .maybeSingle();

    if (error || !data) {
      return "both";
    }

    const val = data.value as "gemini" | "openai" | "both";
    cachedProvider = val === "gemini" || val === "openai" || val === "both" ? val : "both";
    cacheExpiry = now + 10_000;
    return cachedProvider;
  } catch (err) {
    logger.warn("orchestrator.db_provider_read_failed", { error: String(err) });
    return "both";
  }
}

let cachedParallelEnabled: boolean | null = null;
let parallelCacheExpiry = 0;

export async function isParallelEngineEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedParallelEnabled !== null && now < parallelCacheExpiry) {
    return cachedParallelEnabled;
  }

  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from("system_settings")
      .select("value")
      .eq("key", "parallel_engine_enabled")
      .maybeSingle();

    if (error || !data) {
      return true;
    }

    const val = data.value === "true";
    cachedParallelEnabled = val;
    parallelCacheExpiry = now + 10_000;
    return val;
  } catch (err) {
    logger.warn("orchestrator.db_parallel_enabled_read_failed", { error: String(err) });
    return true;
  }
}

function hasOpenAICreds(): boolean {
  return hasOpenAIKeyAvailable();
}

function hasGeminiCreds(): boolean {
  return hasGeminiKeyAvailable();
}

export function buildTreeString(items: Array<{ path: string; type: string }>, maxItems = 300) {
  const sorted = items.slice(0, maxItems).sort((a, b) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  const lines: string[] = [];
  const seen = new Set<string>();

  for (const item of sorted) {
    const parts = item.path.split("/");
    const depth = parts.length - 1;
    const name = parts[parts.length - 1];
    const indent = "  ".repeat(depth);
    const prefix = item.type === "tree" ? "[dir]" : "[file]";
    if (!seen.has(item.path)) {
      seen.add(item.path);
      lines.push(`${indent}${prefix} ${name}${item.type === "tree" ? "/" : ""}`);
    }
  }

  if (items.length > maxItems) {
    lines.push(`  ... (${items.length - maxItems} more files truncated)`);
  }

  return lines.join("\n");
}

/**
 * Universal Dual-Engine Failover Router.
 * Determines provider order from system_settings + available credentials,
 * executes primary provider, and seamlessly fails over to the secondary provider
 * on any outage, rate-limit exhaustion, timeout, or schema error.
 */
async function executeWithProviderFailover<T>(params: {
  scope: "folder_analysis" | "api_analysis" | "codebase_audit" | "pr_review";
  requestId: string;
  plan?: string;
  meta?: Record<string, unknown>;
  runGemini: () => Promise<T>;
  runOpenAI: () => Promise<T>;
}): Promise<T> {
  const provider = await getActiveAIProvider();
  const hasGem = hasGeminiCreds();
  const hasOai = hasOpenAICreds();

  logger.info(`orchestrator.${params.scope}.start`, {
    requestId: params.requestId,
    provider,
    plan: params.plan ?? "free",
    hasGeminiCreds: hasGem,
    hasOpenAICreds: hasOai,
    ...params.meta,
  });

  if (!hasGem && !hasOai) {
    throw new Error("No AI provider API keys are configured (GEMINI_API_KEY / OPENAI_API_KEY).");
  }

  // Build ordered execution chain based on admin preference & credential availability
  const chain: Array<{ name: "gemini" | "openai"; run: () => Promise<T> }> = [];
  if (provider === "openai") {
    if (hasOai) chain.push({ name: "openai", run: params.runOpenAI });
    if (hasGem) chain.push({ name: "gemini", run: params.runGemini });
  } else {
    // "both" or "gemini": prefer Gemini first, auto-failover to OpenAI
    if (hasGem) chain.push({ name: "gemini", run: params.runGemini });
    if (hasOai) chain.push({ name: "openai", run: params.runOpenAI });
  }

  let lastError: unknown = null;
  for (let i = 0; i < chain.length; i += 1) {
    const candidate = chain[i];
    const startedAt = Date.now();
    try {
      const result = await candidate.run();
      if (i > 0) {
        logger.info(`orchestrator.${params.scope}.failover_succeeded`, {
          requestId: params.requestId,
          provider: candidate.name,
          durationMs: Date.now() - startedAt,
        });
      }
      return result;
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const hasNext = i + 1 < chain.length;
      logger.warn(`orchestrator.${params.scope}.provider_failed`, {
        requestId: params.requestId,
        provider: candidate.name,
        willFailover: hasNext,
        nextProvider: hasNext ? chain[i + 1].name : null,
        durationMs: Date.now() - startedAt,
        error: errMsg.slice(0, 400),
      });
    }
  }

  logger.error(`orchestrator.${params.scope}.all_providers_failed`, {
    requestId: params.requestId,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function callFolderAnalysisAI(params: {
  requestId: string;
  structure: string;
  repoName?: string;
  plan?: string;
}) {
  return executeWithProviderFailover({
    scope: "folder_analysis",
    requestId: params.requestId,
    plan: params.plan,
    runGemini: () => callFolderAnalysisGemini(params),
    runOpenAI: () => callFolderAnalysisOpenAI(params),
  });
}

export async function callApiAnalysisAI(params: {
  requestId: string;
  reviewId: string;
  repoFullName: string;
  filesContent: Record<string, string>;
  plan?: string;
}) {
  const totalLength = Object.values(params.filesContent).reduce((acc, text) => acc + (text?.length ?? 0), 0);
  return executeWithProviderFailover({
    scope: "api_analysis",
    requestId: params.requestId,
    plan: params.plan,
    meta: {
      totalFiles: Object.keys(params.filesContent).length,
      totalLength,
      isLargeCodebase: totalLength > 200_000,
    },
    runGemini: () => callApiAnalysisGemini(params),
    runOpenAI: () => callApiAnalysisOpenAI(params),
  });
}

export async function callCodebaseAuditAI(params: {
  requestId: string;
  reviewId: string;
  repoFullName: string;
  filesContent: Record<string, string>;
  plan?: string;
}) {
  const totalLength = Object.values(params.filesContent).reduce((acc, text) => acc + (text?.length ?? 0), 0);
  return executeWithProviderFailover({
    scope: "codebase_audit",
    requestId: params.requestId,
    plan: params.plan,
    meta: {
      totalFiles: Object.keys(params.filesContent).length,
      totalLength,
      isLargeCodebase: totalLength > 200_000,
    },
    runGemini: () => callCodebaseAuditGemini(params),
    runOpenAI: () => callCodebaseAuditOpenAI(params),
  });
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
}) {
  const diffLength = params.diff?.length ?? 0;
  return executeWithProviderFailover({
    scope: "pr_review",
    requestId: params.requestId,
    plan: params.plan,
    meta: {
      diffLength,
      isLargeDiff: diffLength > 200_000,
      reviewType: params.reviewType ?? "pr",
    },
    runGemini: () => callPrReviewGemini(params),
    runOpenAI: () => callPrReviewOpenAI(params),
  });
}
