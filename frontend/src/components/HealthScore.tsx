import { motion } from "framer-motion";

export function HealthScore({ value = 0, size = 120 }: { value?: number | null; size?: number }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const color = v >= 80 ? "var(--sev-ok)" : v >= 60 ? "var(--sev-med)" : v >= 40 ? "var(--sev-high)" : "var(--sev-crit)";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={6} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={6} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * v) / 100 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-mono text-2xl font-medium tabular-nums">{v}</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-text-faint">/ 100</div>
        </div>
      </div>
    </div>
  );
}
