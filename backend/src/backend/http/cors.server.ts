import { getRuntimeEnv } from "../config/env.server.js";

export const DEFAULT_ALLOWED_ORIGINS = [
  "https://devvpulse.vercel.app",
  "https://devpulse.vercel.app",
  "https://code-pulse.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",
];

// Matches Vercel production & preview deployments for DevPulse / Code-Pulse
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/(devv?pulse|code-pulse)(-[a-z0-9-]+)?\.vercel\.app$/i,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i,
];

export function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getAllowedOrigins(): string[] {
  const configuredRaw = [
    getRuntimeEnv("FRONTEND_URL") ?? "",
    getRuntimeEnv("APP_URL") ?? "",
    getRuntimeEnv("CORS_ORIGINS") ?? "",
  ].join(",");

  const configured = configuredRaw
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS.map(normalizeOrigin), ...configured])];
}

export function isOriginAllowed(origin?: string | null): boolean {
  if (!origin) return true;
  const clean = normalizeOrigin(origin);
  if (getAllowedOrigins().includes(clean)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(clean));
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const allowOrigin = origin && isOriginAllowed(origin) ? normalizeOrigin(origin) : allowed[0] ?? "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function preflight(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
