import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "../backend/config/env.server.js";

function getClient() {
  const url = getRequiredEnv("SUPABASE_URL");
  const key = getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key);
}

export async function getPublishedBlogPosts() {
  const sb = getClient();
  const { data: posts, error } = await sb
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at, created_at")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[getPublishedBlogPosts] Failed to fetch:", error.message);
    throw new Error(error.message);
  }

  return posts ?? [];
}

export async function getBlogPostBySlug(slug: string) {
  const sb = getClient();
  const { data: post, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    console.error("[getBlogPostBySlug] Error:", error.message);
    throw new Error("Failed to load blog post");
  }

  if (!post) {
    throw new Error("Blog post not found");
  }

  return post;
}
