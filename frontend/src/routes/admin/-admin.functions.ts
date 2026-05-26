import { fetchApi } from "../../lib/api-client.js";

export async function checkAdminStatus(payload: {
  data: {
    access_token: string;
  };
}) {
  return fetchApi("/api/admin/check-status", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getAdminMetrics(payload: {
  data: {
    access_token: string;
  };
}) {
  return fetchApi("/api/admin/metrics", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getAdminUsers(payload: {
  data: {
    access_token: string;
    search?: string;
  };
}) {
  return fetchApi("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function updateAdminUserCredits(payload: {
  data: {
    access_token: string;
    user_id: string;
    credits: number;
  };
}) {
  return fetchApi("/api/admin/update-credits", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function updateAdminUserPlan(payload: {
  data: {
    access_token: string;
    user_id: string;
    plan: "free" | "pro";
  };
}) {
  return fetchApi("/api/admin/update-plan", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function toggleAdminRole(payload: {
  data: {
    access_token: string;
    user_id: string;
    is_admin: boolean;
  };
}) {
  return fetchApi("/api/admin/toggle-role", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function deleteAdminUserAccount(payload: {
  data: {
    access_token: string;
    user_id: string;
  };
}) {
  return fetchApi("/api/admin/delete-user", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getAdminBlogPosts(payload: {
  data: {
    access_token: string;
  };
}) {
  return fetchApi("/api/admin/blog-posts", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function saveAdminBlogPost(payload: {
  data: {
    access_token: string;
    id?: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    cover_image_url?: string;
    published: boolean;
  };
}) {
  return fetchApi("/api/admin/save-blog-post", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function deleteAdminBlogPost(payload: {
  data: {
    access_token: string;
    id: string;
  };
}) {
  return fetchApi("/api/admin/delete-blog-post", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function getAdminSettings(payload: {
  data: {
    access_token: string;
  };
}) {
  return fetchApi("/api/admin/settings", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

export async function updateAdminSettings(payload: {
  data: {
    access_token: string;
    ai_provider?: "gemini" | "openai" | "both";
    parallel_engine_enabled?: boolean;
  };
}) {
  return fetchApi("/api/admin/update-settings", {
    method: "POST",
    body: JSON.stringify(payload.data),
  });
}

