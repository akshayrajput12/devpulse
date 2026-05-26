import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Download,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Folder,
  GitBranch,
  Clock,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { useAuth } from "@/lib/auth";
import { ScoreRingInline } from "@/components/FolderAnalysis/ScoreRing";
import { DirectoryTree, buildTree, parseIdealTree } from "@/components/FolderAnalysis/DirectoryTree";
import { TechStackBadges } from "@/components/FolderAnalysis/VisualStructure";
import { getFolderAnalysis } from "@/lib/folder-analysis.functions";

export const Route = createFileRoute("/folder-analysis_/$id")({
  component: FolderAnalysisDetailPage,
});

const PRIORITY_ORDER = ["critical", "high", "medium", "low"] as const;

const PRIORITY_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", label: "Critical" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", label: "High" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", label: "Medium" },
  low: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", label: "Low" },
};

function ActionCard({ action }: { action: any }) {
  const [open, setOpen] = useState(false);
  const s = PRIORITY_STYLE[action.priority] ?? PRIORITY_STYLE.low;
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden`}>
      <button className="flex w-full items-start gap-3 px-4 py-3.5 text-left" onClick={() => setOpen(o => !o)}>
        <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${s.bg} ${s.text} ${s.border}`}>
          {s.label}
        </span>
        <span className="flex-1 text-sm font-medium text-foreground">{action.action}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-text-muted" /> : <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />}
      </button>
      {open && (
        <div className="border-t border-border/40 px-4 pb-4 pt-2.5 space-y-2.5">
          {action.from_path && (
            <div className="flex gap-2 text-xs">
              <span className="w-12 shrink-0 text-text-muted">From</span>
              <code className="font-mono text-orange-400">{action.from_path}</code>
            </div>
          )}
          {action.to_path && (
            <div className="flex gap-2 text-xs">
              <span className="w-12 shrink-0 text-text-muted">To</span>
              <code className="font-mono text-emerald-400">{action.to_path}</code>
            </div>
          )}
          <div className="flex gap-2 text-xs text-text-muted">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {action.reason}
          </div>
        </div>
      )}
    </div>
  );
}

function exportPDF(analysis: any, actions: any[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const gradeColor: Record<string, string> = { A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
  const color = gradeColor[analysis.grade] ?? "#6b7280";
  const sorted = [...actions].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  );

  win.document.write(`<!DOCTYPE html><html><head><title>DevPulse — ${analysis.repo_full_name} Folder Analysis</title>
  <style>
    *{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:32px;color:#111;line-height:1.5}
    h1{font-size:22px;font-weight:800;margin:0}.meta{color:#666;font-size:12px;margin-top:4px;font-family:monospace}
    .row{display:flex;justify-content:space-between;align-items:flex-start;gap:32px;border-bottom:2px solid #f0f0f0;padding-bottom:20px;margin-bottom:24px}
    .score{font-size:52px;font-weight:800;color:${color};line-height:1}.grade{font-size:13px;font-weight:700;color:${color}}
    h2{font-size:14px;font-weight:700;border-bottom:1px solid #eee;padding-bottom:6px;margin:20px 0 10px}
    ul{margin:0;padding-left:20px}li{font-size:12px;margin:3px 0}
    .action{border:1px solid;border-radius:8px;padding:12px;margin:8px 0;page-break-inside:avoid;display:flex;gap:12px}
    .action.critical{border-color:#fecaca;background:#fef2f2}.action.high{border-color:#fed7aa;background:#fff7ed}
    .action.medium{border-color:#fef08a;background:#fefce8}.action.low{border-color:#bfdbfe;background:#eff6ff}
    .badge{border-radius:999px;padding:2px 8px;font-size:9px;font-weight:800;letter-spacing:.05em;height:fit-content}
    .badge.critical{background:#dc2626;color:#fff}.badge.high{background:#ea580c;color:#fff}
    .badge.medium{background:#ca8a04;color:#fff}.badge.low{background:#2563eb;color:#fff}
    .action strong{font-size:13px;display:block;margin-bottom:4px}
    .action code{font-family:monospace;background:#f5f5f5;padding:1px 4px;border-radius:3px;font-size:11px}
    .action p{font-size:11px;color:#555;margin:2px 0}.italic{color:#888;font-style:italic}
    .tree-box{background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;padding:16px;font-family:monospace;font-size:11px;white-space:pre;overflow:auto}
    .footer{margin-top:40px;border-top:1px solid #eee;padding-top:12px;color:#aaa;font-size:11px}
  </style></head><body>
  <div class="row">
    <div>
      <h1>DevPulse — Folder Structure Report</h1>
      <div class="meta">${analysis.repo_full_name} · ${new Date(analysis.created_at).toLocaleDateString()}</div>
      <div class="meta" style="margin-top:2px">${analysis.stack_detected ?? ""}</div>
    </div>
    <div style="text-align:center">
      <div class="score">${analysis.organization_score}</div>
      <div class="grade">Grade ${analysis.grade} / 100</div>
    </div>
  </div>
  <h2>✅ Strengths</h2><ul>${(analysis.strengths ?? []).map((s: string) => `<li style="color:#059669">${s}</li>`).join("")}</ul>
  <h2>⚠️ Needs Attention</h2><ul>${(analysis.weaknesses ?? []).map((s: string) => `<li style="color:#ca8a04">${s}</li>`).join("")}</ul>
  ${(analysis.critical_issues ?? []).length ? `<h2>🔴 Critical Issues</h2><ul>${(analysis.critical_issues ?? []).map((s: string) => `<li style="color:#dc2626">${s}</li>`).join("")}</ul>` : ""}
  <h2>🗂️ Recommended Structure</h2>
  <div class="tree-box">${analysis.ideal_tree ?? "—"}</div>
  <h2>📋 Migration Plan (${sorted.length} actions)</h2>
  ${sorted.map(a => `
    <div class="action ${a.priority}">
      <span class="badge ${a.priority}">${a.priority.toUpperCase()}</span>
      <div>
        <strong>${a.action}</strong>
        ${a.from_path ? `<p><code>From:</code> ${a.from_path}</p>` : ""}
        ${a.to_path ? `<p><code>To:</code> ${a.to_path}</p>` : ""}
        <p class="italic">${a.reason}</p>
      </div>
    </div>`).join("")}
  <div class="footer">Generated by DevPulse AI · devpulse.app</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function FolderAnalysisDetailPage() {
  const { id } = Route.useParams();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const getFn = useServerFn(getFolderAnalysis);

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");

  // Redirect to login if not authenticated once auth settles
  useEffect(() => {
  }, [authLoading, session, navigate]);

  useEffect(() => {
    if (authLoading) return;
    const token = session?.access_token;
    if (!token) return;

    let cancelled = false;
    let timer: any = null;

    async function fetchData() {
      try {
        const data = await getFn({ data: { id, access_token: token } });
        if (!cancelled) {
          setAnalysis(data.analysis);
          setActions(data.actions);
          setLoading(false);

          if (data.analysis?.status === "complete" || data.analysis?.status === "failed") {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load analysis");
          setLoading(false);
        }
      }
    }

    fetchData();

    // Poll every 3 seconds while pending or processing
    timer = setInterval(() => {
      fetchData();
    }, 3000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [id, authLoading, session?.access_token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="flex items-center justify-center py-32 text-text-muted gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          Loading analysis metadata...
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-lg py-24 text-center space-y-4">
          <XCircle className="mx-auto h-10 w-10 text-red-400" />
          <p className="text-lg font-semibold">{error || "Analysis not found"}</p>
          <Link to="/folder-analysis" className="text-sm text-primary hover:underline">
            ← Back to Folder Analysis
          </Link>
        </div>
      </div>
    );
  }

  // Handle pending or processing state with a premium cyberpunk loader
  if (analysis.status === "pending" || analysis.status === "processing") {
    const isProcessing = analysis.status === "processing";
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-2xl px-6 py-16 space-y-8">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <Folder className="h-5 w-5 animate-pulse" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full bg-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium font-sans tracking-tightest text-foreground">
                    {isProcessing ? "Analyzing Directory Structure" : "Audit Enqueued"}
                  </h2>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">
                    {analysis.repo_full_name} · <span className="text-text-faint">UUID: {analysis.id.slice(0, 8)}</span>
                  </p>
                </div>
              </div>
              <span className="rounded bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-primary animate-pulse uppercase">
                {analysis.status}
              </span>
            </div>

            {/* Cyberpunk progress terminal */}
            <div className="rounded-xl border border-border/60 bg-black/40 p-5 font-mono text-[11px] leading-relaxed text-emerald-400 space-y-2">
              <div className="flex items-center justify-between text-text-faint border-b border-border/20 pb-2 mb-3">
                <span>TERMINAL ACTIVE</span>
                <span>RETRIEVING AUDIT FEED</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-faint">[$]</span>
                <span>Initializing queue execution worker...</span>
                <span className="text-emerald-300">DONE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-faint">[$]</span>
                <span>Claimed background job slot successfully.</span>
                <span className="text-emerald-300">OK</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-faint">[$]</span>
                <span>Loading directory tree ({analysis.file_tree?.length ?? 0} files)...</span>
                <span className="text-emerald-300">LOADED</span>
              </div>
              {isProcessing ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-text-faint">[$]</span>
                    <span className="animate-pulse">Invoking DevPulse AI Slicing Agent...</span>
                    <span className="text-yellow-400 animate-spin">⟳</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-faint">
                    <span>&gt;&gt; Segmenting folders & evaluating package dependencies...</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-faint">
                    <span>&gt;&gt; Searching N+1, folder layout hazards, and component anti-patterns...</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-text-faint">[$]</span>
                  <span>Waiting in background reviews queue for next available worker...</span>
                  <span className="text-yellow-400 animate-pulse">PENDING</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                <span>Generating full Cyber-brutalist structural recommendations. Please wait...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle failure state
  if (analysis.status === "failed") {
    return (
      <div className="min-h-screen bg-bg">
        <AppNav />
        <div className="mx-auto max-w-lg py-24 text-center space-y-6 px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Analysis Execution Failed</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              We encountered an error while analyzing your folder structure.
            </p>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-xs font-mono text-red-300 text-left mt-2 overflow-auto max-h-32">
              {analysis.error_message || "Unknown review processor error."}
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-foreground transition-colors"
            >
              ← Dashboard
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/95 transition-colors"
            >
              Retry Scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fileTree: Array<{ path: string; type: string }> = analysis.file_tree ?? [];
  const annotations = analysis.folder_annotations ?? {};

  const currentNodes = buildTree(fileTree, annotations);
  const idealNodes = analysis.ideal_tree ? parseIdealTree(analysis.ideal_tree) : [];

  const sortedActions = [...actions].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  );
  const filteredActions =
    filterPriority === "all" ? sortedActions : sortedActions.filter(a => a.priority === filterPriority);

  const critCount = actions.filter(a => a.priority === "critical").length;
  const highCount = actions.filter(a => a.priority === "high").length;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <div className="mx-auto max-w-[1320px] px-6 py-8 space-y-6">

        {/* ── Breadcrumb + actions ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/folder-analysis"
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Folder Analysis
            </Link>
            <span className="text-text-muted/40">/</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Folder className="h-4 w-4 text-amber-400" />
              {analysis.repo_full_name}
            </span>
          </div>
          <button
            onClick={() => exportPDF(analysis, actions)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:text-foreground hover:border-primary/40 transition-all"
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>

        {/* ── Score row ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[172px_1fr]">
          {/* Score ring card */}
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/60 py-6 px-4">
            <ScoreRingInline score={analysis.organization_score ?? 0} grade={analysis.grade ?? "C"} />
            <div className="text-center space-y-1">
              <div className="flex items-center gap-1.5 justify-center text-[11px] text-text-muted">
                <GitBranch className="h-3 w-3" />
                <span className="font-mono">{analysis.repo_full_name}</span>
              </div>
              <div className="flex items-center gap-1 justify-center text-[10px] text-text-muted">
                <Clock className="h-3 w-3" />
                {new Date(analysis.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {critCount > 0 && (
                <span className="rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  {critCount} Critical
                </span>
              )}
              {highCount > 0 && (
                <span className="rounded-full bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                  {highCount} High
                </span>
              )}
            </div>
          </div>

          {/* Stack + description */}
          <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
            {analysis.stack_detected && (
              <div>
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Detected Stack
                </p>
                <TechStackBadges detected={analysis.stack_detected} />
              </div>
            )}
            {analysis.ideal_description && (
              <p className="text-sm text-foreground/80 leading-relaxed">{analysis.ideal_description}</p>
            )}
            {(analysis.ideal_key_decisions ?? []).length > 0 && (
              <ul className="space-y-1.5">
                {(analysis.ideal_key_decisions as string[]).map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-muted">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Strengths / Weaknesses / Critical ── */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Strengths</span>
            </div>
            <ul className="space-y-1.5">
              {(analysis.strengths as string[] ?? []).map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/80">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-400">Needs Attention</span>
            </div>
            <ul className="space-y-1.5">
              {(analysis.weaknesses as string[] ?? []).map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/80">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0" />{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">Critical Issues</span>
            </div>
            <ul className="space-y-1.5">
              {(analysis.critical_issues as string[] ?? []).map((s, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground/80">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />{s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Directory tree comparison (side by side) ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Current structure */}
          <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
            <div className="border-b border-border bg-card/60 px-5 py-3">
              <span className="text-sm font-medium text-foreground">Current Structure</span>
              <span className="ml-2 text-xs text-text-muted">{fileTree.length} items</span>
            </div>
            <div className="p-4 h-[550px] flex flex-col">
              <DirectoryTree
                nodes={currentNodes}
                showStatus
                defaultOpen={false}
                label="Repository Structure"
                sublabel={`${fileTree.length} items`}
                borderClass="border-border/60"
              />
            </div>
          </div>

          {/* Ideal structure */}
          <div className="rounded-2xl border border-emerald-500/25 bg-card/30 overflow-hidden">
            <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-5 py-3 flex items-center gap-3">
              <span className="text-sm font-medium text-emerald-400">Ideal Structure</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                Recommended
              </span>
            </div>
            <div className="p-4 h-[550px] flex flex-col">
              {idealNodes.length > 0 ? (
                <DirectoryTree
                  nodes={idealNodes}
                  showStatus={false}
                  defaultOpen={false}
                  label="Production-Ready Structure"
                  sublabel="DevPulse AI recommendation"
                  badge={
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                      Ideal
                    </span>
                  }
                  borderClass="border-emerald-500/30"
                  bgClass="bg-emerald-500/3"
                />
              ) : (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-6 h-full overflow-auto">
                  <pre className="text-[12px] font-mono text-foreground/75 whitespace-pre leading-relaxed h-full">
                    {analysis.ideal_tree ?? "No ideal structure generated"}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Migration plan ── */}
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Migration Plan</h2>
              <p className="text-xs text-text-muted">{sortedActions.length} actions to reach production-ready structure</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["all", "critical", "high", "medium", "low"].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterPriority === p
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-text-muted hover:text-foreground"
                  }`}
                >
                  {p === "all" ? "All" : PRIORITY_STYLE[p]?.label ?? p}
                  {p !== "all" && (
                    <span className="ml-1 opacity-60">
                      ({sortedActions.filter(a => a.priority === p).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {filteredActions.map(action => (
              <ActionCard key={action.id} action={action} />
            ))}
            {filteredActions.length === 0 && (
              <p className="py-8 text-center text-sm text-text-muted">No actions for this priority level.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
