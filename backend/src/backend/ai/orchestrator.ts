import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, getRuntimeEnv } from "../config/env.server.js";
import { logger } from "../logging/logger.server.js";

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
  const key = getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY") || getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
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
    cachedProvider = val;
    cacheExpiry = now + 10_000; // cache for 10 seconds
    return val;
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
      return true; // default to true if missing
    }

    const val = data.value === "true";
    cachedParallelEnabled = val;
    parallelCacheExpiry = now + 10_000; // cache for 10 seconds
    return val;
  } catch (err) {
    logger.warn("orchestrator.db_parallel_enabled_read_failed", { error: String(err) });
    return true; // default to true
  }
}

/** Check if OpenAI keys/configs are fully present. If not, auto-fallback to Gemini even if OpenAI is requested. */
function hasOpenAICreds(): boolean {
  try {
    const key = getRuntimeEnv("OPENAI_API_KEY");
    return !!key && key.trim().length > 0;
  } catch {
    return false;
  }
}

/** Check if Gemini keys are present. */
function hasGeminiCreds(): boolean {
  try {
    const key = getRuntimeEnv("GEMINI_API_KEY");
    return !!key && key.trim().length > 0;
  } catch {
    return false;
  }
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

export async function callFolderAnalysisAI(params: {
  requestId: string;
  structure: string;
  repoName?: string;
  plan?: string;
}) {
  const isPro = params.plan === "pro";
  if (!isPro) {
    logger.info("orchestrator.folder_analysis.free_plan_routing.gemini_only", { requestId: params.requestId });
    try {
      return await callFolderAnalysisGemini(params);
    } catch (err) {
      logger.error("orchestrator.folder_analysis.free_plan_routing.gemini_failed", { requestId: params.requestId, error: String(err) });
      throw new Error("Gemini rate limit reached on Free plan. Please upgrade to Developer Pro for resilient auto-failover, or try again in 1 minute.");
    }
  }

  const provider = await getActiveAIProvider();
  logger.info("orchestrator.folder_analysis.start", { requestId: params.requestId, provider });

  if (provider === "openai") {
    if (hasOpenAICreds()) {
      try {
        return await callFolderAnalysisOpenAI(params);
      } catch (err) {
        logger.warn("orchestrator.folder_analysis.openai_failed_fallback_gemini", { requestId: params.requestId, error: String(err) });
      }
    } else {
      logger.warn("orchestrator.folder_analysis.openai_creds_missing_fallback_gemini", { requestId: params.requestId });
    }
    return await callFolderAnalysisGemini(params);
  }

  if (provider === "gemini") {
    if (hasGeminiCreds()) {
      try {
        return await callFolderAnalysisGemini(params);
      } catch (err) {
        logger.warn("orchestrator.folder_analysis.gemini_failed_fallback_openai", { requestId: params.requestId, error: String(err) });
        if (hasOpenAICreds()) {
          return await callFolderAnalysisOpenAI(params);
        }
      }
    }
    return await callFolderAnalysisGemini(params);
  }

  // Dual provider (both) - always try Gemini first, fallback to OpenAI
  if (hasGeminiCreds()) {
    try {
      return await callFolderAnalysisGemini(params);
    } catch (err) {
      logger.warn("orchestrator.folder_analysis.gemini_primary_failed_fallback_openai", { requestId: params.requestId, error: String(err) });
      if (hasOpenAICreds()) {
        try {
          return await callFolderAnalysisOpenAI(params);
        } catch (opErr) {
          logger.error("orchestrator.folder_analysis.both_providers_failed", { requestId: params.requestId, error: String(opErr) });
        }
      }
    }
  } else if (hasOpenAICreds()) {
    try {
      return await callFolderAnalysisOpenAI(params);
    } catch (opErr) {
      logger.error("orchestrator.folder_analysis.openai_only_failed", { requestId: params.requestId, error: String(opErr) });
    }
  }
  return await callFolderAnalysisGemini(params);
}

export async function callApiAnalysisAI(params: {
  requestId: string;
  reviewId: string;
  repoFullName: string;
  filesContent: Record<string, string>;
  plan?: string;
}) {
  const isPro = params.plan === "pro";
  if (!isPro) {
    logger.info("orchestrator.api_analysis.free_plan_routing.gemini_only", { requestId: params.requestId });
    try {
      return await callApiAnalysisGemini(params);
    } catch (err) {
      logger.error("orchestrator.api_analysis.free_plan_routing.gemini_failed", { requestId: params.requestId, error: String(err) });
      throw new Error("Gemini rate limit reached on Free plan. Please upgrade to Developer Pro for resilient auto-failover, or try again in 1 minute.");
    }
  }

  const provider = await getActiveAIProvider();
  
  // Calculate total characters in codebase to check context size
  const totalLength = Object.values(params.filesContent).reduce((acc, text) => acc + (text?.length ?? 0), 0);
  const isLargeCodebase = totalLength > 200_000;

  logger.info("orchestrator.api_analysis.start", {
    requestId: params.requestId,
    provider,
    totalFiles: Object.keys(params.filesContent).length,
    totalLength,
    isLargeCodebase,
  });

  if (provider === "gemini") {
    if (hasGeminiCreds()) {
      try {
        return await callApiAnalysisGemini(params);
      } catch (err) {
        logger.warn("orchestrator.api_analysis.gemini_failed_fallback_openai", { requestId: params.requestId, error: String(err) });
        if (hasOpenAICreds()) {
          return await callApiAnalysisOpenAI(params);
        }
      }
    }
    return await callApiAnalysisGemini(params);
  }

  if (provider === "openai") {
    if (hasOpenAICreds()) {
      try {
        return await callApiAnalysisOpenAI(params);
      } catch (err) {
        logger.warn("orchestrator.api_analysis.openai_failed_fallback_gemini", { requestId: params.requestId, error: String(err) });
      }
    } else {
      logger.warn("orchestrator.api_analysis.openai_creds_missing_fallback_gemini", { requestId: params.requestId });
    }
    return await callApiAnalysisGemini(params);
  }

  // Dual provider (both) - try Gemini first, fallback to OpenAI
  if (hasGeminiCreds()) {
    try {
      if (isLargeCodebase) {
        logger.info("orchestrator.api_analysis.large_codebase_dual_gemini_primary", { requestId: params.requestId, totalLength });
      }
      return await callApiAnalysisGemini(params);
    } catch (err) {
      logger.warn("orchestrator.api_analysis.gemini_primary_failed_fallback_openai", { requestId: params.requestId, error: String(err) });
      if (hasOpenAICreds()) {
        try {
          return await callApiAnalysisOpenAI(params);
        } catch (opErr) {
          logger.error("orchestrator.api_analysis.both_providers_failed", { requestId: params.requestId, error: String(opErr) });
        }
      }
    }
  } else if (hasOpenAICreds()) {
    try {
      return await callApiAnalysisOpenAI(params);
    } catch (opErr) {
      logger.error("orchestrator.api_analysis.openai_only_failed", { requestId: params.requestId, error: String(opErr) });
    }
  }
  return await callApiAnalysisGemini(params);
}

export async function callCodebaseAuditAI(params: {
  requestId: string;
  reviewId: string;
  repoFullName: string;
  filesContent: Record<string, string>;
  plan?: string;
}) {
  const isPro = params.plan === "pro";
  if (!isPro) {
    logger.info("orchestrator.codebase_audit.free_plan_routing.gemini_only", { requestId: params.requestId });
    try {
      return await callCodebaseAuditGemini(params);
    } catch (err) {
      logger.error("orchestrator.codebase_audit.free_plan_routing.gemini_failed", { requestId: params.requestId, error: String(err) });
      throw new Error("Gemini rate limit reached on Free plan. Please upgrade to Developer Pro for resilient auto-failover, or try again in 1 minute.");
    }
  }

  const provider = await getActiveAIProvider();
  const totalLength = Object.values(params.filesContent).reduce((acc, text) => acc + (text?.length ?? 0), 0);
  const isLargeCodebase = totalLength > 200_000;

  logger.info("orchestrator.codebase_audit.start", {
    requestId: params.requestId,
    provider,
    totalFiles: Object.keys(params.filesContent).length,
    totalLength,
    isLargeCodebase,
  });

  if (provider === "gemini") {
    if (hasGeminiCreds()) {
      try {
        return await callCodebaseAuditGemini(params);
      } catch (err) {
        logger.warn("orchestrator.codebase_audit.gemini_failed_fallback_openai", { requestId: params.requestId, error: String(err) });
        if (hasOpenAICreds()) {
          return await callCodebaseAuditOpenAI(params);
        }
      }
    }
    return await callCodebaseAuditGemini(params);
  }

  if (provider === "openai") {
    if (hasOpenAICreds()) {
      try {
        return await callCodebaseAuditOpenAI(params);
      } catch (err) {
        logger.warn("orchestrator.codebase_audit.openai_failed_fallback_gemini", { requestId: params.requestId, error: String(err) });
      }
    } else {
      logger.warn("orchestrator.codebase_audit.openai_creds_missing_fallback_gemini", { requestId: params.requestId });
    }
    return await callCodebaseAuditGemini(params);
  }

  // Dual provider (both) - try Gemini first, fallback to OpenAI
  if (hasGeminiCreds()) {
    try {
      if (isLargeCodebase) {
        logger.info("orchestrator.codebase_audit.large_codebase_dual_gemini_primary", { requestId: params.requestId, totalLength });
      }
      return await callCodebaseAuditGemini(params);
    } catch (err) {
      logger.warn("orchestrator.codebase_audit.gemini_primary_failed_fallback_openai", { requestId: params.requestId, error: String(err) });
      if (hasOpenAICreds()) {
        try {
          return await callCodebaseAuditOpenAI(params);
        } catch (opErr) {
          logger.error("orchestrator.codebase_audit.both_providers_failed", { requestId: params.requestId, error: String(opErr) });
        }
      }
    }
  } else if (hasOpenAICreds()) {
    try {
      return await callCodebaseAuditOpenAI(params);
    } catch (opErr) {
      logger.error("orchestrator.codebase_audit.openai_only_failed", { requestId: params.requestId, error: String(opErr) });
    }
  }
  return await callCodebaseAuditGemini(params);
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
  const isPro = params.plan === "pro";
  if (!isPro) {
    logger.info("orchestrator.pr_review.free_plan_routing.gemini_only", { requestId: params.requestId });
    try {
      return await callPrReviewGemini(params);
    } catch (err) {
      logger.error("orchestrator.pr_review.free_plan_routing.gemini_failed", { requestId: params.requestId, error: String(err) });
      throw new Error("Gemini rate limit reached on Free plan. Please upgrade to Developer Pro for resilient auto-failover, or try again in 1 minute.");
    }
  }

  const provider = await getActiveAIProvider();
  const diffLength = params.diff?.length ?? 0;
  const isLargeDiff = diffLength > 200_000;

  logger.info("orchestrator.pr_review.start", {
    requestId: params.requestId,
    provider,
    diffLength,
    isLargeDiff,
  });

  if (provider === "gemini") {
    if (hasGeminiCreds()) {
      try {
        return await callPrReviewGemini(params);
      } catch (err) {
        logger.warn("orchestrator.pr_review.gemini_failed_fallback_openai", { requestId: params.requestId, error: String(err) });
        if (hasOpenAICreds()) {
          return await callPrReviewOpenAI(params);
        }
      }
    }
    return await callPrReviewGemini(params);
  }

  if (provider === "openai") {
    if (hasOpenAICreds()) {
      try {
        return await callPrReviewOpenAI(params);
      } catch (err) {
        logger.warn("orchestrator.pr_review.openai_failed_fallback_gemini", { requestId: params.requestId, error: String(err) });
      }
    } else {
      logger.warn("orchestrator.pr_review.openai_creds_missing_fallback_gemini", { requestId: params.requestId });
    }
    return await callPrReviewGemini(params);
  }

  // Dual provider (both) - try Gemini first, fallback to OpenAI
  if (hasGeminiCreds()) {
    try {
      if (isLargeDiff) {
        logger.info("orchestrator.pr_review.large_diff_dual_gemini_primary", { requestId: params.requestId, diffLength });
      }
      return await callPrReviewGemini(params);
    } catch (err) {
      logger.warn("orchestrator.pr_review.gemini_primary_failed_fallback_openai", { requestId: params.requestId, error: String(err) });
      if (hasOpenAICreds()) {
        try {
          return await callPrReviewOpenAI(params);
        } catch (opErr) {
          logger.error("orchestrator.pr_review.both_providers_failed", { requestId: params.requestId, error: String(opErr) });
        }
      }
    }
  } else if (hasOpenAICreds()) {
    try {
      return await callPrReviewOpenAI(params);
    } catch (opErr) {
      logger.error("orchestrator.pr_review.openai_only_failed", { requestId: params.requestId, error: String(opErr) });
    }
  }
  return await callPrReviewGemini(params);
}
