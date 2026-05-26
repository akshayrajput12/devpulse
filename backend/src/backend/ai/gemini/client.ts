import { logger } from "../../logging/logger.server.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Hard limit: abort any Gemini request that hasn't responded in this many ms.
const GEMINI_TIMEOUT_MS = 120_000;

export type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export type GeminiTextResponse = {
  text: string;
  usage: GeminiUsage;
  raw: unknown;
};

export async function callGeminiRaw(params: {
  requestId: string;
  reviewId?: string;
  model: string;
  systemPrompt: string;
  userContent: string;
  apiKey: string;
  jsonMode?: boolean;
  maxTokens?: number;
}) {
  const startedAt = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    logger.error("gemini.request_timeout", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      model: params.model,
      apiKeyLast4: params.apiKey ? params.apiKey.slice(-4) : "none",
      timeoutMs: GEMINI_TIMEOUT_MS,
      durationMs: Date.now() - startedAt,
    });
  }, GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/${params.model}:generateContent?key=${params.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: params.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: params.userContent }] }],
        generationConfig: {
          ...(params.jsonMode ? { response_mime_type: "application/json" } : {}),
          temperature: 0,
          top_p: 0.95,
          ...(params.maxTokens ? { maxOutputTokens: params.maxTokens } : {}),
        },
      }),
    });

    const durationMs = Date.now() - startedAt;
    const apiKeyLast4 = params.apiKey ? params.apiKey.slice(-4) : "none";

    logger.info("gemini.http_response", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      model: params.model,
      apiKeyLast4,
      status: res.status,
      ok: res.ok,
      durationMs,
    });

    if (!res.ok) {
      logger.warn("gemini.http_error", {
        requestId: params.requestId,
        reviewId: params.reviewId,
        model: params.model,
        apiKeyLast4,
        status: res.status,
        durationMs,
      });
    }

    return res;
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    const isTimeout = err?.name === "AbortError";
    const apiKeyLast4 = params.apiKey ? params.apiKey.slice(-4) : "none";
    logger.error("gemini.fetch_failed", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      model: params.model,
      apiKeyLast4,
      isTimeout,
      durationMs,
      error: err?.message,
    });
    throw isTimeout
      ? new Error(`Gemini API timed out after ${GEMINI_TIMEOUT_MS / 1000}s (model: ${params.model})`)
      : err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function extractText(json: any): string | null {
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

export function parseJsonResponse<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini returned a non-JSON response");
    return JSON.parse(match[0]);
  }
}

export async function readGeminiText(res: Response): Promise<GeminiTextResponse> {
  const json = await res.json();
  const text = extractText(json);
  if (!text) throw new Error("Gemini returned no text content");
  return {
    text,
    usage: json.usageMetadata ?? {},
    raw: json,
  };
}
