import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, type FormEvent } from "react";
import {
  Search,
  FolderTree,
  Download,
  RefreshCw,
  Lock,
  Globe,
  Star,
  GitFork,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  LayoutGrid,
  History,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  GitBranch,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { useAuth } from "@/lib/auth";
import { AnimatedLog, mergeStep, type LogStep } from "@/components/AnimatedLog";
import { DirectoryTree, buildTree, parseIdealTree } from "@/components/FolderAnalysis/DirectoryTree";
import { TechStackBadges } from "@/components/FolderAnalysis/VisualStructure";
import { ScoreRingInline } from "@/components/FolderAnalysis/ScoreRing";
import { getUserRepos, getRepoGitTree } from "@/lib/reviews.functions";
import type { FolderAnalysisResult } from "@/backend/ai/orchestrator";
import {
  analyzeFolderStructure,
  saveFolderAnalysis,
  listFolderAnalyses,
  deleteFolderAnalysis,
} from "@/lib/folder-analysis.functions";

export const Route = createFileRoute("/folder-analysis")({
  component: FolderAnalysisPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Repo = {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  description: string | null;
  html_url: string;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  updated_at?: string;
};

type HistoryItem = {
  id: string;
  repo_full_name: string;
  organization_score: number | null;
  grade: string | null;
  status: string;
  created_at: string;
  share_token: string;
};

type PageState = "idle" | "picking" | "loading" | "done" | "error";

const PRIORITY_ORDER = ["critical", "high", "medium", "low"] as const;
const PRIORITY_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", label: "Critical" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", label: "High" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", label: "Medium" },
  low: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", label: "Low" },
};

const LANG_COLOR: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572A5", Rust: "#dea584",
  Go: "#00ADD8", Java: "#b07219", Ruby: "#701516", "C#": "#178600", "C++": "#f34b7d",
  CSS: "#563d7c", HTML: "#e34c26", Swift: "#fa7343", Kotlin: "#A97BFF",
};

const GRADE_COLOR: Record<string, string> = { A: "text-emerald-400", B: "text-blue-400", C: "text-yellow-400", D: "text-orange-400", F: "text-red-400" };

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function parseGithubRepoLink(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/github\.com\/([^/]+)\/([^/?#]+)(?:[/?#]|$)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
}

// ─── Repo card ────────────────────────────────────────────────────────────────

function RepoCard({ repo, selected, onClick }: { repo: Repo; selected: boolean; onClick: () => void }) {
  const lc = LANG_COLOR[repo.language ?? ""] ?? "#666";
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-px hover:shadow-md ${
        selected ? "border-primary bg-primary/8 shadow-[0_0_0_1px_hsl(var(--primary))]" : "border-border bg-card/60 hover:border-border/80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {repo.private ? <Lock className="h-3 w-3 text-text-muted shrink-0" /> : <Globe className="h-3 w-3 text-text-muted shrink-0" />}
            <span className="truncate text-sm font-semibold text-foreground">{repo.name}</span>
          </div>
          {repo.description && (
            <p className="mt-1 line-clamp-2 text-[11px] text-text-muted leading-relaxed">{repo.description}</p>
          )}
        </div>
        {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-text-muted">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: lc }} /> {repo.language}
          </span>
        )}
        {(repo.stargazers_count ?? 0) > 0 && (
          <span className="flex items-center gap-1"><Star className="h-2.5 w-2.5" /> {repo.stargazers_count}</span>
        )}
        {(repo.forks_count ?? 0) > 0 && (
          <span className="flex items-center gap-1"><GitFork className="h-2.5 w-2.5" /> {repo.forks_count}</span>
        )}
        <span className="ml-auto">{timeAgo(repo.updated_at)}</span>
      </div>
    </button>
  );
}

// ─── History item ─────────────────────────────────────────────────────────────

function HistoryCard({
  item,
  onDelete,
}: {
  item: HistoryItem;
  onDelete: (id: string) => void;
}) {
  const gc = GRADE_COLOR[item.grade ?? ""] ?? "text-text-muted";
  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 transition-all hover:border-primary/40 hover:bg-card/70 hover:shadow-sm">
      <Link
        to="/folder-analysis/$id"
        params={{ id: item.id }}
        className="absolute inset-0 rounded-xl"
        aria-label={`View analysis for ${item.repo_full_name}`}
      />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-bg/60">
        <span className={`text-base font-bold leading-none ${gc}`}>{item.grade ?? "?"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{item.repo_full_name}</p>
        <p className="text-[10px] text-text-muted">
          Score {item.organization_score ?? "—"}/100 · {timeAgo(item.created_at)}
        </p>
      </div>
      <div className="relative z-10 flex items-center gap-1.5">
        <ExternalLink className="h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-60" />
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
          className="rounded-lg border border-transparent p-1.5 text-text-muted hover:border-red-500/30 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Action card ──────────────────────────────────────────────────────────────

function ActionCard({ action }: { action: FolderAnalysisResult["migration_actions"][number] }) {
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
        <div className="border-t border-border/40 px-4 pb-4 pt-2.5 space-y-2">
          {action.from && (
            <div className="flex gap-2 text-xs">
              <span className="w-10 shrink-0 text-text-muted">From</span>
              <code className="font-mono text-orange-400">{action.from}</code>
            </div>
          )}
          {action.to && (
            <div className="flex gap-2 text-xs">
              <span className="w-10 shrink-0 text-text-muted">To</span>
              <code className="font-mono text-emerald-400">{action.to}</code>
            </div>
          )}
          <div className="flex gap-2 text-xs text-text-muted">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />{action.reason}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PDF export ───────────────────────────────────────────────────────────────

function exportPDF(result: FolderAnalysisResult, label: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const gradeColor: Record<string, string> = { A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
  const c = gradeColor[result.grade] ?? "#6b7280";
  const sorted = [...result.migration_actions].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority as any) - PRIORITY_ORDER.indexOf(b.priority as any),
  );
  win.document.write(`<!DOCTYPE html><html><head><title>DevPulse — ${label}</title>
  <style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:32px;color:#111;line-height:1.5}
  .row{display:flex;justify-content:space-between;align-items:flex-start;gap:32px;border-bottom:2px solid #eee;padding-bottom:20px;margin-bottom:24px}
  h1{font-size:20px;font-weight:800;margin:0}.meta{color:#666;font-size:12px;font-family:monospace}
  .score{font-size:52px;font-weight:800;color:${c};line-height:1}.grade{font-size:13px;font-weight:700;color:${c}}
  h2{font-size:14px;font-weight:700;border-bottom:1px solid #eee;padding-bottom:5px;margin:20px 0 10px}
  ul{margin:0;padding-left:18px}li{font-size:12px;margin:3px 0}
  .action{border:1px solid;border-radius:8px;padding:12px;margin:8px 0;page-break-inside:avoid;display:flex;gap:12px}
  .action.critical{border-color:#fecaca;background:#fef2f2}.action.high{border-color:#fed7aa;background:#fff7ed}
  .action.medium{border-color:#fef08a;background:#fefce8}.action.low{border-color:#bfdbfe;background:#eff6ff}
  .badge{border-radius:999px;padding:2px 8px;font-size:9px;font-weight:800;letter-spacing:.05em}
  .badge.critical{background:#dc2626;color:#fff}.badge.high{background:#ea580c;color:#fff}
  .badge.medium{background:#ca8a04;color:#fff}.badge.low{background:#2563eb;color:#fff}
  .action strong{font-size:13px;display:block;margin-bottom:4px}
  .action p{font-size:11px;color:#555;margin:2px 0}.action code{font-family:monospace;background:#f5f5f5;padding:1px 4px;border-radius:3px}
  .italic{color:#888;font-style:italic}.tree{background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;padding:16px;font-family:monospace;font-size:11px;white-space:pre;overflow:auto}
  .footer{margin-top:40px;border-top:1px solid #eee;padding-top:12px;color:#aaa;font-size:11px}</style></head><body>
  <div class="row"><div><h1>DevPulse Folder Structure Report</h1><div class="meta">${label}</div></div>
  <div style="text-align:center"><div class="score">${result.organization_score}</div><div class="grade">Grade ${result.grade} / 100</div></div></div>
  <h2>✅ Strengths</h2><ul>${result.current_analysis.strengths.map(s => `<li style="color:#059669">${s}</li>`).join("")}</ul>
  <h2>⚠️ Needs Attention</h2><ul>${result.current_analysis.weaknesses.map(s => `<li style="color:#ca8a04">${s}</li>`).join("")}</ul>
  ${result.current_analysis.critical_issues.length ? `<h2>🔴 Critical</h2><ul>${result.current_analysis.critical_issues.map(s => `<li style="color:#dc2626">${s}</li>`).join("")}</ul>` : ""}
  <h2>🗂️ Ideal Structure</h2><div class="tree">${result.ideal_structure.tree}</div>
  <h2>📋 Migration Plan</h2>${sorted.map(a => `<div class="action ${a.priority}"><span class="badge ${a.priority}">${a.priority.toUpperCase()}</span><div><strong>${a.action}</strong>${a.from ? `<p><code>From:</code> ${a.from}</p>` : ""}${a.to ? `<p><code>To:</code> ${a.to}</p>` : ""}<p class="italic">${a.reason}</p></div></div>`).join("")}
  <div class="footer">Generated by DevPulse AI · ${new Date().toLocaleDateString()}</div></body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ─── Main page ────────────────────────────────────────────────────────────────

function FolderAnalysisPage() {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>("idle");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [logSteps, setLogSteps] = useState<LogStep[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<FolderAnalysisResult | null>(null);
  const [rawItems, setRawItems] = useState<Array<{ path: string; type: string }>>([]);
  const [repoLabel, setRepoLabel] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const getUserReposFn = useServerFn(getUserRepos);
  const getRepoGitTreeFn = useServerFn(getRepoGitTree);
  const analyzeFolderStructureFn = useServerFn(analyzeFolderStructure);
  const saveAnalysisFn = useServerFn(saveFolderAnalysis);
  const listAnalysesFn = useServerFn(listFolderAnalyses);
  const deleteAnalysisFn = useServerFn(deleteFolderAnalysis);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Auto-load history when session becomes available
  useEffect(() => {
    if (session?.access_token) loadHistory();
  }, [session?.access_token]);

  async function loadHistory() {
    if (!session?.access_token) return;
    setHistoryLoading(true);
    try {
      const items = await listAnalysesFn({ data: { access_token: session.access_token, limit: 20 } });
      setHistory((items as any[]) ?? []);
    } catch {
      // silently ignore
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openRepoPicker() {
    setState("picking");
    if (repos.length === 0) {
      setReposLoading(true);
      setReposError("");
      try {
        const data = await getUserReposFn({ data: { access_token: session!.access_token } });
        setRepos((data as any[]) ?? []);
      } catch (e: any) {
        setReposError(e?.message ?? "Failed to load repos");
      } finally {
        setReposLoading(false);
      }
    }
  }

  const emitStep = useCallback((update: Partial<LogStep> & { id: string }) => {
    setLogSteps(prev => mergeStep(prev, update));
  }, []);

  async function runLinkAnalysis(e?: FormEvent) {
    e?.preventDefault();
    const parsed = parseGithubRepoLink(repoLink);
    if (!parsed) {
      toast.error("Paste a valid GitHub repository URL");
      return;
    }

    const repo: Repo = {
      id: -Date.now(),
      owner: parsed.owner,
      name: parsed.repo,
      full_name: `${parsed.owner}/${parsed.repo}`,
      private: false,
      description: null,
      html_url: `https://github.com/${parsed.owner}/${parsed.repo}`,
    };
    setSelectedRepo(repo);
    await runAnalysis(repo);
  }

  async function runAnalysis(repo: Repo) {
    if (!session?.access_token) return;
    setState("loading");
    setError("");
    setResult(null);
    setRawItems([]);
    setSavedId(null);
    setRepoLabel(repo.full_name);
    setLogSteps([
      { id: "connect", label: "Connecting to repository", status: "active", startedAt: Date.now() },
      { id: "triage", label: "Filtering boilerplate & generated files", status: "pending" },
      { id: "analyze", label: "Analyzing architecture & structure", status: "pending" },
      { id: "recommend", label: "Building migration plan", status: "pending" },
      { id: "save", label: "Saving analysis", status: "pending" },
    ]);

    try {
      // Fetch tree
      const treeData = await getRepoGitTreeFn({
        data: { owner: repo.owner, repo: repo.name, access_token: session.access_token },
      });
      const items: Array<{ path: string; type: string }> = treeData.tree ?? [];
      setRawItems(items);
      emitStep({ id: "connect", status: "done", detail: `${items.length} files and directories fetched`, finishedAt: Date.now() });
      emitStep({ id: "triage", status: "active", startedAt: Date.now() });

      emitStep({ id: "triage", status: "done", detail: "Backend triage complete", finishedAt: Date.now() });
      emitStep({ id: "analyze", status: "active", startedAt: Date.now() });

      const resultData = await analyzeFolderStructureFn({
        data: {
          access_token: session.access_token,
          repo_full_name: repo.full_name,
          file_tree: items,
        },
      });

      emitStep({ id: "analyze", status: "done", detail: "Analysis task enqueued", finishedAt: Date.now() });
      emitStep({ id: "recommend", status: "done", detail: "Background worker scheduled", finishedAt: Date.now() });
      emitStep({ id: "save", status: "done", detail: `Record initialized: ${resultData.id.slice(0, 8)}...`, finishedAt: Date.now() });

      toast.success("Folder structure analysis has been enqueued in the background!");
      
      // Refresh history list
      loadHistory();

      // Navigate to the detail page which polls for updates
      navigate({ to: "/folder-analysis/$id", params: { id: resultData.id } });
    } catch (e: any) {
      setError(e?.message ?? "Analysis failed. Please try again.");
      setState("error");
      emitStep({ id: "analyze", status: "error", detail: e?.message });
    }
  }

  async function handleDelete(id: string) {
    if (!session?.access_token) return;
    if (!window.confirm("Delete this analysis?")) return;
    try {
      await deleteAnalysisFn({ data: { id, access_token: session.access_token } });
      setHistory(h => h.filter(i => i.id !== id));
      toast.success("Analysis deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  }

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description ?? "").toLowerCase().includes(repoSearch.toLowerCase()),
  );

  const sortedActions = result
    ? [...(result.migration_actions ?? [])].sort(
        (a, b) => PRIORITY_ORDER.indexOf(a.priority as any) - PRIORITY_ORDER.indexOf(b.priority as any),
      )
    : [];
  const filteredActions =
    filterPriority === "all" ? sortedActions : sortedActions.filter(a => a.priority === filterPriority);

  const critCount = sortedActions.filter(a => a.priority === "critical").length;
  const highCount = sortedActions.filter(a => a.priority === "high").length;

  const currentNodes = result && rawItems.length
    ? buildTree(rawItems, result.folder_annotations)
    : [];
  const idealNodes = result?.ideal_structure.tree ? parseIdealTree(result.ideal_structure.tree) : [];

  if (loading) return null;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <div className="mx-auto max-w-[1320px] px-6 py-8 space-y-6">

        {/* ── Header ── */}
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <FolderTree className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Folder Structure</h1>
            </div>
            <p className="max-w-lg text-sm text-text-muted">
              Analyze your repository architecture and generate a production-ready structure comparison.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <button
                onClick={() => exportPDF(result, repoLabel)}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:text-foreground hover:border-primary/40 transition-all"
              >
                <Download className="h-4 w-4" /> Export PDF
              </button>
            )}
          </div>
        </div>

        {(historyLoading || history.length > 0) && (
          <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-text-muted" />
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Recent Analyses
              </p>
              {history.length > 0 && (
                <span className="rounded-full bg-border px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
                  {history.length}
                </span>
              )}
            </div>
            {historyLoading ? (
              <div className="flex items-center gap-2 py-4 text-text-muted text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
              </div>
            ) : (
              history.map(item => (
                <HistoryCard key={item.id} item={item} onDelete={handleDelete} />
              ))
            )}
          </div>
        )}

        {state === "idle" && (
          <div className="rounded-2xl border border-border bg-card/40 p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-bg-soft">
                  <FolderTree className="h-6 w-6 text-primary" />
                </div>
                <p className="text-lg font-semibold text-foreground/90">Analyze repository structure</p>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-muted">
                  Paste a GitHub repository link or browse your connected GitHub account. DevPulse maps the current tree, scores it, and creates a production-ready migration plan.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={openRepoPicker}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:-translate-y-px"
                  >
                    <LayoutGrid className="h-4 w-4" /> Browse repositories
                  </button>
                  <a
                    href="#recent"
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-text-muted transition hover:text-foreground"
                  >
                    <History className="h-4 w-4" /> Recent analyses
                  </a>
                </div>
              </div>

              <form onSubmit={runLinkAnalysis} className="rounded-xl border border-border bg-bg/70 p-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Repository URL
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-bg-elev px-3 py-2 transition focus-within:border-primary">
                  <GitBranch className="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    value={repoLink}
                    onChange={e => setRepoLink(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-text-faint"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Analyze from link <ExternalLink className="h-4 w-4" />
                </button>
                <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
                  Public repos work directly. Private repos need your connected GitHub account.
                </p>
              </form>
            </div>
          </div>
        )}
        {/* ── Repo browser ── */}
        {state === "picking" && (
          <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Your Repositories</h2>
              <button onClick={() => setState("idle")} className="text-sm text-text-muted hover:text-foreground">
                Cancel
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={repoSearch}
                onChange={e => setRepoSearch(e.target.value)}
                placeholder="Search repositories..."
                className="w-full rounded-xl border border-border bg-bg pl-9 pr-4 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
            </div>
            <form onSubmit={runLinkAnalysis} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-bg/60 p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <GitBranch className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  value={repoLink}
                  onChange={e => setRepoLink(e.target.value)}
                  placeholder="Or paste https://github.com/owner/repo"
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-text-faint"
                />
              </div>
              <button className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15">
                Analyze link
              </button>
            </form>
            {reposLoading && (
              <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading repositories...</span>
              </div>
            )}
            {reposError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
                <XCircle className="h-4 w-4 shrink-0" /> {reposError}
              </div>
            )}
            {!reposLoading && !reposError && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 max-h-[480px] overflow-y-auto pr-1">
                {filteredRepos.map(repo => (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    selected={selectedRepo?.id === repo.id}
                    onClick={() => { setSelectedRepo(repo); runAnalysis(repo); }}
                  />
                ))}
                {filteredRepos.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm text-text-muted">
                    No repositories match "{repoSearch}"
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Analysis log ── */}
        {(state === "loading" || (state === "done" && logSteps.length > 0)) && (
          <div className="space-y-3">
            {selectedRepo && state === "loading" && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                  {selectedRepo.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedRepo.full_name}</p>
                  <p className="text-xs text-text-muted">Analysis in progress</p>
                </div>
              </div>
            )}
            <AnimatedLog
              steps={logSteps}
              title={state === "done" ? "Analysis complete" : "DevPulse is reviewing your structure"}
            />
            {savedId && state === "done" && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-400">
                  Analysis saved.{" "}
                  <Link to="/folder-analysis/$id" params={{ id: savedId }} className="underline font-semibold">
                    View permanent link →
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {state === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <XCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
            <button
              onClick={() => { setState("idle"); setLogSteps([]); }}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}

        {/* ── Results ── */}
        {result && state === "done" && (
          <div className="space-y-5">

            {/* Score + overview */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[172px_1fr]">
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card/60 py-6 px-4">
                <ScoreRingInline score={result.organization_score} grade={result.grade} />
                <p className="text-[10px] font-mono text-text-muted text-center">{repoLabel}</p>
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

              <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">Detected Stack</p>
                  <TechStackBadges detected={result.stack_detected} />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{result.ideal_structure.description}</p>
                {result.ideal_structure.key_decisions?.length > 0 && (
                  <ul className="space-y-1.5">
                    {result.ideal_structure.key_decisions.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-muted">
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" /> {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Strengths / Weaknesses / Critical */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { title: "Strengths", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, items: result.current_analysis.strengths, dot: "bg-emerald-400", cls: "border-emerald-500/20 bg-emerald-500/5", tcls: "text-emerald-400" },
                { title: "Needs Attention", icon: <AlertTriangle className="h-4 w-4 text-yellow-400" />, items: result.current_analysis.weaknesses, dot: "bg-yellow-400", cls: "border-yellow-500/20 bg-yellow-500/5", tcls: "text-yellow-400" },
                { title: "Critical Issues", icon: <XCircle className="h-4 w-4 text-red-400" />, items: result.current_analysis.critical_issues, dot: "bg-red-400", cls: "border-red-500/20 bg-red-500/5", tcls: "text-red-400" },
              ].map(card => (
                <div key={card.title} className={`rounded-2xl border ${card.cls} p-4`}>
                  <div className="mb-3 flex items-center gap-2">
                    {card.icon}
                    <span className={`text-sm font-semibold ${card.tcls}`}>{card.title}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {card.items.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs text-foreground/80">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${card.dot} shrink-0`} />{s}
                      </li>
                    ))}
                    {!card.items.length && <li className="text-xs text-text-muted italic">None identified</li>}
                  </ul>
                </div>
              ))}
            </div>

            {/* Directory tree comparison (side by side) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Current structure */}
              <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
                <div className="border-b border-border bg-card/60 px-5 py-3">
                  <span className="text-sm font-medium text-foreground">Current Structure</span>
                  <span className="ml-2 text-xs text-text-muted">{rawItems.length} items</span>
                </div>
                <div className="p-4 h-[550px] flex flex-col">
                  <DirectoryTree
                    nodes={currentNodes}
                    showStatus
                    defaultOpen={false}
                    label="Repository Structure"
                    sublabel={`${rawItems.length} items`}
                    borderClass="border-border/60"
                  />
                </div>
              </div>

              {/* Ideal structure */}
              <div className="rounded-2xl border border-emerald-500/25 bg-card/30 overflow-hidden">
                <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-5 py-3 flex items-center gap-3">
                  <span className="text-sm font-medium text-emerald-400">Ideal Structure</span>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                    AI Recommended
                  </span>
                </div>
                <div className="p-4 h-[550px] flex flex-col">
                  {idealNodes.length > 0 ? (
                    <DirectoryTree
                      nodes={idealNodes}
                      showStatus={false}
                      defaultOpen={false}
                      label="Production-Ready Structure"
                      sublabel="Recommended by DevPulse"
                      badge={
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                          Ideal
                        </span>
                      }
                      borderClass="border-emerald-500/30"
                      bgClass="bg-emerald-500/3"
                    />
                  ) : (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5 h-full overflow-auto">
                      <pre className="text-[12px] font-mono text-foreground/75 whitespace-pre h-full">
                        {result.ideal_structure.tree}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Migration plan */}
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
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPriority === p ? "bg-primary text-primary-foreground" : "border border-border text-text-muted hover:text-foreground"}`}
                    >
                      {p === "all" ? "All" : PRIORITY_STYLE[p]?.label ?? p}
                      {p !== "all" && <span className="ml-1 opacity-60">({sortedActions.filter(a => a.priority === p).length})</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {filteredActions.map((action, i) => <ActionCard key={i} action={action} />)}
                {filteredActions.length === 0 && (
                  <p className="py-8 text-center text-sm text-text-muted">No actions for this priority.</p>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={openRepoPicker}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-text-muted hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" /> Analyze another repository
              </button>
              {savedId && (
                <Link
                  to="/folder-analysis/$id"
                  params={{ id: savedId }}
                  className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/8 px-4 py-2 text-sm text-primary hover:bg-primary/12 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" /> View permanent link
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
