import { createClient } from "@supabase/supabase-js";
import { callCodebaseAuditAI, callApiAnalysisAI, selectApiFiles, callPrReviewAI } from "../ai/orchestrator.js";
import { fetchRepoFiles, fetchRepoTree, selectAuditFiles } from "../github/repository.server.js";
import { createRequestId, logger } from "../logging/logger.server.js";
import { fetchPr, parsePrUrl } from "../github/pull-request.server.js";

const PLAN_LIMITS: Record<string, number> = { free: 10, pro: 150 };

import { getRequiredEnv, getRuntimeEnv } from "../config/env.server.js";

function adminClient() {
  const url = getRequiredEnv("SUPABASE_URL");
  const anonKey = getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  const key = serviceKey || anonKey;
  return createClient(url, key, { auth: { persistSession: false } });
}

function userClientFromToken(token: string) {
  const url = getRequiredEnv("SUPABASE_URL");
  const anonKey = getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(
    url,
    anonKey,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

async function getGithubToken(sb: any, userId: string, userMeta?: any) {
  let token = userMeta?.provider_token ?? null;
  if (!token) {
    const { data: profile } = await sb.from("profiles")
      .select("github_access_token")
      .eq("id", userId)
      .maybeSingle();
    token = profile?.github_access_token ?? null;
  }
  return token;
}

function normalizeFindings(reviewId: string, findings: any[]) {
  return (findings || []).slice(0, 15).map((finding: any) => ({
    review_id: reviewId,
    severity: finding.severity,
    category: finding.category,
    title: finding.title,
    description: finding.description,
    file_path: finding.file_path,
    line_start: finding.line_start ?? null,
    line_end: finding.line_end ?? null,
    bad_code: finding.bad_code ?? "",
    suggested_fix: finding.suggested_fix ?? "",
    confidence: finding.confidence ?? 80,
  }));
}

async function saveResult(params: {
  sb: any;
  reviewId: string;
  result: any;
  meta: any;
  parsed: { owner: string; repo: string; number: number };
  requestId: string;
  reviewType: "pr_review" | "codebase_audit" | "api_analysis" | "folder_analysis";
}) {
  await params.sb.from("findings").delete().eq("review_id", params.reviewId);

  const findings = normalizeFindings(params.reviewId, params.result.findings || []);
  if (findings.length) await params.sb.from("findings").insert(findings);

  const update = {
    status: "complete",
    review_type: params.reviewType,
    health_score: Math.max(0, Math.min(100, params.result.health_score ?? 70)),
    summary: params.result.summary ?? "",
    repo_owner: params.parsed.owner,
    repo_name: params.parsed.repo,
    pr_number: params.parsed.number || null,
    pr_title: params.meta.title,
    pr_author: params.meta.user?.login,
    branch_from: params.meta.head?.ref,
    branch_to: params.meta.base?.ref,
    files_changed: params.meta.changed_files,
    additions: params.meta.additions,
    deletions: params.meta.deletions,
  };

  await params.sb.from("reviews").update(update).eq("id", params.reviewId);

  logger.info("review.saved", {
    requestId: params.requestId,
    reviewId: params.reviewId,
    status: "complete",
    reviewType: params.reviewType,
    healthScore: update.health_score,
    findingCount: findings.length,
    tokenUsage: params.result.usage,
    model: params.result.model,
  });

  return { update, findings };
}

export async function processReviewBackend(params: {
  reviewId: string;
  accessToken?: string | null;
  requestId?: string;
}) {
  const requestId = params.requestId ?? createRequestId("review");

  // When an access token is provided, use the user client so RLS SELECT/UPDATE
  // policies (auth.uid() = user_id) work correctly. The service role key is not
  // required in this path. Fall back to adminClient only for internal/trusted callers.
  let authUser: any = null;
  let userEmail: string | null = null;
  let sb: ReturnType<typeof adminClient>;

  if (params.accessToken) {
    const uc = userClientFromToken(params.accessToken);
    const { data, error } = await uc.auth.getUser();
    if (error || !data.user) throw new Error("Unauthorized");
    authUser = data.user;
    userEmail = data.user.email ?? null;
    sb = uc; // use user client so RLS sees auth.uid() = user_id
  } else {
    sb = adminClient(); // internal / trusted caller path
  }

  const { data: review, error } = await sb.from("reviews").select("*").eq("id", params.reviewId).single();
  if (error || !review) throw new Error("Review not found");
  if (authUser && review.user_id !== authUser.id) throw new Error("Not found");

  logger.info("review.process_started", {
    requestId,
    reviewId: params.reviewId,
    userId: review.user_id,
    email: userEmail,
    prUrl: review.pr_url,
  });

  await sb.from("reviews").update({ status: "processing", error_message: null }).eq("id", params.reviewId);

  const processStart = Date.now();

  try {
    if (review.user_id) {
      // Call Postgres renew function to check for any pending 30-day plan expirations/resets
      await sb.rpc("check_and_renew_profile_limits", { profile_id: review.user_id });
    }

    const { data: profile } = review.user_id
      ? await sb.from("profiles").select("plan, reviews_used_this_month, review_credits, github_access_token, email, is_blocked").eq("id", review.user_id).maybeSingle()
      : { data: null };
    
    if (profile && (profile as any).is_blocked) {
      throw new Error("Your account has been suspended. Please contact akshayrajput2616@gmail.com or 9653814628 for assistance.");
    }

    const plan = profile?.plan ?? "free";
    userEmail = userEmail ?? (profile as any)?.email ?? null;

    const token = authUser
      ? await getGithubToken(sb, authUser.id, authUser.user_metadata)
      : profile?.github_access_token ?? null;

    // Determine isWorkspace first (used below for credit cost calculation)
    const isWorkspace = review.pr_url.includes("/workspace") || !review.pr_url.includes("/pull/");

    // Credit-based balance verification — compute cost AFTER isWorkspace is known
    const creditsLeft = (profile as any)?.review_credits ?? 10;

    const getReviewCost = (type: string): number => {
      if (type === "api" || type === "api_analysis") return 3;
      if (type === "codebase" || type === "codebase_audit") return 3;
      if (type === "folder" || type === "folder_analysis") return 2;
      return 1;
    };

    // Determine the review type to compute credit cost
    let computedType = "pr";
    if (isWorkspace) {
      const urlObj = new URL(review.pr_url);
      computedType = urlObj.searchParams.get("type") === "api" ? "api" : "codebase";
    } else {
      const urlObj = new URL(review.pr_url);
      const urlType = urlObj.searchParams.get("type");
      if (review.review_type === "api_analysis" || urlType === "api") {
        computedType = "api";
      } else if (review.review_type === "codebase_audit" || urlType === "codebase") {
        computedType = "codebase";
      } else if (review.review_type === "folder_analysis" || urlType === "folder") {
        computedType = "folder";
      } else {
        computedType = "pr";
      }
    }

    const cost = getReviewCost(computedType);

    if (creditsLeft < cost) {
      throw new Error(`Insufficient credits. You need ${cost} credits for this review type but you have ${creditsLeft}. Upgrade your plan or wait for your monthly renewal.`);
    }
    let result: any;
    let meta: any;
    let parsed: { owner: string; repo: string; number: number };

    if (isWorkspace) {
      const urlObj = new URL(review.pr_url);
      const owner = review.repo_owner || urlObj.pathname.split("/")[1];
      const repo = review.repo_name || urlObj.pathname.split("/")[2];
      const requestedFiles = urlObj.searchParams.get("files")?.split(",").filter(Boolean);
      const reviewType = urlObj.searchParams.get("type"); // "api" | null (default = codebase)

      const t0 = Date.now();
      const treeData = await fetchRepoTree(owner, repo, token);
      logger.info("review.github_tree_fetched", { requestId, reviewId: params.reviewId, fileCount: treeData.tree?.length, durationMs: Date.now() - t0 });

      const t1 = Date.now();
      let files: string[];
      if (reviewType === "api") {
        files = selectApiFiles(treeData.tree?.map((n: any) => n.path) ?? [], requestedFiles);
      } else {
        files = selectAuditFiles(treeData.tree || [], requestedFiles);
      }
      const filesContent = await fetchRepoFiles({ owner, repo, files, token });
      logger.info("review.github_files_fetched", { requestId, reviewId: params.reviewId, fileCount: Object.keys(filesContent).length, durationMs: Date.now() - t1 });

      const t2 = Date.now();
      if (reviewType === "api") {
        result = await callApiAnalysisAI({
          requestId,
          reviewId: params.reviewId,
          repoFullName: `${owner}/${repo}`,
          filesContent,
          plan,
        });
        logger.info("review.ai_api_done", { requestId, reviewId: params.reviewId, durationMs: Date.now() - t2 });
        meta = {
          title: `API & Backend Audit: ${owner}/${repo}`,
          user: { login: owner },
          changed_files: Object.keys(filesContent).length,
          additions: 0,
          deletions: 0,
        };
      } else {
        result = await callCodebaseAuditAI({
          requestId,
          reviewId: params.reviewId,
          repoFullName: `${owner}/${repo}`,
          filesContent,
          plan,
        });
        logger.info("review.ai_codebase_done", { requestId, reviewId: params.reviewId, durationMs: Date.now() - t2 });
        meta = {
          title: `Codebase Audit: ${owner}/${repo}`,
          user: { login: owner },
          changed_files: Object.keys(filesContent).length,
          additions: 0,
          deletions: 0,
        };
      }
      parsed = { owner, repo, number: 0 };
    } else {
      const pr = parsePrUrl(review.pr_url);
      if (!pr) throw new Error("Invalid GitHub PR URL");

      const t0 = Date.now();
      const prData = await fetchPr(pr.owner, pr.repo, pr.number, token);
      meta = prData.meta;
      parsed = pr;
      logger.info("review.github_pr_fetched", { requestId, reviewId: params.reviewId, durationMs: Date.now() - t0 });

      // Determine the dynamic reviewType
      let reviewType: "pr" | "codebase" | "api" | "folder" = "pr";
      const urlObj = new URL(review.pr_url);
      const urlType = urlObj.searchParams.get("type");
      if (review.review_type === "api_analysis" || urlType === "api") {
        reviewType = "api";
      } else if (review.review_type === "codebase_audit" || urlType === "codebase") {
        reviewType = "codebase";
      } else if (review.review_type === "folder_analysis" || urlType === "folder") {
        reviewType = "folder";
      }

      const t1 = Date.now();
      result = await callPrReviewAI({
        requestId,
        reviewId: params.reviewId,
        prMeta: `PR: ${meta.title}\nAuthor: ${meta.user?.login}\nFiles: ${meta.changed_files}, +${meta.additions}/-${meta.deletions}`,
        diff: prData.diff,
        plan,
        owner: pr.owner,
        repo: pr.repo,
        headSha: meta.head?.sha || meta.head?.ref || "main",
        token,
        reviewType,
      });
      logger.info("review.ai_pr_done", { requestId, reviewId: params.reviewId, durationMs: Date.now() - t1, reviewType });
    }

    let reviewTypeParam: "pr_review" | "codebase_audit" | "api_analysis" | "folder_analysis" = "pr_review";
    if (isWorkspace) {
      const urlObj = new URL(review.pr_url);
      const reviewType = urlObj.searchParams.get("type");
      reviewTypeParam = reviewType === "api" ? "api_analysis" : "codebase_audit";
    } else {
      const urlObj = new URL(review.pr_url);
      const urlType = urlObj.searchParams.get("type");
      if (review.review_type === "api_analysis" || urlType === "api") {
        reviewTypeParam = "api_analysis";
      } else if (review.review_type === "codebase_audit" || urlType === "codebase") {
        reviewTypeParam = "codebase_audit";
      } else if (review.review_type === "folder_analysis" || urlType === "folder") {
        reviewTypeParam = "folder_analysis";
      }
    }

    const { update, findings } = await saveResult({
      sb,
      reviewId: params.reviewId,
      result,
      meta,
      parsed,
      requestId,
      reviewType: reviewTypeParam
    });

    if (review.user_id) {
      await sb.from("profiles")
        .update({ 
          review_credits: Math.max(0, ((profile as any)?.review_credits ?? 10) - cost),
          reviews_used_this_month: (profile?.reviews_used_this_month ?? 0) + 1 
        })
        .eq("id", review.user_id);
    }

    try {
      const appUrl = getRuntimeEnv("APP_URL") || "http://localhost:5173";
      const { sendReviewCompleteEmail } = await import("../email/review-report.server.js");
      await sendReviewCompleteEmail({
        requestId,
        reviewId: params.reviewId,
        to: userEmail,
        review: update,
        findings,
        appUrl,
      });
    } catch (emailError) {
      logger.error("email.review_complete_failed", {
        requestId,
        reviewId: params.reviewId,
        email: userEmail,
        error: emailError,
      });
    }

    logger.info("review.process_completed", {
      requestId,
      reviewId: params.reviewId,
      userId: review.user_id,
      email: userEmail,
      model: result.model,
      tokenUsage: result.usage,
      findingCount: findings.length,
      totalDurationMs: Date.now() - processStart,
    });

    return {
      ok: true,
      reviewId: params.reviewId,
      requestId,
      findings: findings.length,
      healthScore: update.health_score,
      tokenUsage: result.usage,
      model: result.model,
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    // Sanitize AI-provider details before storing/surfacing to the user
    const userMessage = sanitizeAiError(rawMessage);
    await sb.from("reviews").update({ status: "failed", error_message: userMessage }).eq("id", params.reviewId);
    logger.error("review.process_failed", {
      requestId,
      reviewId: params.reviewId,
      userId: review.user_id,
      email: userEmail,
      rawError: rawMessage,
      totalDurationMs: Date.now() - processStart,
      fixHint: "Check AI/SMTP/GitHub/Supabase credentials, rate limits, and the review URL.",
    });
    throw new Error(userMessage);
  }
}

function sanitizeAiError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("503") || m.includes("unavailable") || m.includes("high demand") || m.includes("overloaded")) {
    return "DevPulse AI is experiencing high demand. Please try again in a moment.";
  }
  if (m.includes("429") || m.includes("rate limit") || m.includes("quota")) {
    return "DevPulse AI rate limit reached. Please try again in a moment.";
  }
  if (m.includes("401") || m.includes("api key") || m.includes("invalid key")) {
    return "DevPulse AI configuration error. Please contact support.";
  }
  if (m.includes("gemini") || m.includes("api error")) {
    return "DevPulse AI encountered an error. Please try again.";
  }
  return msg;
}
