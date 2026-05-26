import { fetchApi } from "./api-client.js";

export async function getPublishedBlogPosts() {
  return fetchApi("/api/blog/posts");
}

export async function getBlogPostBySlug(payload: { data: { slug: string } }) {
  return fetchApi("/api/blog/post-by-slug", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}
