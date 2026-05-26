const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

import { getRuntimeEnv } from "../config/env.server";

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const configured = (getRuntimeEnv("CORS_ORIGINS") ?? getRuntimeEnv("APP_URL") ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const allowed = [...DEFAULT_ALLOWED_ORIGINS, ...configured];
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] ?? "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function preflight(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
