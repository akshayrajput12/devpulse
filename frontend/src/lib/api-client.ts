export async function fetchApi(path: string, options: RequestInit = {}) {
  const rawBase =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:5000";
  const baseUrl = rawBase.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `API Error (${res.status}): ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && body.error) errorMsg = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
    } catch {
      // non-JSON response body
    }
    throw new Error(errorMsg);
  }

  const contentType = res.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return res.text() as any;
  }

  return res.json();
}
