import { createClient } from "@supabase/supabase-js";
import { getRuntimeEnv, getRequiredEnv } from "../../config/env.server.js";

export const TRIAGE_MODEL = getRequiredEnv("GEMINI_TRIAGE_MODEL");
export const REVIEW_MODEL = getRequiredEnv("GEMINI_REVIEW_MODEL");
export const ENTERPRISE_MODEL = getRequiredEnv("GEMINI_ENTERPRISE_MODEL");

export function selectModel(plan = "free") {
  return plan === "enterprise" ? ENTERPRISE_MODEL : REVIEW_MODEL;
}

function supabaseAdmin() {
  const url = getRequiredEnv("SUPABASE_URL");
  const key = getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY") || getRequiredEnv("SUPABASE_PUBLISHABLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

let activeGeminiKeys: string[] = [];
let lastKeyFetch = 0;
const KEY_TTL_MS = 15000;
let keyIndex = 0;

async function refreshGeminiKeys() {
  const now = Date.now();
  if (now - lastKeyFetch < KEY_TTL_MS && activeGeminiKeys.length > 0) {
    return;
  }
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("system_ai_keys")
      .select("api_key_encrypted")
      .eq("provider", "gemini")
      .eq("is_active", true);
    
    if (data && data.length > 0) {
      activeGeminiKeys = data.map((x: any) => x.api_key_encrypted);
    } else {
      activeGeminiKeys = [];
    }
  } catch (err) {
    console.error("Failed to load Gemini API keys from database:", err);
  }
  lastKeyFetch = now;
}

export function getGeminiApiKey(): string {
  refreshGeminiKeys().catch(() => {});
  
  if (activeGeminiKeys.length > 0) {
    const key = activeGeminiKeys[keyIndex];
    keyIndex = (keyIndex + 1) % activeGeminiKeys.length;
    return key;
  }
  
  return getRequiredEnv("GEMINI_API_KEY");
}
