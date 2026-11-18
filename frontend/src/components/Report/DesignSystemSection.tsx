import { useState } from "react";
import { Check, Copy, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { HealthScore } from "@/components/HealthScore";
import { SeverityBadge, SeverityDot } from "@/components/SeverityBadge";
import { DESIGN_TOKENS } from "./reportData";

type ScoreVariant = "radial" | "numeric" | "bars" | "histogram";

const DEMO_BARS = [
  { label: "Security", val: 92, color: "var(--sev-ok)" },
  { label: "Performance", val: 78, color: "var(--sev-med)" },
  { label: "Architecture", val: 88, color: "var(--accent)" },
  { label: "Reliability", val: 84, color: "var(--sev-low)" },
  { label: "Testability", val: 74, color: "var(--sev-high)" },
];

const DEMO_HIST = [
  { sev: "CRIT", count: 0, h: 12, color: "var(--sev-crit)" },
  { sev: "HIGH", count: 1, h: 38, color: "var(--sev-high)" },
  { sev: "MED", count: 2, h: 64, color: "var(--sev-med)" },
  { sev: "LOW", count: 3, h: 86, color: "var(--sev-low)" },
  { sev: "OK", count: 9, h: 100, color: "var(--sev-ok)" },
];

export function DesignSystemSection() {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [scoreVariant, setScoreVariant] = useState<ScoreVariant>("radial");

  const copyToken = (token: string) => {
    navigator.clipboard?.writeText(`var(${token})`);
    setCopiedToken(token);
    toast.success(`Copied var(${token})`);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  return (
    <section id="design-system" className="scroll-mt-28 py-14">
      <div className="mx-auto max-w-[1240px] px-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              07 // Live Design System
            </span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tightest sm:text-3xl">
              Developer-Brutalist Tokens, Type Scale &amp; UI Primitives
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] text-text-muted">
            <Palette className="h-3 w-3 text-primary" />
            Click any swatch to copy CSS var
          </span>
        </div>

        {/* Live Color Token Grid */}
        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          {/* Surface & Accent Swatches */}
          <div className="lg:col-span-7 rounded-xl border border-border bg-bg-elev p-5 space-y-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-2.5">
                Surface &amp; Border Tokens (Live Theme-Reactive)
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {DESIGN_TOKENS.surfaces.map((tok) => (
                  <button
                    key={tok.name}
                    onClick={() => copyToken(tok.name)}
                    className="group rounded-lg border border-border bg-bg-code p-2 text-left transition hover:border-primary/50 cursor-pointer"
                  >
                    <div
                      className="h-10 w-full rounded-md border border-border"
                      style={{ backgroundColor: `var(${tok.name})` }}
                    />
                    <div className="mt-2 flex items-center justify-between font-mono text-[10px] font-semibold text-foreground">
                      <span className="truncate">{tok.name}</span>
                      {copiedToken === tok.name ? (
                        <Check className="h-3 w-3 text-sev-ok shrink-0" />
                      ) : (
                        <Copy className="h-2.5 w-2.5 text-text-faint opacity-0 group-hover:opacity-100 shrink-0" />
                      )}
                    </div>
                    <div className="font-mono text-[9px] text-text-faint">{tok.usage}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-2">
                  The Pulse Accent
                </div>
                <div className="space-y-2">
                  {DESIGN_TOKENS.accent.map((tok) => (
                    <button
                      key={tok.name}
                      onClick={() => copyToken(tok.name)}
                      className="flex w-full items-center justify-between rounded-lg border border-border-faint bg-bg-code px-2.5 py-2 transition hover:border-primary/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-6 w-6 rounded-md border border-border"
                          style={{ backgroundColor: `var(${tok.name})` }}
                        />
                        <div className="text-left">
                          <div className="font-mono text-[11px] font-semibold text-foreground">
                            {tok.name}
                          </div>
                          <div className="font-mono text-[9px] text-text-faint">{tok.usage}</div>
                        </div>
                      </div>
                      <span className="font-mono text-[9px] text-text-muted">{tok.dark}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-2">
                  5-Tier Severity System
                </div>
                <div className="space-y-1.5">
                  {DESIGN_TOKENS.severity.map((s) => (
                    <button
                      key={s.level}
                      onClick={() => copyToken(s.name)}
                      className="flex w-full items-center justify-between rounded-lg border border-border-faint bg-bg-code px-2.5 py-1.5 transition hover:border-primary/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <SeverityDot level={s.level} />
                        <SeverityBadge level={s.level} />
                        <span className="font-mono text-[10px] text-text-muted">{s.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-text-faint">{s.deduction}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Typography, Radii & Live Health Score Variants */}
          <div className="lg:col-span-5 space-y-4">
            {/* Typography Specimen */}
            <div className="rounded-xl border border-border bg-bg-elev p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-text-faint mb-3">
                Typography Pairing &amp; Radii
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-border-faint bg-bg-code p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-semibold tracking-tightest text-foreground">
                      Space Grotesk
                    </span>
                    <span className="font-mono text-[10px] text-primary">Display &amp; UI</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-text-faint">
                    400 / 500 / 600 · tracking -0.035em · ss01 + cv11
                  </div>
                </div>
                <div className="rounded-lg border border-border-faint bg-bg-code p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-base font-medium text-foreground">
                      JetBrains Mono
                    </span>
                    <span className="font-mono text-[10px] text-sev-ok">Code &amp; Telemetry</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-text-faint">
                    400 / 500 · tabular-nums · paths, scores, pills
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {[
                    { k: "xs", r: "4px" },
                    { k: "md", r: "6px" },
                    { k: "lg", r: "10px" },
                    { k: "xl", r: "14px" },
                    { k: "2xl", r: "20px" },
                  ].map((rad) => (
                    <div
                      key={rad.k}
                      className="flex flex-col items-center justify-center border border-border bg-bg-soft py-2 font-mono text-[9px] text-text-muted"
                      style={{ borderRadius: rad.r }}
                    >
                      <span className="font-semibold text-foreground">{rad.r}</span>
                      <span>{rad.k}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live HealthScore 4-Variant Showcase */}
            <div className="rounded-xl border border-border bg-bg-elev p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                  <Sparkles className="h-3 w-3 text-primary" /> HealthScore Primitives
                </span>
                <div className="flex gap-1 rounded-md border border-border bg-bg-soft p-0.5 font-mono text-[9px]">
                  {(["radial", "numeric", "bars", "histogram"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setScoreVariant(v)}
                      className={`rounded px-2 py-0.5 capitalize transition cursor-pointer ${
                        scoreVariant === v
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-text-muted hover:text-foreground"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex min-h-[146px] items-center justify-center rounded-lg border border-border-faint bg-bg-code p-4">
                {scoreVariant === "radial" && <HealthScore value={86} size={118} />}

                {scoreVariant === "numeric" && (
                  <div className="w-full max-w-[260px] text-center">
                    <div className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-sev-ok">
                      86<span className="text-base text-text-faint">/100</span>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bg-soft">
                      <div className="h-full w-[86%] rounded-full bg-sev-ok" />
                    </div>
                  </div>
                )}

                {scoreVariant === "bars" && (
                  <div className="w-full space-y-2">
                    {DEMO_BARS.map((b) => (
                      <div
                        key={b.label}
                        className="flex items-center gap-2.5 font-mono text-[10px]"
                      >
                        <span className="w-20 text-text-muted">{b.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-bg-soft overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${b.val}%`, backgroundColor: b.color }}
                          />
                        </div>
                        <span className="w-7 text-right text-foreground">{b.val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {scoreVariant === "histogram" && (
                  <div className="flex h-[110px] w-full items-end justify-around gap-2 pt-2">
                    {DEMO_HIST.map((bar) => (
                      <div key={bar.sev} className="flex flex-1 flex-col items-center gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-foreground">
                          {bar.count}
                        </span>
                        <div className="flex h-16 w-full max-w-[34px] items-end rounded bg-bg-soft p-0.5">
                          <div
                            className="w-full rounded-sm"
                            style={{ height: `${bar.h}%`, backgroundColor: bar.color }}
                          />
                        </div>
                        <span className="font-mono text-[9px] text-text-faint">{bar.sev}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
