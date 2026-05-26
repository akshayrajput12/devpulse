import { getRuntimeEnv, getRequiredEnv } from "../../config/env.server.js";

export const TRIAGE_MODEL = getRequiredEnv("GEMINI_TRIAGE_MODEL");
export const REVIEW_MODEL = getRequiredEnv("GEMINI_REVIEW_MODEL");
export const ENTERPRISE_MODEL = getRequiredEnv("GEMINI_ENTERPRISE_MODEL");

export function selectModel(plan = "free") {
  return plan === "enterprise" ? ENTERPRISE_MODEL : REVIEW_MODEL;
}

export function getGeminiApiKey() {
  return getRequiredEnv("GEMINI_API_KEY");
}
