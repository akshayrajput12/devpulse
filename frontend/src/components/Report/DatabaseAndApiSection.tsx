import { useState } from "react";
import { Database, Lock, ServerCog, Shield } from "lucide-react";
import { API_ENDPOINTS, DB_DOMAINS, PG_RPCS, type ApiEndpointSpec } from "./reportData";

const AUTH_COLORS: Record<ApiEndpointSpec["auth"], string> = {
  JWT: "var(--accent)",
  HMAC: "var(--sev-high)",
  Admin: "var(--sev-crit)",
  Public: "var(--sev-ok)",
};

export function DatabaseAndApiSection() {
  const [apiFilter, setApiFilter] = useState<string>("All");
  const groups = ["All", "Reviews", "Folder AI", "Billing", "Webhooks", "Admin & CMS"];

  const filteredEndpoints =
    apiFilter === "All" ? API_ENDPOINTS : API_ENDPOINTS.filter((ep) => ep.group === apiFilter);

  return (
    <section id="data-api" className="scroll-mt-28 border-b border-border py-14">
      <div className="mx-auto max-w-[1240px] px-6">
        {/* Header */}
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            06 // Data Schema &amp; API Surface
          </span>
          <h2 className="mt-1 text-2xl font-semibold tracking-tightest sm:text-3xl">
            17 RLS-Protected PostgreSQL Tables &amp; 26+ REST / Webhook Endpoints
          </h2>
        </div>

        {/* Grouped Visual ERD Map */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DB_DOMAINS.map((group) => (
            <div key={group.domain} className="rounded-xl border border-border bg-bg-elev p-4">
              <div className="mb-3 flex items-center justify-between border-b border-border-faint pb-2.5">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5" style={{ color: group.color }} />
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {group.domain}
                  </span>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold"
                  style={{
                    color: group.color,
                    backgroundColor: `color-mix(in oklab, ${group.color} 15%, transparent)`,
                  }}
                >
                  {group.tables.length} tables
                </span>
              </div>

              <div className="space-y-2">
                {group.tables.map((t) => (
                  <div
                    key={t.name}
                    className="rounded-lg border border-border-faint bg-bg-code p-2.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        public.{t.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {t.relations && (
                          <span className="rounded bg-bg-soft px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
                            {t.relations}
                          </span>
                        )}
                        {t.rls && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-sev-ok/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-sev-ok"
                            title="Row-Level Security Enabled"
                          >
                            <Lock className="h-2.5 w-2.5" /> RLS
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">
                        PK {t.pk}
                      </span>
                      {t.keyCols.map((col) => (
                        <span
                          key={col}
                          className="rounded border border-border-faint bg-bg-elev px-1.5 py-0.5 font-mono text-[9px] text-text-muted"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* PostgreSQL RPCs & Auto-Purge Triggers Card */}
          <div className="rounded-xl border border-primary/30 bg-bg-elev p-4">
            <div className="mb-3 flex items-center justify-between border-b border-border-faint pb-2.5">
              <div className="flex items-center gap-2">
                <ServerCog className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  SQL RPCs &amp; Triggers
                </span>
              </div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9px] font-semibold text-primary">
                6 Functions
              </span>
            </div>

            <div className="space-y-2">
              {PG_RPCS.map((rpc) => (
                <div
                  key={rpc.name}
                  className="rounded-lg border border-border-faint bg-bg-soft/40 px-2.5 py-2"
                >
                  <div className="font-mono text-[11px] font-semibold text-primary truncate">
                    {rpc.name}()
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-text-muted">{rpc.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filterable API Surface Matrix */}
        <div className="mt-8 rounded-xl border border-border bg-bg-elev p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">
                Express REST &amp; Webhook Surface
              </h3>
              <span className="rounded bg-bg-soft px-2 py-0.5 font-mono text-[10px] text-text-muted">
                {filteredEndpoints.length} routes
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setApiFilter(g)}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition cursor-pointer ${
                    apiFilter === g
                      ? "border-primary/50 bg-primary/15 text-primary font-semibold"
                      : "border-border bg-bg-code text-text-muted hover:text-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {filteredEndpoints.map((ep) => (
              <div
                key={ep.path}
                className="flex items-center justify-between gap-3 rounded-lg border border-border-faint bg-bg-code px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        ep.method === "GET"
                          ? "bg-sev-low/15 text-sev-low"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="truncate font-medium text-foreground">{ep.path}</span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[10px] text-text-faint">
                    {ep.purpose}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase"
                  style={{
                    color: AUTH_COLORS[ep.auth],
                    backgroundColor: `color-mix(in oklab, ${AUTH_COLORS[ep.auth]} 14%, transparent)`,
                  }}
                >
                  {ep.auth}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
