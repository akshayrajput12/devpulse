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
  } catch {
    // ignore URL parse issues on Windows paths
  }
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
  } catch {
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
  const lookup = (k: string): string | undefined => {
    const envVal = process.env[k];
    if (envVal !== undefined && envVal.trim() !== "") return envVal.trim();

    const processRef = typeof process !== "undefined" ? process : undefined;
    const liveVal = processRef ? (processRef as any).env?.[k] : undefined;
    if (typeof liveVal === "string" && liveVal.trim() !== "") return liveVal.trim();

    const fileEnv = loadFileEnv();
    const fileVal = fileEnv[k];
    if (fileVal !== undefined && fileVal.trim() !== "") return fileVal.trim();

    return undefined;
  };

  const direct = lookup(key);
  if (direct) return direct;

  // Transparent aliases so Render/Vercel configs never break on naming differences
  if (key === "SUPABASE_PUBLISHABLE_KEY") return lookup("SUPABASE_ANON_KEY") || lookup("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (key === "SUPABASE_ANON_KEY") return lookup("SUPABASE_PUBLISHABLE_KEY") || lookup("VITE_SUPABASE_ANON_KEY");
  if (key === "SUPABASE_URL") return lookup("VITE_SUPABASE_URL");

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

/**
 * Verify whether a Supabase key is genuinely a privileged service_role / secret key
 * (and not accidentally an anon or sb_publishable_* key).
 */
export function isValidServiceRoleKey(key?: string | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("sb_secret_")) return true;
  if (trimmed.startsWith("sb_publishable_")) return false;

  const parts = trimmed.split(".");
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
      const payload = JSON.parse(payloadJson) as { role?: string };
      return payload.role === "service_role";
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Returns true only if SUPABASE_SERVICE_ROLE_KEY is present and carries service_role privileges.
 */
export function hasUsableServiceRoleKey(): boolean {
  return isValidServiceRoleKey(getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY"));
}
