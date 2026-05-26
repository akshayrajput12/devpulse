import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  GitPullRequest,
  ArrowRight,
  ShieldAlert,
  Search,
  Folder,
  FolderOpen,
  File,
  FileCode,
  ChevronRight,
  ChevronDown,
  FolderGit2,
  Database,
  Code2,
  Zap,
  Activity,
  RefreshCw,
  ExternalLink,
  Layers,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getRepoPullRequests, getRepoGitTree, createReview } from "@/lib/reviews.functions";
import { analyzeFolderStructure } from "@/lib/folder-analysis.functions";
import { useAuth } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { DevPulseLoader } from "@/components/DevPulseLoader";

export const Route = createFileRoute("/workspace/$owner/$repo")({
  component: WorkspacePage,
});

type GitNode = {
  path: string;
  type: "tree" | "blob";
  size?: number;
};

type RepoTreeNode = GitNode & {
  name: string;
  children: RepoTreeNode[];
};

type PullRequest = {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: string;
  created_at: string;
};

function sortTree(nodes: GitNode[]): GitNode[] {
  return [...nodes].sort((a, b) => {
    const ap = a.path.split("/");
    const bp = b.path.split("/");
    const min = Math.min(ap.length, bp.length);
    for (let i = 0; i < min; i++) {
      if (ap[i] !== bp[i]) {
        const ad = i < ap.length - 1 || a.type === "tree";
        const bd = i < bp.length - 1 || b.type === "tree";
        if (ad !== bd) return ad ? -1 : 1;
        return ap[i].localeCompare(bp[i]);
      }
    }
    return ap.length - bp.length;
  });
}

function buildRepoTree(nodes: GitNode[]): RepoTreeNode[] {
  const root: RepoTreeNode[] = [];
  const map = new Map<string, RepoTreeNode>();
  for (const node of sortTree(nodes)) {
    const parts = node.path.split("/");
    const name = parts[parts.length - 1];
    const item: RepoTreeNode = { ...node, name, children: [] };
    map.set(node.path, item);
    const parentPath = parts.slice(0, -1).join("/");
    const parent = map.get(parentPath);
    if (parent) parent.children.push(item);
    else root.push(item);
  }
  return root;
}

function WorkspacePage() {
  const { owner, repo } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"prs" | "workspace" | "folders">("prs");
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loadingPrs, setLoadingPrs] = useState(true);
  const [repoTree, setRepoTree] = useState<GitNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [reviewingPrId, setReviewingPrId] = useState<number | null>(null);
  const [auditingCodebase, setAuditingCodebase] = useState(false);
  const [auditingFolders, setAuditingFolders] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const getRepoPrsFn = useServerFn(getRepoPullRequests);
  const getRepoGitTreeFn = useServerFn(getRepoGitTree);
  const createReviewFn = useServerFn(createReview);
  const analyzeFolderStructureFn = useServerFn(analyzeFolderStructure);

  const fullName = `${owner}/${repo}`;

  useEffect(() => {
    async function loadPrs() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const data = await getRepoPrsFn({
          data: { access_token: session.access_token, owner, repo },
        });
        setPrs(data || []);
      } catch {
        toast.error("Failed to load pull requests");
      } finally {
        setLoadingPrs(false);
      }
    }
    loadPrs();
  }, [owner, repo]);

  async function loadTree() {
    if (treeLoaded || loadingTree) return;
    setLoadingTree(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getRepoGitTreeFn({
        data: { access_token: session.access_token, owner, repo },
      });
      setRepoTree(sortTree(data.tree || []));
      setTreeLoaded(true);
    } catch {
      toast.error("Failed to load repository tree");
    } finally {
      setLoadingTree(false);
    }
  }

  function handleTabSwitch(t: "prs" | "workspace" | "folders") {
    setTab(t);
    if (t === "workspace" || t === "folders") loadTree();
  }

  async function handleAuditFolders() {
    if (!user) return;
    setAuditingFolders(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let treeToSend = repoTree;
      if (selectedFiles.length > 0) {
        const selectedPathsSet = new Set<string>();
        for (const f of selectedFiles) {
          selectedPathsSet.add(f);
          const parts = f.split("/");
          for (let i = 1; i < parts.length; i++) {
            selectedPathsSet.add(parts.slice(0, i).join("/"));
          }
        }
        treeToSend = repoTree.filter(node => selectedPathsSet.has(node.path));
      }

      const fileTreePayload = treeToSend.map(n => ({
        path: n.path,
        type: n.type,
      }));

      const res = await analyzeFolderStructureFn({
        data: {
          access_token: session.access_token,
          repo_full_name: `${owner}/${repo}`,
          file_tree: fileTreePayload,
        },
      });

      toast.success("Folder structure audit enqueued successfully!");
      navigate({ to: "/folder-analysis/$id", params: { id: res.id } });
    } catch (err: any) {
      toast.error(err.message || "Failed to start folder structure audit");
    } finally {
      setAuditingFolders(false);
    }
  }

  function handleToggleFile(path: string) {
    setSelectedFiles(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path],
    );
  }

  function handleToggleFolder(folderPath: string) {
    const childPaths = repoTree
      .filter(n => n.type === "blob" && (n.path === folderPath || n.path.startsWith(folderPath + "/")))
      .map(n => n.path);
    setSelectedFiles(prev => {
      const allSel = childPaths.length > 0 && childPaths.every(p => prev.includes(p));
      return allSel
        ? prev.filter(p => !childPaths.includes(p))
        : [...prev, ...childPaths.filter(p => !prev.includes(p))];
    });
  }

  async function handleReviewPr(prUrl: string, prId: number) {
    if (!user) return;
    setReviewingPrId(prId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { id: reviewId } = await createReviewFn({
        data: { pr_url: prUrl, access_token: session.access_token, user_id: user.id },
      });
      toast.success("Review initiated!");
      navigate({ to: "/reviews/$id", params: { id: reviewId } });
    } catch (err: any) {
      toast.error(err.message || "Failed to start review");
    } finally {
      setReviewingPrId(null);
    }
  }

  async function handleAuditCodebase() {
    if (!user) return;
    setAuditingCodebase(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let workspaceUrl = `https://github.com/${owner}/${repo}/workspace`;
      const params = new URLSearchParams();
      if (selectedFiles.length > 0) params.set("files", selectedFiles.join(","));
      if ([...params].length > 0) workspaceUrl += `?${params.toString()}`;

      const { id: reviewId } = await createReviewFn({
        data: { pr_url: workspaceUrl, access_token: session.access_token, user_id: user.id },
      });

      const auditTitle = selectedFiles.length > 0 ? `Selective Audit (${selectedFiles.length} files)` : "Full Codebase Audit";

      await (supabase as any)
        .from("reviews")
        .update({ repo_owner: owner, repo_name: repo, pr_title: auditTitle, review_type: "codebase_audit" })
        .eq("id", reviewId);


      toast.success("Codebase audit initiated!");
      navigate({ to: "/reviews/$id", params: { id: reviewId } });
    } catch (err: any) {
      toast.error(err.message || "Failed to start audit");
    } finally {
      setAuditingCodebase(false);
    }
  }

  function TreeNodes({ nodes, depth = 0 }: { nodes: RepoTreeNode[]; depth?: number }) {
    return (
      <>
        {nodes.map(node => {
          const isDir = node.type === "tree";
          const isOpen = expandedNodes[node.path] ?? depth < 1;
          const childPaths = repoTree
            .filter(n => n.type === "blob" && (n.path === node.path || n.path.startsWith(node.path + "/")))
            .map(n => n.path);
          const isSelected = selectedFiles.includes(node.path);
          const folderAllSel = childPaths.length > 0 && childPaths.every(p => selectedFiles.includes(p));
          const folderPartial = !folderAllSel && childPaths.some(p => selectedFiles.includes(p));

          return (
            <div key={node.path}>
              <div
                className="group flex min-h-8 items-center gap-2 border-b border-border/30 px-2 text-xs hover:bg-bg-soft/40"
                style={{ paddingLeft: 8 + depth * 16 }}
              >
                <button
                  type="button"
                  onClick={() => isDir && setExpandedNodes(prev => ({ ...prev, [node.path]: !isOpen }))}
                  className="flex h-5 w-5 items-center justify-center text-text-muted"
                >
                  {isDir ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : null}
                </button>
                <input
                  type="checkbox"
                  checked={isDir ? folderAllSel : isSelected}
                  ref={el => { if (el) el.indeterminate = isDir && folderPartial; }}
                  onChange={() => isDir ? handleToggleFolder(node.path) : handleToggleFile(node.path)}
                  className="h-3.5 w-3.5 rounded border-border bg-bg-elev text-primary focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() =>
                    isDir
                      ? setExpandedNodes(prev => ({ ...prev, [node.path]: !isOpen }))
                      : handleToggleFile(node.path)
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left font-mono text-text-muted group-hover:text-foreground"
                >
                  {isDir
                    ? isOpen
                      ? <FolderOpen className="h-4 w-4 shrink-0 text-amber-400" />
                      : <Folder className="h-4 w-4 shrink-0 text-amber-400" />
                    : node.name.match(/\.(ts|tsx|js|jsx|py|go|rs|java)$/)
                      ? <FileCode className="h-4 w-4 shrink-0 text-blue-400" />
                      : <File className="h-4 w-4 shrink-0 text-text-faint" />}
                  <span className="truncate">{node.name}</span>
                  {isDir && <span className="text-[10px] text-text-faint">/</span>}
                </button>
                {node.size != null && node.type === "blob" && (
                  <span className="hidden font-mono text-[10px] text-text-faint sm:inline">
                    {node.size > 1024 ? `${Math.round(node.size / 1024)} KB` : `${node.size} B`}
                  </span>
                )}
              </div>
              {isDir && isOpen && node.children.length > 0 && (
                <TreeNodes nodes={node.children} depth={depth + 1} />
              )}
            </div>
          );
        })}
      </>
    );
  }

  const filterQuery = workspaceSearch.toLowerCase();
  const filteredTree = filterQuery
    ? repoTree.filter(n => n.path.toLowerCase().includes(filterQuery))
    : repoTree;

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary border border-primary/20">
              {repo[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">{fullName}</h1>
              <a
                href={`https://github.com/${fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-text-muted hover:text-foreground transition-colors flex items-center gap-1"
              >
                github.com/{fullName}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full border border-blue-500/20 bg-blue-500/5 px-2.5 py-0.5 text-[10px] font-mono text-blue-300 hidden sm:block">
              ⚡ Parallel Engine Active
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border gap-1">
          <button
            onClick={() => handleTabSwitch("prs")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "prs"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-text-muted hover:text-foreground"
            }`}
          >
            <GitPullRequest className="h-4 w-4" />
            Pull Request Review
            {!loadingPrs && (
              <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[10px] font-bold">
                {prs.length}
              </span>
            )}
            <span className="rounded-full border border-border bg-bg-elev/60 px-1.5 py-0.5 text-[9px] font-mono text-text-faint ml-1">
              1 credit
            </span>
          </button>

          <button
            onClick={() => handleTabSwitch("workspace")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "workspace"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-text-muted hover:text-foreground"
            }`}
          >
            <Code2 className="h-4 w-4" />
            Full Codebase Audit
            <span className="rounded-full border border-border bg-bg-elev/60 px-1.5 py-0.5 text-[9px] font-mono text-text-faint ml-1">
              3 credits
            </span>
          </button>

          <button
            onClick={() => handleTabSwitch("folders")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "folders"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-text-muted hover:text-foreground"
            }`}
          >
            <Folder className="h-4 w-4 text-amber-400" />
            Folder Structure Audit
            <span className="rounded-full border border-border bg-bg-elev/60 px-1.5 py-0.5 text-[9px] font-mono text-text-faint ml-1">
              2 credits
            </span>
          </button>
        </div>

        {/* ── PR Tab ── */}
        {tab === "prs" && (
          <div className="space-y-4">
            {/* PR Tab header card */}
            <div className="flex items-start gap-4 rounded-xl border border-border bg-bg-elev/40 px-4 py-3">
              <GitPullRequest className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Inline PR Review</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Runs DevPulse AI across the PR diff. Surfaces bugs, security issues, and performance regressions with inline line comments and suggested fixes.
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-[10px] font-mono text-text-faint">costs</span>
                <span className="rounded border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">1 credit</span>
              </div>
            </div>

            {/* Pipeline badge */}
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/15 bg-blue-500/5 px-3 py-2 text-[11px] font-mono text-blue-300">
              <Zap className="h-3.5 w-3.5" />
              High-Efficiency Parallel Slicing Engine: imports + ±40 line context windows for 80–95% token savings
            </div>

            {loadingPrs ? (
              <div className="flex items-center justify-center py-16">
                <DevPulseLoader size={60} text="Loading pull requests…" />
              </div>
            ) : prs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <GitPullRequest className="h-10 w-10 text-text-faint mb-3" />
                <p className="text-sm font-semibold text-text-muted">No open pull requests</p>
                <p className="mt-1 text-xs text-text-faint max-w-sm">
                  All PRs are merged or closed. Use Full Codebase Audit to scan the full repository — no open PR needed.
                </p>
                <button
                  onClick={() => handleTabSwitch("workspace")}
                  className="mt-4 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/15 transition-colors"
                >
                  <ShieldAlert className="h-4 w-4" /> Audit Codebase
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {prs.map(pr => (
                  <li
                    key={pr.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-bg-elev/60 px-4 py-3.5 transition hover:border-primary/30 hover:bg-bg-elev"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4 shrink-0 text-green-400" />
                        <span className="truncate text-sm font-medium">{pr.title}</span>
                        <span className="font-mono text-[10px] text-text-faint shrink-0">#{pr.number}</span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-text-faint">
                        by @{pr.user} · {new Date(pr.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted hover:text-foreground transition-colors"
                      >
                        View PR
                      </a>
                      <button
                        onClick={() => handleReviewPr(pr.html_url, pr.id)}
                        disabled={reviewingPrId !== null}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20 disabled:opacity-50"
                      >
                        {reviewingPrId === pr.id ? (
                          <>
                            <DevPulseLoader size={16} text="" />
                            <span className="ml-1">Initiating…</span>
                          </>
                        ) : (
                          <>
                            Review PR <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Workspace / Codebase Audit Tab ── */}
        {tab === "workspace" && (
          <div className="space-y-4">
            {/* Header card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-bg-elev/50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
                  <Layers className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold font-sans">Full Codebase Audit</p>
                    <span className="rounded border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[9px] font-mono text-accent font-semibold">3 credits</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1 max-w-[55ch]">
                    Deep DevPulse AI analysis of your entire codebase. No open PR required. Optionally select specific files below for a targeted scan.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAuditCodebase}
                disabled={auditingCodebase}
                className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary hover:bg-primary/95 hover:-translate-y-px text-primary-foreground px-5 py-3 font-sans text-xs font-semibold tracking-wider uppercase transition shadow-md disabled:opacity-60 cursor-pointer shrink-0 w-full sm:w-auto"
              >
                {auditingCodebase ? (
                  <DevPulseLoader size={14} text="" />
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 mr-1 fill-primary-foreground text-primary-foreground animate-pulse" />
                    Audit Complete Codebase
                  </>
                )}
              </button>
            </div>

            {/* Engine pipeline badge */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/15 bg-blue-500/5 px-3 py-2.5">
              <Zap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="text-[11px] font-mono text-blue-300">High-Efficiency Parallel Slicing Engine</span>
              <span className="text-[10px] text-text-faint">—</span>
              <span className="text-[11px] text-text-faint">Files chunked with imports + ±40 line context for 80–95% token savings and rapid parallel synthesis</span>
            </div>

            {/* API Analyser CTA */}
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Database className="h-5 w-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-200">Need SQL, API & Concurrency Analysis?</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Use the dedicated <strong>API & Backend Analyser</strong> for targeted DB query audit, N+1 detection, race conditions, and load simulation reports.
                </p>
              </div>
              <Link
                to="/api-analyser"
                className="inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-300 hover:bg-orange-500/20 transition-colors shrink-0"
              >
                <Database className="h-4 w-4" /> API & Backend Analyser
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {loadingTree ? (
              <div className="flex items-center justify-center py-16">
                <DevPulseLoader size={72} text="Indexing repository tree…" />
              </div>
            ) : !treeLoaded || repoTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                <FolderGit2 className="h-8 w-8 text-text-faint mb-3" />
                <p className="text-sm text-text-muted">Could not load repository contents.</p>
                <button
                  onClick={loadTree}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-faint" />
                  <input
                    type="text"
                    placeholder="Search files by name or path…"
                    value={workspaceSearch}
                    onChange={e => setWorkspaceSearch(e.target.value)}
                    className="w-full rounded-lg border border-border/40 bg-bg-elev/40 py-2 pl-8 pr-4 font-mono text-xs text-foreground placeholder:text-text-faint focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Tree */}
                <div className="max-h-[480px] overflow-y-auto rounded-xl border border-border/40 bg-bg-elev/40">
                  <div className="sticky top-0 flex items-center justify-between border-b border-border/40 bg-bg-elev px-3 py-2 text-[10px] uppercase tracking-wider text-text-faint z-10">
                    <span>{fullName}</span>
                    <span>{filteredTree.filter(n => n.type === "blob").length} files</span>
                  </div>
                  {filteredTree.length === 0 ? (
                    <div className="py-8 text-center font-mono text-xs text-text-faint">
                      No files match your search
                    </div>
                  ) : (
                    <TreeNodes nodes={buildRepoTree(filteredTree)} />
                  )}
                </div>

                {/* Action bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-bg-elev/40 px-4 py-3">
                  <div>
                    <p className="font-mono text-[10px] text-text-faint">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""} selected for targeted audit`
                        : "No selection — full codebase will be audited"}
                    </p>
                    {selectedFiles.length > 0 && (
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="font-mono text-[10px] text-text-faint hover:text-foreground transition-colors mt-0.5"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleAuditCodebase}
                    disabled={auditingCodebase}
                    className="relative inline-flex items-center gap-2 overflow-hidden rounded-lg border border-accent/20 bg-accent text-accent-foreground px-5 py-2.5 font-mono text-sm font-semibold shadow transition hover:bg-accent/90 disabled:opacity-60 group"
                  >
                    {auditingCodebase ? (
                      <DevPulseLoader size={18} text="" />
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4 animate-pulse text-red-400" />
                        {selectedFiles.length > 0
                          ? `Audit ${selectedFiles.length} Selected Files`
                          : "Audit Complete Codebase"}
                        <span className="font-mono text-[10px] opacity-70 ml-1">(3 credits)</span>
                      </>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Folder Structure Audit Tab ── */}
        {tab === "folders" && (
          <div className="space-y-4">
            {/* Header card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-bg-elev/50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Folder className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold font-sans">Folder Structure & Architecture Audit</p>
                    <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-mono text-amber-400 font-semibold">2 credits</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1 max-w-[55ch]">
                    Generates a comprehensive analysis of your codebase folder tree. Surfaces architecture anti-patterns, stack dependencies, and provides a clear proposed migration path.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAuditFolders}
                disabled={auditingFolders}
                className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-amber-500 hover:bg-amber-500/90 text-black px-5 py-3 font-sans text-xs font-semibold tracking-wider uppercase transition shadow-md disabled:opacity-60 cursor-pointer shrink-0 w-full sm:w-auto font-semibold"
              >
                {auditingFolders ? (
                  <DevPulseLoader size={14} text="" />
                ) : (
                  <>
                    <Folder className="h-3.5 w-3.5 mr-1 fill-black text-black" />
                    Audit Folder Structure
                  </>
                )}
              </button>
            </div>

            {/* Engine pipeline badge */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/15 bg-blue-500/5 px-3 py-2.5">
              <Zap className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="text-[11px] font-mono text-blue-300">High-Efficiency Parallel Slicing Engine</span>
              <span className="text-[10px] text-text-faint">—</span>
              <span className="text-[11px] text-text-faint">Fast parallel schema processing, automated structure mapping, and sub-10s synthesis</span>
            </div>

            {loadingTree ? (
              <div className="flex items-center justify-center py-16">
                <DevPulseLoader size={72} text="Indexing repository tree…" />
              </div>
            ) : !treeLoaded || repoTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                <FolderGit2 className="h-8 w-8 text-text-faint mb-3" />
                <p className="text-sm text-text-muted">Could not load repository contents.</p>
                <button
                  onClick={loadTree}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-faint" />
                  <input
                    type="text"
                    placeholder="Search files/folders by name or path…"
                    value={workspaceSearch}
                    onChange={e => setWorkspaceSearch(e.target.value)}
                    className="w-full rounded-lg border border-border/40 bg-bg-elev/40 py-2 pl-8 pr-4 font-mono text-xs text-foreground placeholder:text-text-faint focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Tree */}
                <div className="max-h-[480px] overflow-y-auto rounded-xl border border-border/40 bg-bg-elev/40">
                  <div className="sticky top-0 flex items-center justify-between border-b border-border/40 bg-bg-elev px-3 py-2 text-[10px] uppercase tracking-wider text-text-faint z-10">
                    <span>{fullName}</span>
                    <span>{filteredTree.filter(n => n.type === "blob").length} files</span>
                  </div>
                  {filteredTree.length === 0 ? (
                    <div className="py-8 text-center font-mono text-xs text-text-faint">
                      No files match your search
                    </div>
                  ) : (
                    <TreeNodes nodes={buildRepoTree(filteredTree)} />
                  )}
                </div>

                {/* Action bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/40 bg-bg-elev/40 px-4 py-3">
                  <div>
                    <p className="font-mono text-[10px] text-text-faint">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""} selected for targeted audit`
                        : "No selection — full directory tree will be audited"}
                    </p>
                    {selectedFiles.length > 0 && (
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="font-mono text-[10px] text-text-faint hover:text-foreground transition-colors mt-0.5"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleAuditFolders}
                    disabled={auditingFolders}
                    className="relative inline-flex items-center gap-2 overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 px-5 py-2.5 font-mono text-sm font-semibold border border-amber-500/30 shadow transition hover:bg-amber-500/20 disabled:opacity-60 group"
                  >
                    {auditingFolders ? (
                      <DevPulseLoader size={18} text="" />
                    ) : (
                      <>
                        <Folder className="h-4 w-4 text-amber-400 shrink-0" />
                        {selectedFiles.length > 0
                          ? `Audit Selected Folders (${selectedFiles.length} files)`
                          : "Audit Entire Folder Structure"}
                        <span className="font-mono text-[10px] opacity-70 ml-1">(2 credits)</span>
                      </>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
