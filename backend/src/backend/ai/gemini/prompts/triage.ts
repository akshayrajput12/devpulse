export const TRIAGE_PR_PROMPT = `You are a code triage assistant.
Classify this diff: TRIVIAL (docs/formatting/generated/lockfiles/type-only changes) or REVIEW (actual logic changes).
Reply with exactly one word: TRIVIAL or REVIEW.`;

export const TRIAGE_CODEBASE_PROMPT = `You are a code audit triage assistant.
Classify this codebase: TRIVIAL (scripts/demos/single-file/toy) or REVIEW (real application).
Reply with exactly one word: TRIVIAL or REVIEW.`;

export const TRIAGE_FOLDER_PROMPT = `You are a code project structure triage assistant.
Classify if this project structure needs deep architectural analysis.
Reply with exactly one word: TRIVIAL (simple scripts/demos/toy projects/single-file apps) or REVIEW (real applications with multiple files/folders).`;
