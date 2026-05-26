import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, getRuntimeEnv } from "../backend/config/env.server.js";

function adminClient() {
  const url = getRequiredEnv("SUPABASE_URL");
  const key = getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY") || getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function userClient(token: string) {
  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_PUBLISHABLE_KEY"),
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

async function verifyAdmin(token: string): Promise<boolean> {
  try {
    const uc = userClient(token);
    const { data: userData, error } = await uc.auth.getUser(token);
    if (error || !userData.user) return false;

    const { data: profile, error: pErr } = await uc
      .from("profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (pErr || !profile) return false;
    return !!profile.is_admin;
  } catch {
    return false;
  }
}

export async function checkAdminStatus(data: { access_token: string }) {
  const isAdmin = await verifyAdmin(data.access_token);
  return { isAdmin };
}

export async function getAdminMetrics(data: { access_token: string }) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);

  const { count: usersCount } = await sb.from("profiles").select("*", { count: "exact", head: true });
  const { count: reviewsCount } = await sb.from("reviews").select("*", { count: "exact", head: true });
  const { count: failedCount } = await sb.from("reviews").select("*", { count: "exact", head: true }).eq("status", "failed");
  const { count: pendingQueueCount } = await sb.from("review_queue").select("*", { count: "exact", head: true }).eq("status", "pending");

  const { data: avgData } = await sb.from("reviews").select("health_score").not("health_score", "is", null);
  const avgScore = avgData && avgData.length 
    ? Math.round(avgData.reduce((acc, curr) => acc + (curr.health_score ?? 0), 0) / avgData.length)
    : 82;

  const { data: recentReviews } = await sb
    .from("reviews")
    .select("id, pr_title, pr_url, status, created_at, health_score, repo_owner, repo_name")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    metrics: {
      usersCount: usersCount ?? 0,
      reviewsCount: reviewsCount ?? 0,
      failedCount: failedCount ?? 0,
      pendingQueueCount: pendingQueueCount ?? 0,
      avgScore,
    },
    recentReviews: recentReviews ?? [],
  };
}

export async function getAdminUsers(data: { access_token: string; search?: string }) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);
  let query = sb
    .from("profiles")
    .select("id, email, display_name, plan, review_credits, reviews_used_this_month, is_admin, created_at");

  if (data.search) {
    query = query.or(`email.ilike.%${data.search}%,display_name.ilike.%${data.search}%`);
  }

  const { data: users, error } = await query.order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);

  return users ?? [];
}

export async function updateAdminUserCredits(data: { access_token: string; user_id: string; credits: number }) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);
  const { error } = await sb
    .from("profiles")
    .update({ review_credits: data.credits, updated_at: new Date().toISOString() })
    .eq("id", data.user_id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateAdminUserPlan(data: { access_token: string; user_id: string; plan: "free" | "pro" }) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);
  
  let defaultCredits = 10;
  if (data.plan === "pro") defaultCredits = 150;

  const { error } = await sb
    .from("profiles")
    .update({
      plan: data.plan,
      review_credits: defaultCredits,
      subscription_expires_at: data.plan === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_reset_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", data.user_id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function toggleAdminRole(data: { access_token: string; user_id: string; is_admin: boolean }) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);
  const { error } = await sb
    .from("profiles")
    .update({ is_admin: data.is_admin, updated_at: new Date().toISOString() })
    .eq("id", data.user_id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteAdminUserAccount(data: { access_token: string; user_id: string }) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);
  
  const { error } = await sb.auth.admin.deleteUser(data.user_id);
  if (error) {
    const { error: pErr } = await sb.from("profiles").delete().eq("id", data.user_id);
    if (pErr) throw new Error(pErr.message);
  }

  return { ok: true };
}

export async function getAdminBlogPosts(data: { access_token: string }) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);
  const { data: posts, error } = await sb
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return posts ?? [];
}

export async function saveAdminBlogPost(data: {
  access_token: string;
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url?: string;
  published: boolean;
}) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);
  const payload = {
    slug: data.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
    title: data.title,
    excerpt: data.excerpt,
    content: data.content,
    cover_image_url: data.cover_image_url || null,
    published: data.published,
    published_at: data.published ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    const { data: updated, error } = await sb
      .from("blog_posts")
      .update(payload)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  } else {
    const { data: inserted, error } = await sb
      .from("blog_posts")
      .insert({
        ...payload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  }
}

export async function deleteAdminBlogPost(data: { access_token: string; id: string }) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);
  const { error } = await sb.from("blog_posts").delete().eq("id", data.id);
  if (error) throw new Error(error.message);

  return { ok: true };
}

export async function getAdminSettings(data: { access_token: string }) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);
  const { data: settings, error } = await sb
    .from("system_settings")
    .select("key, value");

  if (error) throw new Error(error.message);

  const providerSetting = settings?.find(s => s.key === "ai_provider");
  const parallelSetting = settings?.find(s => s.key === "parallel_engine_enabled");

  return {
    ai_provider: providerSetting?.value || "both",
    parallel_engine_enabled: parallelSetting ? parallelSetting.value === "true" : true,
  };
}

export async function updateAdminSettings(data: {
  access_token: string;
  ai_provider?: "gemini" | "openai" | "both";
  parallel_engine_enabled?: boolean;
}) {
  const isAdmin = await verifyAdmin(data.access_token);
  if (!isAdmin) throw new Error("Unauthorized");

  const sb = userClient(data.access_token);

  if (data.ai_provider !== undefined) {
    const { error } = await sb
      .from("system_settings")
      .upsert({ key: "ai_provider", value: data.ai_provider, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }

  if (data.parallel_engine_enabled !== undefined) {
    const { error } = await sb
      .from("system_settings")
      .upsert({
        key: "parallel_engine_enabled",
        value: String(data.parallel_engine_enabled),
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
  }

  return { ok: true };
}

