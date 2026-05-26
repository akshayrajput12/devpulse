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

// Global active worker state to prevent parallel worker loops in the same instance
let isWorkerRunning = false;

/**
 * Triggers the background worker loop. This returns immediately so it doesn't block the caller.
 */
export function triggerQueueWorker() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  
  // Execute asynchronous loop without blocking standard request streams
  runWorkerLoop().catch(err => {
    logger.error("queue.worker_loop_uncaught", { error: err instanceof Error ? err.message : String(err) });
  }).finally(() => {
    isWorkerRunning = false;
  });
}

async function runWorkerLoop() {
  const sb = adminClient();
  let itemsProcessed = 0;

  while (true) {
    // Atomically claim next job using SKIP LOCKED database RPC
    const { data: claim, error: claimErr } = await sb.rpc("claim_next_queue_item", { p_worker_id: "worker-1" });
    
    if (claimErr) {
      logger.error("queue.claim_failed", { error: claimErr.message });
      break;
    }

    // No pending or retryable queue items left
    if (!claim || claim.length === 0) {
      break;
    }

    const item = claim[0];
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
        // Run standard reviews: PR, codebase audit, API audit
        await processReviewBackend({ reviewId });
      }

      // Mark queue item as completed successfully
      await sb.from("review_queue").update({ status: "completed" }).eq("id", queueId);
      logger.info("queue.item_completed", { queueId, reviewId, folderAnalysisId });
    } catch (jobErr) {
      const errMsg = jobErr instanceof Error ? jobErr.message : String(jobErr);
      logger.error("queue.item_failed", { queueId, reviewId, folderAnalysisId, error: errMsg });

      // Compute exponential backoff for next retry: e.g. 1 min, 5 mins, 15 mins...
      const backoffMinutes = Math.pow(5, attempts);
      const nextRetryAt = new Date();
      nextRetryAt.setMinutes(nextRetryAt.getMinutes() + backoffMinutes);

      const isFinalFailure = attempts >= 3; // Max attempts limit
      const finalStatus = isFinalFailure ? "failed" : "failed"; // keep failed so it can be retried or marked as dead

      await sb.from("review_queue").update({
        status: finalStatus,
        last_error: errMsg,
        next_retry_at: nextRetryAt.toISOString(),
      }).eq("id", queueId);

      // Also update target record status so the user gets the error feed
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

    itemsProcessed++;
    // Yield to event loop to avoid CPU starvation
    await new Promise(resolve => setTimeout(resolve, 50));
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
