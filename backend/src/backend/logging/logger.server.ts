type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  return {
    name: error.name,
    message: error.message,
    // Include stacks in production — they go to Vercel logs (server-side only),
    // never reach the client. Essential for diagnosing timeout failures.
    stack: error.stack,
  };
}

export function createRequestId(prefix = "req") {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
}

export function log(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    service: "devpulse-backend",
    event,
    ...fields,
  };

  const line = JSON.stringify(payload, (_key, value) => {
    if (value instanceof Error) return serializeError(value);
    return value;
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => log("debug", event, fields),
  info: (event: string, fields?: LogFields) => log("info", event, fields),
  warn: (event: string, fields?: LogFields) => log("warn", event, fields),
  error: (event: string, fields?: LogFields) => log("error", event, fields),
};
