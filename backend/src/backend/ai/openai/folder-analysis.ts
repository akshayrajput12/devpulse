import { callOpenAIRaw, parseJsonResponse, readOpenAIText, type OpenAIUsage } from "./client.js";
import { getOpenAIApiKey, REVIEW_MODEL, TRIAGE_MODEL } from "./models.js";
import { FOLDER_ANALYSIS_SYSTEM_PROMPT } from "./prompts/folder-analysis.js";
import { TRIAGE_FOLDER_PROMPT } from "./prompts/triage.js";
import { logger } from "../../logging/logger.server.js";
import { type FolderAnalysisResult } from "../orchestrator.js";

async function triageFolder(requestId: string, structure: string, apiKey: string) {
  try {
    const res = await callOpenAIRaw({
      requestId,
      model: TRIAGE_MODEL,
      systemPrompt: TRIAGE_FOLDER_PROMPT,
      userContent: `Project structure:\n${structure.slice(0, 2000)}`,
      apiKey,
      maxTokens: 5,
    });
    if (!res.ok) return "REVIEW";
    const { text, usage } = await readOpenAIText(res);
    logger.info("openai.folder_triage_usage", { requestId, model: TRIAGE_MODEL, usage });
    return text.trim().toUpperCase().includes("TRIVIAL") ? "TRIVIAL" : "REVIEW";
  } catch (error) {
    logger.warn("openai.folder_triage_failed_open", { requestId, error });
    return "REVIEW";
  }
}

export async function callFolderAnalysisAI(params: {
  requestId: string;
  structure: string;
  repoName?: string;
}) {
  const apiKey = getOpenAIApiKey();
  const triage = await triageFolder(params.requestId, params.structure, apiKey);

  if (triage === "TRIVIAL") {
    logger.info("openai.folder_analysis.trivial_early_return", {
      requestId: params.requestId,
      repoName: params.repoName,
    });
    return {
      organization_score: 100,
      grade: "A" as const,
      stack_detected: "Trivial/Minimal Project",
      current_analysis: {
        strengths: [
          "Minimal overhead: clean and simple layout with no excess boilerplate.",
          "Extremely small codebase footprint ensures high maintenance efficiency."
        ],
        weaknesses: [],
        critical_issues: [],
      },
      ideal_structure: {
        description: "The repository contains a minimal set of files. The current structure is optimal for this scale. Keep separations clean as the project grows.",
        tree: params.structure,
        key_decisions: [
          "Adopt advanced design patterns and custom folder nesting only when the codebase grows to exceed ~8 files."
        ],
      },
      migration_actions: [],
      folder_annotations: {},
      usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
      model: "triage-bypass",
    };
  }

  const userContent = [
    params.repoName ? `Repository: ${params.repoName}\n` : "",
    `Current project structure:\n\`\`\`\n${params.structure}\n\`\`\`\n`,
    "\nAnalyze this structure comprehensively. Identify every architectural issue, then produce",
    "the ideal production-ready folder structure as a full ASCII tree with inline comments.",
  ].join("");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await callOpenAIRaw({
      requestId: params.requestId,
      model: REVIEW_MODEL,
      systemPrompt: FOLDER_ANALYSIS_SYSTEM_PROMPT,
      userContent,
      apiKey,
      jsonMode: true,
    });

    if (res.ok) {
      const { text, usage } = await readOpenAIText(res);
      const parsed = parseJsonResponse<FolderAnalysisResult>(text);
      logger.info("openai.folder_analysis_usage", {
        requestId: params.requestId,
        model: REVIEW_MODEL,
        usage,
        migrationActionCount: parsed.migration_actions?.length ?? 0,
      });
      return { ...parsed, usage, model: REVIEW_MODEL };
    }

    const body = await res.text();
    if (res.status !== 429 || attempt === 2) {
      throw new Error(`OpenAI API folder analysis error ${res.status}: ${body.slice(0, 500)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 3000 * Math.pow(2, attempt)));
  }

  throw new Error("Folder analysis failed after retries on OpenAI");
}
