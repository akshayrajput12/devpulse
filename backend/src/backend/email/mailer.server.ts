import fs from "fs";
import path from "path";

type Transporter = {
  sendMail(opts: Record<string, unknown>): Promise<{ messageId?: string }>;
};

import { getRuntimeEnv } from "../config/env.server";

let cached: Transporter | null = null;

async function loadNodemailer() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
  const mod = await dynamicImport("nodemailer");
  return mod.default ?? mod;
}

async function transporter() {
  if (cached) return cached;

  const host = getRuntimeEnv("SMTP_HOST");
  const port = Number(getRuntimeEnv("SMTP_PORT") || 587);
  const user = getRuntimeEnv("SMTP_USER");
  const pass = getRuntimeEnv("SMTP_PASS");

  if (!host || !user || !pass) {
    throw new Error(`SMTP is not configured. Missing keys. Host: ${host ? "ok" : "missing"}, User: ${user ? "ok" : "missing"}, Pass: ${pass ? "ok" : "missing"}`);
  }

  const nodemailer = await loadNodemailer();
  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cached;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  const from = getRuntimeEnv("SMTP_FROM") || `DevPulse <${getRuntimeEnv("SMTP_USER")}>`;
  return (await transporter())!.sendMail({ from, ...opts });
}

