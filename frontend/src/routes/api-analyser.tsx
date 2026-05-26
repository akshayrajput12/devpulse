import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Database,
  ArrowLeft,
  Search,
  ChevronRight,
  Loader2,
  Lock,
  Globe,
  Sparkles,
  FileCode,
  Zap,
  Activity,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUserRepos, getRepoGitTree, createReview } from "@/lib/reviews.functions";
import { useAuth } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { DevPulseLoader } from "@/components/DevPulseLoader";

export const Route = createFileRoute("/api-analyser")({
  component: ApiAnalyserPage,
});

type Repo = {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  description: string | null;
  html_url: string;
};

type GitNode = {
  path: string;
  type: "tree" | "blob";
  size?: number;
};

const API_PATH_PATTERNS = [
  /^(src\/)?(api|routes\/api|server|controllers?|services?|middleware|models?|db|database|repositories?|handlers?)\//i,
  /\.(controller|service|repository|handler|model|schema|migration|query|resolver)\.(ts|js)$/i,
  /\b(postgres|prisma|drizzle|typeorm|sequelize|mongoose|knex|sql)\b/i,
  /^(src\/)?routes?\//i,
];

function selectApiFilesClient(allFiles: string[]): string[] {
  return allFiles.filter(path =>
    API_PATH_PATTERNS.some(pattern => pattern.test(path))
  ).slice(0, 40);
}

const PIPELINE_STEPS = [
  { label: "Fetch Repo Tree", desc: "Map all files in repository" },
  { label: "Auto-Select API Files", desc: "Identify backend & DB patterns" },
  { label: "Parallel Chunk Analysis", desc: "Run Gemini across file batches" },
  { label: "Synthesise Report", desc: "Merge insights into full audit" },
];

function ApiAnalyserPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const getUserReposFn = useServerFn(getUserRepos);
  const getRepoGitTreeFn = useServerFn(getRepoGitTree);
  const createReviewFn = useServerFn(createReview);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [pastedLink, setPastedLink] = useState("");

  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [allFiles, setAllFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [fileSearch, setFileSearch] = useState("");
  const [initiating, setInitiating] = useState(false);
  const [activePipelineStep, setActivePipelineStep] = useState(-1);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const data = await getUserReposFn({ data: { access_token: session.access_token } });
        setRepos(data || []);
      } catch (err: any) {
        setError(err.message || "Could not retrieve repositories. Try reconnecting GitHub.");
      } finally {
        setLoadingRepos(false);
      }
    }
    if (user) load();
  }, [user, getUserReposFn]);

  function parseRepoLink(value: string) {
    const m = value.trim().match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
  }

  async function handleSelectRepo(owner: string, repo: string) {
    setSelectedRepo({ owner, repo });
    setLoadingTree(true);
    setAllFiles([]);
    setSelectedFiles([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getRepoGitTreeFn({
        data: { access_token: session.access_token, owner, repo },
      });

      const filePaths = (data.tree || [])
        .filter((n: GitNode) => n.type === "blob")
        .map((n: GitNode) => n.path);

      setAllFiles(filePaths);

      const autoSelected = selectApiFilesClient(filePaths);
      setSelectedFiles(autoSelected);

      if (autoSelected.length === 0) {
        toast.info("No standard backend file paths detected. Showing all files instead.", { duration: 4000 });
        setSelectedFiles(filePaths.slice(0, 15));
      } else {
        toast.success(`Auto-selected ${autoSelected.length} API/backend files`);
      }
    } catch {
      toast.error("Failed to extract repository structure");
      setSelectedRepo(null);
    } finally {
      setLoadingTree(false);
    }
  }

  function handleOpenRepoLink(e: FormEvent) {
    e.preventDefault();
    const parsed = parseRepoLink(pastedLink);
    if (!parsed) {
      toast.error("Paste a valid GitHub repository URL");
      return;
    }
    handleSelectRepo(parsed.owner, parsed.repo);
  }

  async function handleInitiateAudit() {
    if (!selectedRepo || !user) return;
    setInitiating(true);
    setActivePipelineStep(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const stepTick = (step: number) => setTimeout(() => setActivePipelineStep(step), step * 600);
      [1, 2, 3].forEach(s => stepTick(s));

      let workspaceUrl = `https://github.com/${selectedRepo.owner}/${selectedRepo.repo}/workspace`;
      const params = new URLSearchParams();
      params.set("type", "api");
      if (selectedFiles.length > 0) {
        params.set("files", selectedFiles.join(","));
      }
      workspaceUrl += `?${params.toString()}`;

      const { id: reviewId } = await createReviewFn({
        data: { pr_url: workspaceUrl, access_token: session.access_token, user_id: user.id },
      });

      const auditTitle = `API & Backend Analysis: ${selectedRepo.owner}/${selectedRepo.repo}`;
      await (supabase as any)
        .from("reviews")
        .update({
          repo_owner: selectedRepo.owner,
          repo_name: selectedRepo.repo,
          pr_title: auditTitle,
          review_type: "api_analysis"
        })
        .eq("id", reviewId);

      toast.success("API & Backend Analysis launched!");
      navigate({ to: "/reviews/$id", params: { id: reviewId } });
    } catch (err: any) {
      toast.error(err.message || "Failed to start API audit");
      setInitiating(false);
      setActivePipelineStep(-1);
    }
  }

  function toggleFile(path: string) {
    setSelectedFiles(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path],
    );
  }

  const filteredRepos = repos.filter(
    r =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.full_name.toLowerCase().includes(q.toLowerCase()),
  );

  const filteredFiles = allFiles.filter(f =>
    f.toLowerCase().includes(fileSearch.toLowerCase())
  );

  if (initiating) {
    return (
      <div className="min-h-screen bg-bg flex flex-col font-sans">
        <AppNav />
        <div className="flex-1 flex flex-col justify-center items-center p-6">
          <div className="w-full max-w-md text-center space-y-8">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-2xl bg-orange-500/20 blur-xl animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10">
                <Database className="h-10 w-10 text-orange-400" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium mb-1">Initiating Deep Analysis</h2>
              <p className="text-sm text-text-muted">{selectedRepo?.owner}/{selectedRepo?.repo}</p>
            </div>

            <div className="space-y-2 text-left">
              {PIPELINE_STEPS.map((step, i) => {
                const isActive = activePipelineStep === i;
                const isDone = activePipelineStep > i;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-500 ${
                      isActive
                        ? "border-orange-400/40 bg-orange-400/10"
                        : isDone
                        ? "border-green-500/20 bg-green-500/5"
                        : "border-border bg-bg-elev/30 opacity-40"
                    }`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      isDone ? "bg-green-500/20 text-green-400" : isActive ? "bg-orange-500/20 text-orange-400" : "bg-bg-soft text-text-faint"
                    }`}>
                      {isDone ? <Check className="h-3.5 w-3.5" /> : isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold ${isActive ? "text-orange-300" : isDone ? "text-green-300" : "text-text-faint"}`}>{step.label}</div>
                      <div className="text-[10px] text-text-faint">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-orange-400/70 font-mono tracking-wide">
              ⚡ Parallel pipeline active — processing {selectedFiles.length} files
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-foreground font-sans">
      <AppNav />

      <div className="mx-auto max-w-[1240px] px-6 py-8 space-y-6">
        
        {/* Sleek Breadcrumb / Utility Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-orange-500/30 bg-orange-500/5 px-2.5 py-0.5 text-[11px] font-medium text-orange-400">
              3 credits per scan
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-mono text-primary">
              ⚡ Parallel Engine
            </span>
          </div>
        </div>

        {/* Minimal High-End Hero */}
        <div className="space-y-2">
          <h1 className="text-3xl font-medium tracking-tightest text-foreground font-sans">
            SQL Performance & Concurrency Analyser
          </h1>
          <p className="max-w-3xl text-sm text-text-muted leading-relaxed">
            Run instant Gemini-Pro audits on database locking constraints, transaction paths, N+1 loading latency, and backend route permission gaps.
          </p>
        </div>

        {!selectedRepo ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left: Input Link Portal */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-xl border border-border bg-bg-elev/40 backdrop-blur-md p-5 space-y-4">
                <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Paste Repository Link
                </h2>
                <form onSubmit={handleOpenRepoLink} className="space-y-3">
                  <input
                    value={pastedLink}
                    onChange={e => setPastedLink(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="w-full rounded-md border border-border bg-bg-soft/50 px-3 py-2 text-xs font-mono outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/95 hover:-translate-y-px cursor-pointer"
                  >
                    Load Architecture <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>

              {/* Analysis Vectors Card */}
              <div className="rounded-xl border border-border/60 bg-bg-elev/20 p-5 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Targeted Vectors Mapped</div>
                <div className="space-y-2 text-xs text-text-muted font-sans">
                  <div className="flex items-center gap-2">
                    <span className="text-primary">🗄️</span> SQL N+1 & Missing Indexes
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary">🔒</span> DB Transaction Deadlocks
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary">⚡</span> API Payload Integrity
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary">🔄</span> Race Conditions & Bottlenecks
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Connected Repository Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xs font-semibold tracking-wider uppercase text-text-muted">Connected Repositories</h3>
                <div className="relative w-64 max-w-full">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
                  <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Filter linked repos..."
                    className="w-full rounded-md border border-border bg-bg-elev pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-bg-elev/40 backdrop-blur-md">
                {loadingRepos ? (
                  <div className="flex items-center justify-center gap-2 p-16 text-text-faint">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-mono text-xs">fetching schemas...</span>
                  </div>
                ) : error ? (
                  <div className="p-16 text-center text-xs text-text-muted font-mono">{error}</div>
                ) : filteredRepos.length === 0 ? (
                  <div className="p-16 text-center font-mono text-xs text-text-faint">No repositories connected.</div>
                ) : (
                  <ul className="divide-y divide-border/30">
                    {filteredRepos.map(r => (
                      <li key={r.id}>
                        <button
                          onClick={() => handleSelectRepo(r.owner, r.name)}
                          className="flex w-full items-center justify-between px-5 py-4 transition hover:bg-primary/5 group text-left cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{r.name}</div>
                            <div className="font-mono text-[9px] text-text-faint mt-0.5">{r.owner}</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-text-faint group-hover:text-primary transition-colors" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* Selected repo workspace */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-300">
            
            {/* Sidebar Context Card */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4 shadow-[0_0_40px_-20px_rgba(190,242,100,0.15)]">
                <div>
                  <div className="text-[10px] font-mono text-primary uppercase tracking-widest">Active Scan Target</div>
                  <h2 className="text-base font-semibold truncate mt-0.5">{selectedRepo.owner}/{selectedRepo.repo}</h2>
                </div>

                <div className="border-t border-border/40 pt-4 space-y-2 text-xs font-mono text-text-muted">
                  <div className="flex justify-between">
                    <span>MAPPED API FILES:</span>
                    <span className="text-foreground font-semibold">{selectedFiles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TOTAL MAPPED:</span>
                    <span className="text-text-faint">{loadingTree ? "..." : allFiles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CREDIT CHARGE:</span>
                    <span className="text-primary font-bold">3 credits</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleInitiateAudit}
                    disabled={selectedFiles.length === 0 || loadingTree}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/95 hover:-translate-y-px disabled:opacity-40 disabled:hover:bg-primary disabled:hover:translate-y-0 cursor-pointer"
                  >
                    <Activity className="h-4 w-4 animate-pulse" /> Launch Deep Scan
                  </button>
                  <button
                    onClick={() => setSelectedRepo(null)}
                    disabled={loadingTree}
                    className="w-full text-center text-xs font-mono text-text-muted hover:text-foreground py-1.5 transition cursor-pointer"
                  >
                    ← Change Repository
                  </button>
                </div>
              </div>
            </div>

            {/* Main File Selector Panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold tracking-wider uppercase text-text-muted">Target Backend Files</h3>
                  <p className="text-[11px] text-text-faint mt-0.5">Toggle checkboxes to narrow or broaden the Gemini analysis index.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-text-faint" />
                    <input
                      value={fileSearch}
                      onChange={e => setFileSearch(e.target.value)}
                      placeholder="Filter files..."
                      className="rounded-md border border-border bg-bg-elev pl-7 pr-2.5 py-1 text-[11px] outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  {selectedFiles.length > 0 && (
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="rounded border border-border px-2 py-1 text-[10px] text-text-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {loadingTree ? (
                <div className="flex flex-col items-center justify-center p-20 border border-dashed border-border rounded-xl">
                  <DevPulseLoader size={50} text="Mapping backend architecture files..." />
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border border-border bg-bg-elev/40 backdrop-blur-md max-h-[400px] overflow-y-auto">
                    {filteredFiles.length === 0 ? (
                      <div className="p-12 text-center text-xs font-mono text-text-faint">No files found.</div>
                    ) : (
                      <ul className="divide-y divide-border/20">
                        {filteredFiles.map(filePath => {
                          const isSelected = selectedFiles.includes(filePath);
                          const isAutoApi = API_PATH_PATTERNS.some(p => p.test(filePath));
                          return (
                            <li key={filePath}>
                              <button
                                onClick={() => toggleFile(filePath)}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-primary/5 cursor-pointer ${isSelected ? "bg-primary/[0.02]" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="h-3.5 w-3.5 rounded border-primary/30 text-primary focus:ring-0 cursor-pointer"
                                />
                                <FileCode className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-text-faint"}`} />
                                <span className="font-mono text-xs truncate min-w-0 flex-1 text-text-muted">
                                  {filePath}
                                </span>
                                {isAutoApi && (
                                  <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.25 font-mono text-[7px] text-primary uppercase tracking-widest shrink-0">
                                    API
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elev/20 px-4 py-3 gap-4 flex-wrap">
                    <span className="font-mono text-[10px] text-text-faint">
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected for scanning.
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedFiles(selectApiFilesClient(allFiles))}
                        className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                      >
                        Auto-select API
                      </button>
                      <button
                        onClick={() => setSelectedFiles(allFiles.slice(0, 40))}
                        className="rounded-md border border-border px-2.5 py-1 text-[10px] text-text-muted hover:text-foreground transition-colors cursor-pointer"
                      >
                        Select all (40)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
