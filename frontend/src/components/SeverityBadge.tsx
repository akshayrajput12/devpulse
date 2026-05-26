const map: Record<string, { label: string; bg: string; fg: string }> = {
  crit: { label: "CRIT", bg: "rgba(251,113,133,0.15)", fg: "var(--sev-crit)" },
  high: { label: "HIGH", bg: "rgba(251,146,60,0.15)", fg: "var(--sev-high)" },
  med:  { label: "MED",  bg: "rgba(251,191,36,0.15)", fg: "var(--sev-med)"  },
  low:  { label: "LOW",  bg: "rgba(96,165,250,0.15)", fg: "var(--sev-low)"  },
  ok:   { label: "OK",   bg: "rgba(52,211,153,0.15)", fg: "var(--sev-ok)"   },
};

export function SeverityBadge({ level }: { level: string }) {
  const m = map[level] ?? map.low;
  return (
    <span
      className="inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider"
      style={{ backgroundColor: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  );
}

export function SeverityDot({ level }: { level: string }) {
  const m = map[level] ?? map.low;
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: m.fg, boxShadow: `0 0 0 4px ${m.bg}` }}
    />
  );
}
