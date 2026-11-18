import { createClient } from "@supabase/supabase-js";
import { processReviewBackend } from "./review-processor.server.js";
import { callFolderAnalysisAI, buildTreeString } from "../ai/orchestrator.js";
import { logger } from "../logging/logger.server.js";
import { getRequiredEnv, getRuntimeEnv, hasUsableServiceRoleKey } from "../config/env.server.js";

function adminClient() {
  const url = getRequiredEnv("SUPABASE_URL");
  const key = hasUsableServiceRoleKey()
    ? getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    : getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function userClientFromToken(token: string) {
  const url = getRequiredEnv("SUPABASE_URL");
  const anonKey = getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export type ReviewType = "pr_review" | "codebase_audit" | "api_analysis" | "folder_analysis";

function isPermissionOrQueueSchemaError(err: any): boolean {
  const code = String(err?.code ?? "");
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return (
    code === "42501" ||
    code === "42P01" ||
    code === "42883" ||
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("does not exist")
  );
}

// ─── Bounded In-Process Background Worker (Zero-Failure Fallback) ────────────
type InProcessJob =
  | { kind: "review"; id: string; reviewType: ReviewType; accessToken?: string | null }
  | { kind: "folder"; id: string; accessToken?: string | null };

const inProcessQueue: InProcessJob[] = [];
const inProcessActiveIds = new Set<string>();
let inProcessRunningCount = 0;
const IN_PROCESS_CONCURRENCY = 4;

function drainInProcessQueue() {
  while (inProcessRunningCount < IN_PROCESS_CONCURRENCY && inProcessQueue.length > 0) {
    const job = inProcessQueue.shift();
    if (!job) break;

    inProcessRunningCount += 1;
    const jobKey = `${job.kind}:${job.id}`;

    (async () => {
      try {
        if (job.kind === "review") {
          logger.info("queue.in_process_review_start", {
            reviewId: job.id,
            reviewType: job.reviewType,
            activeWorkers: inProcessRunningCount,
          });
          await processReviewBackend({
            reviewId: job.id,
            accessToken: job.accessToken ?? undefined,
          });
        } else {
          logger.info("queue.in_process_folder_start", {
            folderAnalysisId: job.id,
            activeWorkers: inProcessRunningCount,
          });
          const sb = job.accessToken ? userClientFromToken(job.accessToken) : adminClient();
          await processFolderAnalysisJob(job.id, sb);
        }
      } catch (err) {
        logger.error("queue.in_process_job_failed", {
          kind: job.kind,
          id: job.id,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        inProcessRunningCount -= 1;
        inProcessActiveIds.delete(jobKey);
        drainInProcessQueue();
      }
    })();
  }
}

export function dispatchInProcessReview(reviewId: string, reviewType: ReviewType, accessToken?: string | null) {
  const jobKey = `review:${reviewId}`;
  if (inProcessActiveIds.has(jobKey)) {
    logger.info("queue.in_process_deduped", { reviewId, reviewType });
    return { queued: true, mode: "in_process_deduped" as const };
  }
  inProcessActiveIds.add(jobKey);
  inProcessQueue.push({ kind: "review", id: reviewId, reviewType, accessToken });
  drainInProcessQueue();
  return { queued: true, mode: "in_process" as const };
}

export function dispatchInProcessFolderAnalysis(folderAnalysisId: string, accessToken?: string | null) {
  const jobKey = `folder:${folderAnalysisId}`;
  if (inProcessActiveIds.has(jobKey)) {
    return { queued: true, mode: "in_process_deduped" as const };
  }
  inProcessActiveIds.add(jobKey);
  inProcessQueue.push({ kind: "folder", id: folderAnalysisId, accessToken });
  drainInProcessQueue();
  return { queued: true, mode: "in_process" as const };
}

// Track whether DB queue is usable in this deployment so we don't spam 42501 logs
let dbQueuePermissionBlocked = false;

/**
 * Enqueues a Standard Review (PR, Codebase, API).
 * Automatically falls back to the bounded in-process worker pool if DB queue
 * privileges or service_role credentials are unavailable.
 */
export async function enqueueReview(
  reviewId: string,
  reviewType: ReviewType,
  accessToken?: string | null,
) {
  if (!hasUsableServiceRoleKey() || dbQueuePermissionBlocked) {
    logger.info("queue.enqueue_review_in_process_mode", {
      reviewId,
      reviewType,
      reason: dbQueuePermissionBlocked ? "db_queue_permission_blocked" : "service_role_key_absent_or_anon",
    });
    return dispatchInProcessReview(reviewId, reviewType, accessToken);
  }

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
    if (isPermissionOrQueueSchemaError(error)) {
      dbQueuePermissionBlocked = true;
      logger.warn("queue.enqueue_review_fallback_in_process", {
        reviewId,
        reviewType,
        code: (error as any).code,
        error: error.message,
      });
      return dispatchInProcessReview(reviewId, reviewType, accessToken);
    }
    logger.error("queue.enqueue_review_failed", { reviewId, reviewType, error: error.message });
    // Even for transient DB errors, dispatch in-process so the user's review still executes
    return dispatchInProcessReview(reviewId, reviewType, accessToken);
  }

  logger.info("queue.enqueued_review", { queueId: data.id, reviewId, reviewType });
  triggerQueueWorker();
  return { ...data, queued: true, mode: "db_queue" as const };
}

/**
 * Enqueues a Folder Structure Analysis with automatic in-process fallback.
 */
export async function enqueueFolderAnalysis(folderAnalysisId: string, accessToken?: string | null) {
  if (!hasUsableServiceRoleKey() || dbQueuePermissionBlocked) {
    logger.info("queue.enqueue_folder_in_process_mode", {
      folderAnalysisId,
      reason: dbQueuePermissionBlocked ? "db_queue_permission_blocked" : "service_role_key_absent_or_anon",
    });
    return dispatchInProcessFolderAnalysis(folderAnalysisId, accessToken);
  }

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
    if (isPermissionOrQueueSchemaError(error)) {
      dbQueuePermissionBlocked = true;
    }
    logger.warn("queue.enqueue_folder_fallback_in_process", {
      folderAnalysisId,
      error: error.message,
    });
    return dispatchInProcessFolderAnalysis(folderAnalysisId, accessToken);
  }

  logger.info("queue.enqueued_folder", { queueId: data.id, folderAnalysisId });
  triggerQueueWorker();
  return { ...data, queued: true, mode: "db_queue" as const };
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
      cachedConcurrency = Math.max(1, Math.min(10, parseInt(data.value, 10) || 4));
    }
  } catch (err) {
    logger.warn("queue.fetch_config_failed", { error: err instanceof Error ? err.message : String(err) });
  }
  lastConfigFetch = now;
  return cachedConcurrency;
}

/**
 * Triggers the background DB queue worker pool. Returns immediately.
 */
export function triggerQueueWorker() {
  if (isWorkerPoolActive || dbQueuePermissionBlocked || !hasUsableServiceRoleKey()) return;
  isWorkerPoolActive = true;

  runWorkerPool()
    .catch(err => {
      logger.error("queue.pool_uncaught_error", { error: err instanceof Error ? err.message : String(err) });
    })
    .finally(() => {
      isWorkerPoolActive = false;
    });
}

// Graceful Draining SIGTERM & SIGINT Handlers
let isShutdownSignalReceived = false;

function setupGracefulShutdown() {
  const handleShutdown = async (signal: string) => {
    if (isShutdownSignalReceived) return;
    isShutdownSignalReceived = true;
    logger.info("queue.shutdown_signal_received", {
      signal,
      activeTasks: activeWorkersCount + inProcessRunningCount,
    });

    cachedConcurrency = 0;
    lastConfigFetch = Date.now() + 3600000;

    let attempts = 0;
    while (activeWorkersCount + inProcessRunningCount > 0 && attempts < 30) {
      logger.info("queue.draining_active_workers", {
        remaining: activeWorkersCount + inProcessRunningCount,
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    logger.info("queue.shutdown_complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

setupGracefulShutdown();

async function runWorkerPool() {
  const sb = adminClient();
  const workerId = `worker-${process.env.HOSTNAME || "node"}-${Math.random().toString(36).slice(2, 6)}`;

  while (true) {
    if (isShutdownSignalReceived || dbQueuePermissionBlocked) {
      break;
    }

    const dynamicLimit = await fetchDynamicConcurrency(sb);

    if (activeWorkersCount >= dynamicLimit) {
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }

    let { data: claim, error: claimErr } = await sb.rpc("claim_next_queue_item_v3", {
      p_worker_id: workerId,
    });

    // Fallback to v1 RPC if v3 isn't deployed
    if (claimErr && String(claimErr.message || "").includes("claim_next_queue_item_v3")) {
      const v1 = await sb.rpc("claim_next_queue_item", { p_worker_id: workerId });
      claim = v1.data;
      claimErr = v1.error;
    }

    if (claimErr) {
      if (isPermissionOrQueueSchemaError(claimErr)) {
        dbQueuePermissionBlocked = true;
        logger.warn("queue.worker_pool_stopped_permission_denied", { error: claimErr.message });
        break;
      }
      logger.error("queue.claim_failed", { error: claimErr.message });
      await new Promise(resolve => setTimeout(resolve, 3000));
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
  const queueId = item.q_id ?? item.id;
  const reviewId = item.q_review_id ?? item.review_id;
  const folderAnalysisId = item.q_folder_analysis_id ?? item.folder_analysis_id;
  const reviewType = (item.q_review_type ?? item.review_type) as ReviewType;
  const attempts = item.q_attempts ?? item.attempts ?? 1;

  logger.info("queue.processing_item", { queueId, reviewId, folderAnalysisId, reviewType, attempts });

  try {
    if (reviewType === "folder_analysis") {
      await processFolderAnalysisJob(folderAnalysisId, sb);
    } else {
      await processReviewBackend({ reviewId });
    }

    await sb.from("review_queue").update({ status: "completed" }).eq("id", queueId);
    logger.info("queue.item_completed", { queueId, reviewId, folderAnalysisId });
  } catch (jobErr) {
    const errMsg = jobErr instanceof Error ? jobErr.message : String(jobErr);
    logger.error("queue.item_failed", { queueId, reviewId, folderAnalysisId, error: errMsg });

    const backoffMinutes = Math.pow(5, Math.max(1, attempts));
    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(nextRetryAt.getMinutes() + backoffMinutes);

    await sb
      .from("review_queue")
      .update({
        status: "failed",
        last_error: errMsg,
        next_retry_at: nextRetryAt.toISOString(),
      })
      .eq("id", queueId);

    if (reviewType === "folder_analysis") {
      await sb
        .from("folder_analyses")
        .update({
          status: "failed",
          error_message: errMsg,
          organization_score: null,
        })
        .eq("id", folderAnalysisId);
    } else {
      await sb
        .from("reviews")
        .update({
          status: "failed",
          error_message: errMsg,
          health_score: null,
        })
        .eq("id", reviewId);
    }
  }
}

/**
 * Handles the background computation for a Folder Structure Analysis
 */
export async function processFolderAnalysisJob(folderAnalysisId: string, sb: any) {
  const { data: analysis, error: aErr } = await sb
    .from("folder_analyses")
    .select("*")
    .eq("id", folderAnalysisId)
    .single();

  if (aErr || !analysis) {
    throw new Error(`Folder analysis record not found: ${aErr?.message}`);
  }

  await sb
    .from("folder_analyses")
    .update({ status: "processing", error_message: null, organization_score: null })
    .eq("id", folderAnalysisId);

  try {
    const { data: profile } = await sb
      .from("profiles")
      .select("plan, review_credits, reviews_used_this_month")
      .eq("id", analysis.user_id)
      .maybeSingle();

    const cost = 2;
    const credits = profile?.review_credits ?? 10;
    if (credits < cost) {
      throw new Error(`Insufficient credits. You need ${cost} credits but have ${credits}.`);
    }

    const structure = buildTreeString(analysis.file_tree || [], 400);
    const plan = profile?.plan ?? "free";

    const requestId = `folder-${folderAnalysisId.slice(0, 8)}`;
    logger.info("queue.folder_ai_started", { folderAnalysisId, fileCount: analysis.file_tree?.length });

    const result = await callFolderAnalysisAI({
      requestId,
      structure,
      repoName: analysis.repo_full_name,
      plan,
    });

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

    await sb.from("folder_migration_actions").delete().eq("analysis_id", folderAnalysisId);

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

    await sb
      .from("profiles")
      .update({
        review_credits: Math.max(0, credits - cost),
        reviews_used_this_month: (profile?.reviews_used_this_month ?? 0) + 1,
      })
      .eq("id", analysis.user_id);

    logger.info("queue.folder_completed", { folderAnalysisId, organizationScore: result.organization_score });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await sb
      .from("folder_analyses")
      .update({
        status: "failed",
        error_message: errMsg,
        organization_score: null,
      })
      .eq("id", folderAnalysisId);
    throw err;
  }
}
