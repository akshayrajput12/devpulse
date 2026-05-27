import { createClient } from "@supabase/supabase-js";
import { processReviewBackend } from "./review-processor.server.js";
import { callFolderAnalysisAI, buildTreeString } from "../ai/orchestrator.js";
import { logger } from "../logging/logger.server.js";

import { getRequiredEnv, getRuntimeEnv } from "../config/env.server.js";

function adminClient() {
  const url = getRequiredEnv("SUPABASE_URL");
  const key = getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY") || getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export type ReviewType = "pr_review" | "codebase_audit" | "api_analysis" | "folder_analysis";

/**
 * Enqueues a Standard Review (PR, Codebase, API)
 */
export async function enqueueReview(reviewId: string, reviewType: ReviewType) {
  const sb = adminClient();
  const { data, error } = await sb
    .from("review_queue")
    .insert({
      review_id: reviewId,
      review_type: reviewType,
      status: "pending",
      attempts: 0,
      max_attempts: 3,
      next_retry_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error("queue.enqueue_review_failed", { reviewId, reviewType, error: error.message });
    throw error;
  }

  logger.info("queue.enqueued_review", { queueId: data.id, reviewId, reviewType });
  triggerQueueWorker();
  return data;
}

/**
 * Enqueues a Folder Structure Analysis
 */
export async function enqueueFolderAnalysis(folderAnalysisId: string) {
  const sb = adminClient();
  const { data, error } = await sb
    .from("review_queue")
    .insert({
      folder_analysis_id: folderAnalysisId,
      review_type: "folder_analysis",
      status: "pending",
      attempts: 0,
      max_attempts: 3,
      next_retry_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error("queue.enqueue_folder_failed", { folderAnalysisId, error: error.message });
    throw error;
  }

  logger.info("queue.enqueued_folder", { queueId: data.id, folderAnalysisId });
  triggerQueueWorker();
  return data;
}

let activeWorkersCount = 0;
let isWorkerPoolActive = false;

// Dynamic concurrency limit parameters with 15s cache TTL
let cachedConcurrency = 4;
let lastConfigFetch = 0;
const CONFIG_TTL_MS = 15000;

async function fetchDynamicConcurrency(sb: any): Promise<number> {
  const now = Date.now();
  if (now - lastConfigFetch < CONFIG_TTL_MS) {
    return cachedConcurrency;
  }
  try {
    const { data } = await sb
      .from("system_settings")
      .select("value")
      .eq("key", "queue_concurrency")
      .maybeSingle();

    if (data && data.value) {
      cachedConcurrency = parseInt(data.value, 10) || 4;
    }
  } catch (err) {
    logger.error("queue.fetch_config_failed", { error: err instanceof Error ? err.message : String(err) });
  }
  lastConfigFetch = now;
  return cachedConcurrency;
}

/**
 * Triggers the background worker pool. This returns immediately so it doesn't block the caller.
 */
export function triggerQueueWorker() {
  if (isWorkerPoolActive) return;
  isWorkerPoolActive = true;
  
  runWorkerPool().catch(err => {
    logger.error("queue.pool_uncaught_error", { error: err instanceof Error ? err.message : String(err) });
  }).finally(() => {
    isWorkerPoolActive = false;
  });
}

// Graceful Draining SIGTERM & SIGINT Handlers
let isShutdownSignalReceived = false;

function setupGracefulShutdown() {
  const handleShutdown = async (signal: string) => {
    if (isShutdownSignalReceived) return;
    isShutdownSignalReceived = true;
    logger.info("queue.shutdown_signal_received", { signal, activeTasks: activeWorkersCount });
    
    // Hard lock concurrency to zero to block any new task claims
    cachedConcurrency = 0;
    lastConfigFetch = Date.now() + 3600000; // prevent updates for 1 hour

    let attempts = 0;
    while (activeWorkersCount > 0 && attempts < 30) {
      logger.info("queue.draining_active_workers", { remaining: activeWorkersCount });
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    logger.info("queue.shutdown_complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

// Invoke configuration setup once
setupGracefulShutdown();

async function runWorkerPool() {
  const sb = adminClient();
  const workerId = `worker-${process.env.HOSTNAME || "node"}-${Math.random().toString(36).slice(2, 6)}`;

  while (true) {
    if (isShutdownSignalReceived) {
      break;
    }

    const dynamicLimit = await fetchDynamicConcurrency(sb);

    // Yield to event loop if capacity is fully utilized
    if (activeWorkersCount >= dynamicLimit) {
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }

    // Atomically claim next job under dynamic rate limit
    const { data: claim, error: claimErr } = await sb.rpc("claim_next_queue_item_v3", { 
      p_worker_id: workerId
    });

    if (claimErr) {
      logger.error("queue.claim_failed", { error: claimErr.message });
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }

    if (!claim || claim.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      continue;
    }

    const item = claim[0];
    activeWorkersCount++;

    processTask(item, sb).finally(() => {
      activeWorkersCount--;
    });
  }
}

async function processTask(item: any, sb: any) {
  const queueId = item.q_id;
  const reviewId = item.q_review_id;
  const folderAnalysisId = item.q_folder_analysis_id;
  const reviewType = item.q_review_type as ReviewType;
  const attempts = item.q_attempts;

  logger.info("queue.processing_item", { queueId, reviewId, folderAnalysisId, reviewType, attempts });

  try {
    if (reviewType === "folder_analysis") {
      await processFolderAnalysisJob(folderAnalysisId, sb);
    } else {
      await processReviewBackend({ reviewId });
    }

    // Mark queue item as completed successfully
    await sb.from("review_queue").update({ status: "completed" }).eq("id", queueId);
    logger.info("queue.item_completed", { queueId, reviewId, folderAnalysisId });
  } catch (jobErr) {
    const errMsg = jobErr instanceof Error ? jobErr.message : String(jobErr);
    logger.error("queue.item_failed", { queueId, reviewId, folderAnalysisId, error: errMsg });

    // Compute exponential backoff retry parameters
    const backoffMinutes = Math.pow(5, attempts);
    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(nextRetryAt.getMinutes() + backoffMinutes);

    const isFinalFailure = attempts >= 3;
    const finalStatus = isFinalFailure ? "failed" : "failed"; 

    await sb.from("review_queue").update({
      status: finalStatus,
      last_error: errMsg,
      next_retry_at: nextRetryAt.toISOString(),
    }).eq("id", queueId);

    // Sync state reporting to base records
    if (reviewType === "folder_analysis") {
      await sb.from("folder_analyses").update({
        status: "failed",
        error_message: errMsg,
      }).eq("id", folderAnalysisId);
    } else {
      await sb.from("reviews").update({
        status: "failed",
        error_message: errMsg,
      }).eq("id", reviewId);
    }
  }
}

/**
 * Handles the background computation for a Folder Structure Analysis
 */
export async function processFolderAnalysisJob(folderAnalysisId: string, sb: any) {
  // Fetch folder analysis detail
  const { data: analysis, error: aErr } = await sb
    .from("folder_analyses")
    .select("*")
    .eq("id", folderAnalysisId)
    .single();

  if (aErr || !analysis) {
    throw new Error(`Folder analysis record not found: ${aErr?.message}`);
  }

  // Update status to processing
  await sb.from("folder_analyses").update({ status: "processing", error_message: null }).eq("id", folderAnalysisId);

  // Check if profile exists and check/renew credits
  const { data: profile } = await sb.from("profiles")
    .select("plan, review_credits, reviews_used_this_month")
    .eq("id", analysis.user_id)
    .maybeSingle();

  // Folder Analysis costs 2 credits
  const cost = 2;
  const credits = profile?.review_credits ?? 10;
  if (credits < cost) {
    throw new Error(`Insufficient credits. You need ${cost} credits but have ${credits}.`);
  }

  // Generate ASCII tree structure representation for the AI
  const structure = buildTreeString(analysis.file_tree || [], 400);

  const plan = profile?.plan ?? "free";

  // Run AI analysis
  const requestId = `folder-${folderAnalysisId.slice(0, 8)}`;
  logger.info("queue.folder_ai_started", { folderAnalysisId, fileCount: analysis.file_tree?.length });

  const result = await callFolderAnalysisAI({
    requestId,
    structure,
    repoName: analysis.repo_full_name,
    plan,
  });

  // Update main folder analysis record with AI report findings
  const { error: saveErr } = await sb
    .from("folder_analyses")
    .update({
      status: "complete",
      organization_score: result.organization_score,
      grade: result.grade,
      stack_detected: result.stack_detected,
      strengths: result.current_analysis?.strengths ?? [],
      weaknesses: result.current_analysis?.weaknesses ?? [],
      critical_issues: result.current_analysis?.critical_issues ?? [],
      ideal_description: result.ideal_structure?.description ?? "",
      ideal_tree: result.ideal_structure?.tree ?? "",
      ideal_key_decisions: result.ideal_structure?.key_decisions ?? [],
      folder_annotations: result.folder_annotations ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", folderAnalysisId);

  if (saveErr) {
    throw new Error(`Failed to save folder analysis report: ${saveErr.message}`);
  }

  // Purge any existing actions first
  await sb.from("folder_migration_actions").delete().eq("analysis_id", folderAnalysisId);

  // Insert migration action items if returned by Gemini
  if (result.migration_actions?.length) {
    const actions = result.migration_actions.map((a: any, i: number) => ({
      analysis_id: folderAnalysisId,
      priority: a.priority,
      action: a.action,
      from_path: a.from ?? "",
      to_path: a.to ?? "",
      reason: a.reason ?? "",
      sort_order: i,
    }));

    const { error: actErr } = await sb.from("folder_migration_actions").insert(actions);
    if (actErr) {
      logger.error("queue.save_folder_actions_failed", { folderAnalysisId, error: actErr.message });
    }
  }

  // Deduct credits from user profile
  await sb.from("profiles")
    .update({
      review_credits: Math.max(0, credits - cost),
      reviews_used_this_month: (profile?.reviews_used_this_month ?? 0) + 1,
    })
    .eq("id", analysis.user_id);

  logger.info("queue.folder_completed", { folderAnalysisId, organizationScore: result.organization_score });
}
