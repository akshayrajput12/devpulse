import { logger } from "../../logging/logger.server.js";

const BASE_URL = "https://api.openai.com/v1/chat/completions";

// Timeout for OpenAI calls
const OPENAI_TIMEOUT_MS = 120_000;

export type OpenAIUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export type OpenAITextResponse = {
  text: string;
  usage: OpenAIUsage;
  raw: unknown;
};

export async function callOpenAIRaw(params: {
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
    logger.error("openai.request_timeout", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      model: params.model,
      apiKeyLast4: params.apiKey ? params.apiKey.slice(-4) : "none",
      timeoutMs: OPENAI_TIMEOUT_MS,
      durationMs: Date.now() - startedAt,
    });
  }, OPENAI_TIMEOUT_MS);

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${params.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userContent },
        ],
        temperature: 0,
        ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
        ...(params.maxTokens ? { max_tokens: params.maxTokens } : {}),
      }),
    });

    const durationMs = Date.now() - startedAt;
    const apiKeyLast4 = params.apiKey ? params.apiKey.slice(-4) : "none";

    logger.info("openai.http_response", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      model: params.model,
      apiKeyLast4,
      status: res.status,
      ok: res.ok,
      durationMs,
    });

    if (!res.ok) {
      logger.warn("openai.http_error", {
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
    logger.error("openai.fetch_failed", {
      requestId: params.requestId,
      reviewId: params.reviewId,
      model: params.model,
      apiKeyLast4,
      isTimeout,
      durationMs,
      error: err?.message,
    });
    throw isTimeout
      ? new Error(`OpenAI API timed out after ${OPENAI_TIMEOUT_MS / 1000}s (model: ${params.model})`)
      : err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function parseJsonResponse<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("OpenAI returned a non-JSON response");
    return JSON.parse(match[0]);
  }
}

export async function readOpenAIText(res: Response): Promise<OpenAITextResponse> {
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? null;
  if (!text) {
    throw new Error(
      json.error?.message || "OpenAI returned an empty content body. Verify your API keys and balances."
    );
  }
  
  const usage = json.usage ? {
    promptTokenCount: json.usage.prompt_tokens,
    candidatesTokenCount: json.usage.completion_tokens,
    totalTokenCount: json.usage.total_tokens,
  } : {};

  return {
    text,
    usage,
    raw: json,
  };
}
