import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, getRuntimeEnv } from "../backend/config/env.server.js";
import { processReviewBackend } from "../backend/reviews/review-processor.server.js";
import { fetchRepoTree } from "../backend/github/repository.server.js";
import crypto from "crypto";

const PLAN_LIMITS: Record<string, number> = { free: 10, pro: 150 };

function userClientFromToken(token: string) {
  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_PUBLISHABLE_KEY"),
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

async function getGithubToken(userClient: ReturnType<typeof userClientFromToken>, userId: string, userMeta: any): Promise<string | null> {
  let token = userMeta?.provider_token ?? null;
  if (!token) {
    const { data: p } = await userClient.from("profiles")
      .select("github_access_token").eq("id", userId).maybeSingle();
    token = p?.github_access_token ?? null;
  }
  return token;
}

export async function enqueueAndRun(reviewId: string, token?: string | null) {
  try {
    const { enqueueReview, triggerQueueWorker } = await import("../backend/reviews/queue.server.js");
    await enqueueReview(reviewId, "pr_review");
    triggerQueueWorker();
    return { ok: true };
  } catch (e) {
    console.error("[enqueueAndRun] Failed to queue webhook review:", e);
    throw e;
  }
}

export async function processReview(data: { review_id: string; access_token: string }) {
  const uc = userClientFromToken(data.access_token);
  const { data: review, error: rErr } = await uc
    .from("reviews")
    .select("pr_url, review_type")
    .eq("id", data.review_id)
    .single();

  if (rErr || !review) {
    throw new Error("Review not found or unauthorized");
  }

  const isWorkspace = review.pr_url.includes("/workspace") || !review.pr_url.includes("/pull/");
  let reviewType: "pr_review" | "codebase_audit" | "api_analysis" | "folder_analysis" = "pr_review";
  
  if (isWorkspace) {
    const urlObj = new URL(review.pr_url);
    reviewType = urlObj.searchParams.get("type") === "api" ? "api_analysis" : "codebase_audit";
  } else {
    const urlObj = new URL(review.pr_url);
    const urlType = urlObj.searchParams.get("type");
    if (review.review_type === "api_analysis" || urlType === "api") {
      reviewType = "api_analysis";
    } else if (review.review_type === "codebase_audit" || urlType === "codebase") {
      reviewType = "codebase_audit";
    } else if (review.review_type === "folder_analysis" || urlType === "folder") {
      reviewType = "folder_analysis";
    }
  }

  const hasServiceKey = !!getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!hasServiceKey) {
    console.log("[processReview] SUPABASE_SERVICE_ROLE_KEY is absent. Processing review immediately using user client...");
    await processReviewBackend({
      reviewId: data.review_id,
      accessToken: data.access_token,
    });
    return { ok: true, queued: false };
  }

  const { enqueueReview, triggerQueueWorker } = await import("../backend/reviews/queue.server.js");
  await enqueueReview(data.review_id, reviewType);

  // Run the worker asynchronously
  (async () => {
    try {
      const { triggerQueueWorker: trigger } = await import("../backend/reviews/queue.server.js");
      trigger();
    } catch (e) {
      console.error("[processReview] worker trigger error:", e);
    }
  })();

  return { ok: true, queued: true };
}

export async function createReview(data: { pr_url: string; access_token: string; user_id: string }) {
  const userClient = userClientFromToken(data.access_token);
  const { data: userData, error: uErr } = await userClient.auth.getUser(data.access_token);
  if (uErr || !userData.user || userData.user.id !== data.user_id) {
    throw new Error("Unauthorized");
  }

  const sb = userClient;

  const { data: profile } = await sb.from("profiles")
    .select("plan, reviews_used_this_month").eq("id", data.user_id).maybeSingle();
  const plan = profile?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? 10;
  if ((profile?.reviews_used_this_month ?? 0) >= limit) {
    throw new Error(`Monthly limit reached (${limit}). Upgrade your plan.`);
  }

  const ghToken = (userData.user.user_metadata as any)?.provider_token ?? null;
  if (ghToken) {
    await sb.from("profiles").update({ github_access_token: ghToken })
      .eq("id", data.user_id);
  }

  const shareToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const { data: review, error } = await sb.from("reviews").insert({
    user_id: data.user_id,
    pr_url: data.pr_url,
    status: "pending",
    share_token: shareToken,
  }).select().single();
  if (error || !review) throw new Error(error?.message ?? "insert failed");

  return { id: review.id };
}

export async function retryReview(data: { review_id: string; access_token: string }) {
  const userClient = userClientFromToken(data.access_token);
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const { data: r } = await userClient.from("reviews").select("user_id")
    .eq("id", data.review_id).maybeSingle();
  if (!r || r.user_id !== u.user.id) throw new Error("Not found");

  await userClient.from("findings").delete().eq("review_id", data.review_id);
  await userClient.from("reviews")
    .update({ status: "pending", error_message: null, health_score: null, summary: null })
    .eq("id", data.review_id);
  return { ok: true };
}

export async function getUserRepos(data: { access_token: string }) {
  const userClient = userClientFromToken(data.access_token);
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const token = await getGithubToken(userClient, u.user.id, u.user.user_metadata);
  if (!token) throw new Error("GitHub token not found. Please log in with GitHub again.");

  const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "devpulse",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch repos: ${res.statusText}`);
  const repos: any = await res.json();
  return repos.map((r: any) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    owner: r.owner.login,
    private: r.private,
    description: r.description,
    html_url: r.html_url,
  }));
}

export async function getRepoPullRequests(data: { access_token: string; owner: string; repo: string }) {
  const userClient = userClientFromToken(data.access_token);
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const token = await getGithubToken(userClient, u.user.id, u.user.user_metadata);
  if (!token) throw new Error("GitHub token not found. Please log in with GitHub again.");

  const res = await fetch(`https://api.github.com/repos/${data.owner}/${data.repo}/pulls?state=open&per_page=50`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "devpulse",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch PRs: ${res.statusText}`);
  const pulls: any = await res.json();
  return pulls.map((p: any) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    state: p.state,
    html_url: p.html_url,
    user: p.user.login,
    created_at: p.created_at,
  }));
}

export async function getRepoGitTree(data: { owner: string; repo: string; access_token: string }) {
  const userClient = userClientFromToken(data.access_token);
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const token = await getGithubToken(userClient, u.user.id, u.user.user_metadata);

  return fetchRepoTree(data.owner, data.repo, token);
}

export async function applyFindingFix(data: { review_id: string; finding_id: string; access_token: string }) {
  const userClient = userClientFromToken(data.access_token);
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const { data: review } = await userClient.from("reviews").select("*").eq("id", data.review_id).single();
  if (!review || review.user_id !== u.user.id) throw new Error("Not found");

  const { data: finding } = await userClient.from("findings").select("*").eq("id", data.finding_id).single();
  if (!finding || finding.review_id !== data.review_id) throw new Error("Finding not found");

  if (!review.branch_from || !review.repo_owner || !review.repo_name) {
    throw new Error("Cannot apply fix: review is missing branch or repository information.");
  }
  if (!finding.file_path) throw new Error("Cannot apply fix: finding has no file path.");
  if (!finding.suggested_fix) throw new Error("Cannot apply fix: finding has no suggested fix.");

  const token = await getGithubToken(userClient, u.user.id, u.user.user_metadata);
  if (!token) throw new Error("GitHub token not found. Please log in with GitHub again.");

  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "devpulse",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  const fileRes = await fetch(
    `https://api.github.com/repos/${review.repo_owner}/${review.repo_name}/contents/${finding.file_path}?ref=${review.branch_from}`,
    { headers: { ...ghHeaders, Accept: "application/vnd.github+json" } }
  );
  if (!fileRes.ok) throw new Error(`Failed to fetch file '${finding.file_path}': ${fileRes.statusText}`);
  const fileData: any = await fileRes.json();

  const base64 = (fileData.content as string).replace(/\n/g, "");
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  const currentContent = new TextDecoder("utf-8").decode(bytes);

  let newContent = currentContent;
  const badCode = finding.bad_code as string | null;
  const suggestedFix = finding.suggested_fix as string;

  if (badCode && currentContent.includes(badCode)) {
    newContent = currentContent.replace(badCode, suggestedFix);
  } else if (finding.line_start) {
    const lines = currentContent.split("\n");
    const start = (finding.line_start as number) - 1;
    const end = (finding.line_end as number) || finding.line_start;
    lines.splice(start, end - start, ...suggestedFix.split("\n"));
    newContent = lines.join("\n");
  } else {
    throw new Error("Could not locate the offending code in the file. The code may have already been changed.");
  }

  const newBytes = new TextEncoder().encode(newContent);
  const newBase64 = Buffer.from(newBytes).toString("base64");

  const commitRes = await fetch(
    `https://api.github.com/repos/${review.repo_owner}/${review.repo_name}/contents/${finding.file_path}`,
    {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: `fix: Apply DevPulse suggestion — ${finding.title}`,
        content: newBase64,
        sha: fileData.sha,
        branch: review.branch_from,
      }),
    }
  );
  if (!commitRes.ok) {
    const err = await commitRes.text();
    throw new Error(`Failed to commit fix: ${err.slice(0, 300)}`);
  }
  const commitData: any = await commitRes.json();

  return {
    commit_url: commitData.commit?.html_url as string,
    commit_sha: commitData.commit?.sha as string,
  };
}

function buildDevPulseBody(findings: any[], review: any, reviewId: string): string {
  const sevEmoji: Record<string, string> = { crit: "🔴", high: "🟠", med: "🟡", low: "🔵", ok: "✅" };
  const catEmoji: Record<string, string> = { security: "🔒", performance: "⚡", architecture: "🏗️", reliability: "🛡️", testability: "🧪", readability: "📖" };

  const list = (findings || [])
    .filter(f => f.severity !== "ok")
    .map((f: any) => {
      const loc = f.line_start ? (f.line_end && f.line_end !== f.line_start ? `Lines ${f.line_start}–${f.line_end}` : `Line ${f.line_start}`) : "";
      return [
        `### ${sevEmoji[f.severity] || "⚪"} \`${(f.severity || "").toUpperCase()}\` — ${f.title}`,
        `> ${catEmoji[f.category] || ""} **${f.category}** | \`${f.file_path || "unknown"}\`${loc ? ` · ${loc}` : ""} | Confidence: ${f.confidence ?? 80}%`,
        "",
        f.description || "",
        f.bad_code ? `\n**What we have:**\n\`\`\`\n${f.bad_code}\n\`\`\`` : "",
        f.suggested_fix ? `\n**What it should be:**\n\`\`\`suggestion\n${f.suggested_fix}\n\`\`\`` : "",
      ].filter(Boolean).join("\n");
    })
    .join("\n\n---\n\n");

  return [
    `## DevPulse AI Code Review`,
    `> **Health Score: ${review.health_score ?? "N/A"}/100** · ${(findings || []).filter(f => f.severity !== "ok").length} issues found · [View full interactive report](https://devpulse.app/reviews/${reviewId})`,
    "",
    review.summary ? `<details><summary>📋 Full AI Summary</summary>\n\n${review.summary}\n\n</details>\n` : "",
    `## Findings`,
    list || "*No issues detected — this PR is clean!* ✅",
    "",
    "---",
    "*Generated by [DevPulse](https://devpulse.app) · Inline suggestions render as one-click Apply buttons in the GitHub UI.*",
  ].join("\n");
}

function buildHumanBody(findings: any[], review: any, reviewerName: string, reviewerLogin: string): string {
  const firstName = (reviewerName || reviewerLogin || "Dev").split(" ")[0];

  const critCount = (findings || []).filter(f => f.severity === "crit").length;
  const totalIssues = (findings || []).filter(f => f.severity !== "ok").length;

  const list = (findings || [])
    .filter(f => f.severity !== "ok")
    .map((f: any) => {
      const loc = f.file_path ? `\`${f.file_path}${f.line_start ? `:${f.line_start}` : ""}\`` : "";
      const tone = {
        crit: ["this one's a blocker imo —", "heads up this is serious —", "needs fixing before merge —"],
        high: ["noticed this —", "saw this and think it's worth fixing —", "this one stood out —"],
        med: ["small thing but —", "not urgent but —", "might be worth addressing —"],
        low: ["just a nitpick but —", "optional but —", "take it or leave it —"],
      }[f.severity as string] || ["—"];
      const opener = tone[Math.floor(Math.random() * tone.length)];

      return [
        `**${f.title}** ${loc ? `(${loc})` : ""}`,
        `${opener} ${(f.description || "").split(".")[0]}.`,
        f.suggested_fix ? `\`\`\`suggestion\n${f.suggested_fix}\n\`\`\`` : "",
      ].filter(Boolean).join("\n\n");
    })
    .join("\n\n---\n\n");

  const opener = totalIssues === 0
    ? `hey @${review.pr_author || "there"} looks good to me overall 👍`
    : critCount > 0
    ? `hey @${review.pr_author || "there"}, had a look — there's ${critCount} thing${critCount > 1 ? "s" : ""} that need addressing before this can merge`
    : `hey @${review.pr_author || "there"} — reviewed this, caught ${totalIssues} thing${totalIssues !== 1 ? "s" : ""} worth looking at`;

  return [
    opener,
    "",
    list || "*nothing major, ship it 🚀*",
    "",
    "---",
    `lmk if any of this doesnt make sense or you disagree with something\n\n— ${firstName}`,
  ].join("\n");
}

export async function postReviewStyled(data: { review_id: string; access_token: string; style: "devpulse" | "human"; reviewer_name: string; reviewer_login: string }) {
  const userClient = userClientFromToken(data.access_token);
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const { data: review } = await userClient.from("reviews").select("*").eq("id", data.review_id).single();
  if (!review || review.user_id !== u.user.id) throw new Error("Not found");
  if (!review.pr_number || !review.repo_owner || !review.repo_name) {
    throw new Error("This review is not linked to a GitHub PR.");
  }

  const { data: findings } = await userClient.from("findings").select("*").eq("review_id", data.review_id).order("severity");

  const token = await getGithubToken(userClient, u.user.id, u.user.user_metadata);
  if (!token) throw new Error("GitHub token not found. Please re-authenticate with GitHub.");

  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "devpulse",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  const prRes = await fetch(
    `https://api.github.com/repos/${review.repo_owner}/${review.repo_name}/pulls/${review.pr_number}`,
    { headers: ghHeaders },
  );
  if (!prRes.ok) throw new Error(`GitHub PR fetch failed: ${prRes.statusText}`);
  const prData: any = await prRes.json();
  const commitId = prData.head.sha;

  const body = data.style === "human"
    ? buildHumanBody(findings || [], review, data.reviewer_name, data.reviewer_login)
    : buildDevPulseBody(findings || [], review, data.review_id);

  const reviewRes = await fetch(
    `https://api.github.com/repos/${review.repo_owner}/${review.repo_name}/pulls/${review.pr_number}/reviews`,
    {
      method: "POST",
      headers: ghHeaders,
      body: JSON.stringify({ commit_id: commitId, body, event: "COMMENT" }),
    },
  );
  if (!reviewRes.ok) {
    const err = await reviewRes.text();
    throw new Error(`GitHub review post failed: ${err.slice(0, 300)}`);
  }
  const reviewResult: any = await reviewRes.json();

  let inlinePosted = 0;
  for (const f of (findings || [])) {
    if (!f.file_path || !f.line_start || !f.suggested_fix || f.severity === "ok") continue;

    const inlineBody = data.style === "human"
      ? `**${f.title}**\n\n${(f.description || "").split(".")[0]}.\n\n\`\`\`suggestion\n${f.suggested_fix}\n\`\`\``
      : `**[DevPulse] ${f.title}**\n\n${f.description || ""}\n\n\`\`\`suggestion\n${f.suggested_fix}\n\`\`\``;

    try {
      const r = await fetch(
        `https://api.github.com/repos/${review.repo_owner}/${review.repo_name}/pulls/${review.pr_number}/comments`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ commit_id: commitId, path: f.file_path, line: f.line_start, side: "RIGHT", body: inlineBody }),
        },
      );
      if (r.ok) inlinePosted++;
    } catch {
      // skip
    }
  }

  return {
    review_url: reviewResult.html_url as string,
    inline_posted: inlinePosted,
    total_findings: (findings || []).filter((f: any) => f.severity !== "ok").length,
    style: data.style,
  };
}

export async function emailReviewReport(data: { review_id: string; email: string; access_token: string }) {
  const userClient = userClientFromToken(data.access_token);
  const { data: u } = await userClient.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  const { data: review } = await userClient.from("reviews").select("*").eq("id", data.review_id).single();
  if (!review || review.user_id !== u.user.id) throw new Error("Review not found");

  const { data: findings } = await userClient.from("findings").select("*").eq("review_id", data.review_id).order("severity");

  const appUrl = getRuntimeEnv("APP_URL") || "http://localhost:5173";
  const { sendReviewCompleteEmail } = await import("../backend/email/review-report.server.js");
  
  await sendReviewCompleteEmail({
    requestId: `manual-email-${crypto.randomUUID().slice(0, 8)}`,
    reviewId: data.review_id,
    to: data.email,
    review,
    findings: findings || [],
    appUrl,
  });

  return { ok: true };
}

export async function getUserProfileData(data: { access_token: string }) {
  const uc = userClientFromToken(data.access_token);
  const { data: u } = await uc.auth.getUser();
  if (!u.user) throw new Error("Unauthorized");

  await uc.rpc("check_and_renew_profile_limits", { profile_id: u.user.id });

  const { data: profile, error } = await uc
    .from("profiles")
    .select("id, email, plan, review_credits, last_reset_at, subscription_expires_at, is_admin, display_name, avatar_url")
    .eq("id", u.user.id)
    .single();

  if (error || !profile) {
    throw new Error(error?.message || "Failed to load profile");
  }

  return profile;
}
