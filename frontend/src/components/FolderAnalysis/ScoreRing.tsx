type Grade = "A" | "B" | "C" | "D" | "F";

const gradeColor: Record<Grade, string> = {
  A: "#10b981",
  B: "#3b82f6",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
};

const gradeLabel: Record<Grade, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Poor",
  F: "Critical",
};

export function ScoreRing({
  score,
  grade,
  size = 120,
}: {
  score: number;
  grade: Grade;
  size?: number;
}) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = pct * circ;
  const gap = circ - dash;
  const color = gradeColor[grade] ?? "#6b7280";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          className="text-border/50"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute flex flex-col items-center" style={{ marginTop: -(size / 2 + 14) }}>
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-text-muted">/100</span>
      </div>
      <div
        className="rounded-full px-3 py-0.5 text-xs font-bold"
        style={{ background: `${color}22`, color }}
      >
        {grade} — {gradeLabel[grade]}
      </div>
    </div>
  );
}

export function ScoreRingInline({
  score,
  grade,
}: {
  score: number;
  grade: Grade;
}) {
  const color = gradeColor[grade] ?? "#6b7280";
  return (
    <div className="relative flex items-center justify-center">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg width={120} height={120} viewBox="0 0 120 120" className="-rotate-90">
          <circle cx={60} cy={60} r={52} fill="none" stroke="currentColor" strokeWidth={8} className="text-border/40" />
          <circle
            cx={60}
            cy={60}
            r={52}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * (2 * Math.PI * 52)} ${2 * Math.PI * 52}`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold leading-none" style={{ color }}>
            {score}
          </span>
          <span className="text-[10px] text-text-muted">/100</span>
        </div>
      </div>
    </div>
  );
}
