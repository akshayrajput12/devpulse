import fs from "fs";
import path from "path";

let fileEnvCache: Record<string, string> | null = null;

function findEnvFilePath(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const p = path.resolve(dir, ".env");
    if (fs.existsSync(p)) return p;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Try relative to __dirname / import.meta.url
  try {
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    let d = currentDir;
    for (let i = 0; i < 5; i++) {
      const p = path.resolve(d, ".env");
      if (fs.existsSync(p)) return p;
      const parent = path.dirname(d);
      if (parent === d) break;
      d = parent;
    }
  } catch (e) {}
  return null;
}

function loadFileEnv(): Record<string, string> {
  if (fileEnvCache) return fileEnvCache;
  const env: Record<string, string> = {};
  try {
    const p = findEnvFilePath();
    if (p && fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8");
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const index = trimmed.indexOf("=");
        if (index > 0) {
          const key = trimmed.slice(0, index).trim();
          let val = trimmed.slice(index + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          } else if (val.startsWith("'") && val.endsWith("'")) {
            val = val.slice(1, -1);
          }
          if (!env[key]) env[key] = val;
        }
      });
    }
  } catch (e) {
    // Ignore errors silently
  }
  fileEnvCache = env;
  return env;
}

/**
 * Get a server-side environment variable at runtime dynamically.
 * Bypasses static compilation / replacement by using runtime bracket lookup.
 */
export function getRuntimeEnv(key: string): string | undefined {
  // 1. Direct process.env lookup (ensure it's not undefined and not empty)
  const envVal = process.env[key];
  if (envVal !== undefined && envVal !== "") return envVal;

  // 2. Bracket notation lookup to bypass static compile replacements
  const processRef = typeof process !== "undefined" ? process : undefined;
  const liveVal = processRef ? (processRef as any).env?.[key] : undefined;
  if (liveVal !== undefined && liveVal !== "") return liveVal;

  // 3. Fallback to reading the .env file directly from disk
  const fileEnv = loadFileEnv();
  const fileVal = fileEnv[key];
  if (fileVal !== undefined && fileVal !== "") return fileVal;

  return undefined;
}

/**
 * Get a runtime environment variable or throw a descriptive error if missing.
 */
export function getRequiredEnv(key: string): string {
  const val = getRuntimeEnv(key);
  if (!val) {
    const errorMsg = `Critical environment variable "${key}" is not configured. Please define it in your .env file or production environment.`;
    console.error(`[EnvError] ${errorMsg}`);
    throw new Error(errorMsg);
  }
  return val;
}
