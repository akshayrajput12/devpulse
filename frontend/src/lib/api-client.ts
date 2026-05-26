export async function fetchApi(path: string, options: RequestInit = {}) {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const url = `${baseUrl}${path}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  const res = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!res.ok) {
    let errorMsg = `API Error: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && body.error) errorMsg = body.error;
    } catch {}
    throw new Error(errorMsg);
  }
  
  // For endpoints returning plain text or status codes
  const contentType = res.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return res.text() as any;
  }
  
  return res.json();
}
