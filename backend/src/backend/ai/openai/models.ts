import { getRuntimeEnv, getRequiredEnv } from "../../config/env.server.js";

export const TRIAGE_MODEL = getRequiredEnv("OPENAI_TRIAGE_MODEL");
export const REVIEW_MODEL = getRequiredEnv("OPENAI_REVIEW_MODEL");
export const ENTERPRISE_MODEL = getRequiredEnv("OPENAI_ENTERPRISE_MODEL");

export function selectModel(plan = "free") {
  return plan === "enterprise" ? ENTERPRISE_MODEL : REVIEW_MODEL;
}

export function getOpenAIApiKey() {
  return getRequiredEnv("OPENAI_API_KEY");
}
