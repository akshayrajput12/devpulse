import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, getRuntimeEnv } from "../backend/config/env.server.js";
import { logger } from "../backend/logging/logger.server.js";
import { type FolderAnalysisResult } from "../backend/ai/orchestrator.js";

const PLAN_LIMITS: Record<string, number> = { free: 10, pro: 150 };

function adminClient() {
  const key = getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY") || getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(getRequiredEnv("SUPABASE_URL"), key, { auth: { persistSession: false } });
}

function userClient(token: string) {
  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_PUBLISHABLE_KEY"),
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

export async function analyzeFolderStructure(data: {
  access_token: string;
  repo_full_name: string;
  file_tree: Array<{ path: string; type: string }>;
}) {
  const uc = userClient(data.access_token);
  const { data: u } = await uc.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  // 1. Verify credits first (Folder analysis costs 2 credits)
  const cost = 2;
  const { data: profile, error: pErr } = await uc
    .from("profiles")
    .select("review_credits")
    .eq("id", u.user.id)
    .maybeSingle();

  if (pErr) throw new Error(`Failed to load profile credits: ${pErr.message}`);
  const credits = profile?.review_credits ?? 10;
  if (credits < cost) {
    throw new Error(`Insufficient credits. You need ${cost} credits but have ${credits}.`);
  }

  // 2. Parse repo_owner and repo_name
  const parts = data.repo_full_name.split("/");
  const repo_owner = parts[0] ?? "";
  const repo_name = parts[1] ?? "";

  // 3. Create a pending folder analysis record
  const { data: analysis, error: aErr } = await uc
    .from("folder_analyses")
    .insert({
      user_id: u.user.id,
      repo_owner,
      repo_name,
      repo_full_name: data.repo_full_name,
      status: "pending",
      file_tree: data.file_tree,
    })
    .select()
    .single();

  if (aErr || !analysis) {
    throw new Error(`Failed to initialize folder structure audit: ${aErr?.message ?? "unknown error"}`);
  }

  const hasServiceKey = !!getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!hasServiceKey) {
    console.log("[analyzeFolderStructure] SUPABASE_SERVICE_ROLE_KEY is absent. Processing folder analysis immediately...");
    const { processFolderAnalysisJob } = await import("../backend/reviews/queue.server.js");
    await processFolderAnalysisJob(analysis.id, uc);
    return { id: analysis.id, queued: false };
  }

  // 4. Enqueue into the background reviews queue
  const { enqueueFolderAnalysis } = await import("../backend/reviews/queue.server.js");
  await enqueueFolderAnalysis(analysis.id);

  logger.info("folder_analysis.enqueued", {
    analysisId: analysis.id,
    userId: u.user.id,
    repoFullName: data.repo_full_name,
  });

  return { id: analysis.id };
}

export async function saveFolderAnalysis(data: {
  access_token: string;
  repo_owner: string;
  repo_name: string;
  repo_full_name: string;
  result: FolderAnalysisResult;
  file_tree: Array<{ path: string; type: string }>;
}) {
  const uc = userClient(data.access_token);
  const { data: u } = await uc.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const { data: analysis, error: aErr } = await uc
    .from("folder_analyses")
    .insert({
      user_id: u.user.id,
      repo_owner: data.repo_owner,
      repo_name: data.repo_name,
      repo_full_name: data.repo_full_name,
      status: "complete",
      organization_score: data.result.organization_score,
      grade: data.result.grade,
      stack_detected: data.result.stack_detected,
      strengths: data.result.current_analysis.strengths,
      weaknesses: data.result.current_analysis.weaknesses,
      critical_issues: data.result.current_analysis.critical_issues,
      ideal_description: data.result.ideal_structure.description,
      ideal_tree: data.result.ideal_structure.tree,
      ideal_key_decisions: data.result.ideal_structure.key_decisions ?? [],
      folder_annotations: data.result.folder_annotations ?? {},
      file_tree: data.file_tree,
    })
    .select()
    .single();

  if (aErr || !analysis) throw new Error(aErr?.message ?? "Failed to save analysis");

  if (data.result.migration_actions?.length) {
    const actions = data.result.migration_actions.map((a: any, i: number) => ({
      analysis_id: analysis.id,
      priority: a.priority,
      action: a.action,
      from_path: a.from ?? "",
      to_path: a.to ?? "",
      reason: a.reason ?? "",
      sort_order: i,
    }));

    const { error: actErr } = await uc.from("folder_migration_actions").insert(actions);
    if (actErr) console.error("Failed to save migration actions:", actErr.message);
  }

  return { id: analysis.id as string, share_token: analysis.share_token as string };
}

export async function getFolderAnalysis(data: { id: string; access_token?: string }) {
  const sb = data.access_token ? userClient(data.access_token) : adminClient();

  const { data: analysis, error } = await sb
    .from("folder_analyses")
    .select("*")
    .eq("id", data.id)
    .single();

  if (error || !analysis) throw new Error("Analysis not found");

  const { data: actions } = await sb
    .from("folder_migration_actions")
    .select("*")
    .eq("analysis_id", data.id)
    .order("sort_order");

  return { analysis, actions: actions ?? [] };
}

export async function getFolderAnalysisByToken(data: { token: string }) {
  const sb = adminClient();

  const { data: analysis, error } = await sb
    .from("folder_analyses")
    .select("*")
    .eq("share_token", data.token)
    .single();

  if (error || !analysis) throw new Error("Analysis not found");

  const { data: actions } = await sb
    .from("folder_migration_actions")
    .select("*")
    .eq("analysis_id", analysis.id)
    .order("sort_order");

  return { analysis, actions: actions ?? [] };
}

export async function listFolderAnalyses(data: { access_token: string; limit?: number }) {
  const uc = userClient(data.access_token);
  const { data: u } = await uc.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const { data: analyses, error } = await uc
    .from("folder_analyses")
    .select("id, repo_full_name, organization_score, grade, status, created_at, share_token")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(data.limit ?? 20);

  if (error) throw new Error(error.message);
  return analyses ?? [];
}

export async function deleteFolderAnalysis(data: { id: string; access_token: string }) {
  const uc = userClient(data.access_token);
  const { data: u } = await uc.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const { error } = await uc
    .from("folder_analyses")
    .delete()
    .eq("id", data.id)
    .eq("user_id", u.user.id);

  if (error) throw new Error(error.message);
  return { ok: true };
}
