import type { SupabaseClient } from "@supabase/supabase-js";
import { getRuntimeEnv } from "../config/env.server.js";

const TLS_ERROR_CODES = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

function extractErrorChainText(err: any): { code: string; text: string } {
  const codes: string[] = [];
  const parts: string[] = [];
  let cur: any = err;
  for (let depth = 0; cur && depth < 5; depth += 1) {
    if (cur.code) codes.push(String(cur.code));
    if (cur.message) parts.push(String(cur.message));
    if (cur.name) parts.push(String(cur.name));
    cur = cur.cause ?? cur.originalError ?? null;
  }
  return { code: codes.join(" "), text: parts.join(" | ") };
}

export function isTlsCertError(err: any): boolean {
  const { code, text } = extractErrorChainText(err);
  for (const tlsCode of TLS_ERROR_CODES) {
    if (code.includes(tlsCode) || text.includes(tlsCode)) return true;
  }
  const lower = text.toLowerCase();
  return lower.includes("self-signed certificate") || lower.includes("unable to verify the first certificate");
}

export function isNetworkFetchError(err: any): boolean {
  const { code, text } = extractErrorChainText(err);
  const combined = `${code} ${text}`.toLowerCase();
  return (
    combined.includes("fetch failed") ||
    combined.includes("und_err_connect_timeout") ||
    combined.includes("connecttimeouterror") ||
    combined.includes("etimedout") ||
    combined.includes("enotfound") ||
    combined.includes("econnrefused") ||
    combined.includes("econnreset") ||
    combined.includes("socket hang up")
  );
}

/**
 * Verifies a user's Supabase JWT cleanly:
 * - Retries once on transient network hiccups
 * - Throws HTTP 503 with exact TLS / network diagnostics instead of misleading 401 Unauthorized
 * - Throws HTTP 401 only when the token is genuinely invalid or expired
 */
export async function requireAuthUser(userClient: SupabaseClient<any, any, any>, accessToken: string) {
  let lastResult = await userClient.auth.getUser(accessToken);

  if (lastResult.error && isNetworkFetchError(lastResult.error) && !isTlsCertError(lastResult.error)) {
    await new Promise(resolve => setTimeout(resolve, 350));
    lastResult = await userClient.auth.getUser(accessToken);
  }

  const { data, error } = lastResult;

  if (error) {
    if (isTlsCertError(error)) {
      const tlsErr: any = new Error(
        "TLS certificate verification failed (SELF_SIGNED_CERT_IN_CHAIN) while connecting to Supabase. Your local network, VPN, or antivirus HTTPS scanner is injecting a custom certificate. Trust that CA via NODE_EXTRA_CA_CERTS or exclude *.supabase.co from HTTPS inspection.",
      );
      tlsErr.status = 503;
      tlsErr.code = "SELF_SIGNED_CERT_IN_CHAIN";
      throw tlsErr;
    }

    if (isNetworkFetchError(error)) {
      const netErr: any = new Error(
        "Unable to reach Supabase authentication service. Check internet connectivity, DNS, or proxy settings.",
      );
      netErr.status = 503;
      netErr.code = "SUPABASE_NETWORK_ERROR";
      throw netErr;
    }

    const authErr: any = new Error("Unauthorized");
    authErr.status = 401;
    throw authErr;
  }

  if (!data?.user) {
    const authErr: any = new Error("Unauthorized");
    authErr.status = 401;
    throw authErr;
  }

  return data.user;
}

/**
 * Lightweight startup check so TLS / proxy certificate issues are diagnosed immediately once on boot.
 */
export async function checkSupabaseConnectivityOnStartup() {
  const url = getRuntimeEnv("SUPABASE_URL");
  if (!url) return;

  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    console.log(`[Startup Check] Supabase TLS connectivity OK (HTTP ${res.status})`);
  } catch (err) {
    if (isTlsCertError(err)) {
      console.warn(
        `\x1b[33m[TLS Certificate Warning]\x1b[0m Outbound HTTPS to Supabase failed with SELF_SIGNED_CERT_IN_CHAIN.\n` +
          `  Cause: A local VPN, corporate/campus proxy, or antivirus HTTPS scanner is intercepting TLS.\n` +
          `  Fix:   Set NODE_EXTRA_CA_CERTS="<path-to-your-proxy-root-ca.pem>" or exempt *.supabase.co from HTTPS scanning.`,
      );
    } else {
      console.warn(
        `\x1b[33m[Startup Check]\x1b[0m Could not reach Supabase health endpoint: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
