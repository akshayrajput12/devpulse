import { createClient } from "@supabase/supabase-js";
import { getRuntimeEnv, getRequiredEnv, hasUsableServiceRoleKey } from "../../config/env.server.js";

export const TRIAGE_MODEL = getRuntimeEnv("OPENAI_TRIAGE_MODEL") || "gpt-4o-mini";
export const REVIEW_MODEL = getRuntimeEnv("OPENAI_REVIEW_MODEL") || "gpt-4o-mini";
export const ENTERPRISE_MODEL = getRuntimeEnv("OPENAI_ENTERPRISE_MODEL") || "gpt-4o";

export function selectModel(plan = "free") {
  return plan === "enterprise" ? ENTERPRISE_MODEL : REVIEW_MODEL;
}

function supabaseAdmin() {
  const url = getRequiredEnv("SUPABASE_URL");
  const key = hasUsableServiceRoleKey()
    ? getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    : getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

let activeOpenAIKeys: string[] = [];
let lastKeyFetch = 0;
const KEY_TTL_MS = 15000;
let keyIndex = 0;

async function refreshOpenAIKeys() {
  const now = Date.now();
  if (now - lastKeyFetch < KEY_TTL_MS && activeOpenAIKeys.length > 0) {
    return;
  }
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("system_ai_keys")
      .select("api_key_encrypted")
      .eq("provider", "openai")
      .eq("is_active", true);

    if (data && data.length > 0) {
      activeOpenAIKeys = data
        .map((x: any) => String(x.api_key_encrypted || "").trim())
        .filter(Boolean);
    } else {
      activeOpenAIKeys = [];
    }
  } catch {
    // Gracefully fall back to environment variable key
  }
  lastKeyFetch = now;
}

export function getOpenAIApiKey(): string {
  refreshOpenAIKeys().catch(() => {});

  if (activeOpenAIKeys.length > 0) {
    const key = activeOpenAIKeys[keyIndex % activeOpenAIKeys.length];
    keyIndex = (keyIndex + 1) % activeOpenAIKeys.length;
    return key;
  }

  return getRequiredEnv("OPENAI_API_KEY");
}

export function hasOpenAIKeyAvailable(): boolean {
  if (activeOpenAIKeys.length > 0) return true;
  const envKey = getRuntimeEnv("OPENAI_API_KEY");
  return !!envKey && envKey.length > 0;
}
