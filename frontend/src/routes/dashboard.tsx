import { createFileRoute, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Database, GitPullRequest, Plus, Search, RotateCw, Trash2, HelpCircle, Github, ChevronLeft, ChevronRight, Check, Sparkles, Clock, Activity, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { useAuth } from "@/lib/auth";
import { GithubBrowser } from "@/components/GithubBrowser";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

type Review = {
  id: string;
  pr_url: string;
  pr_title: string | null;
  repo_owner: string | null;
  repo_name: string | null;
  pr_number: number | null;
  status: string;
  health_score: number | null;
  created_at: string;
  review_type?: string | null;
};

const TOUR_STEPS = [
  {
    targetId: "tour-new-review",
    title: "1. Automate PR Reviews",
    content: "Click 'New review' to paste any GitHub Pull Request link. DevPulse analyzes your code changes automatically to find bugs, security risks, and optimization options before you merge.",
    tab: "reviews"
  },
  {
    targetId: "tour-github-tab",
    title: "2. Full Codebase Audits",
    content: "Browse and audit your connected GitHub repositories directly. Under this mode, you can select any repo and execute a full codebase audit or scan specific directories.",
    tab: "github"
  },
  {
    targetId: "tour-api-tab",
    title: "3. API & Backend Analyzer",
    content: "Audit your API endpoints and backend services. The analyzer reviews routes and database queries to auto-detect N+1 loops, missing indices, and transaction concurrency hazards.",
    tab: "api"
  },
  {
    targetId: "tour-folder-nav",
    title: "4. Folder Architecture Audits",
    content: "Click 'Folder Analysis' in the top navigation to run structure audits of your directories. It details package layers and dependency flows, generating clean modular checklists.",
    tab: "reviews"
  }
];

type Finding = { review_id: string; severity: string };

type StatusFilter = "all" | "pending" | "processing" | "complete" | "failed";
type SevFilter = "all" | "critical" | "high" | "medium" | "low";

const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"reviews" | "github" | "api">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [findingsBySev, setFindingsBySev] = useState<Record<string, { critical: number; high: number; medium: number; low: number; top: string }>>({});
  const [loadingR, setLoadingR] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sev, setSev] = useState<SevFilter>("all");
  const [liveTick, setLiveTick] = useState(0);

  const [showTour, setShowTour] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("devpulse_dashboard_tour_seen") !== "true";
    }
    return true;
  });
  const [tourStep, setTourStep] = useState(1);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  function dismissTour() {
    setShowTour(false);
    localStorage.setItem("devpulse_dashboard_tour_seen", "true");
    toast.success("Onboarding walkthrough completed! Access it anytime with the '(?) Onboarding Guide' button.");
  }

  const avgHealthScore = useMemo(() => {
    const scored = reviews.filter(r => r.health_score != null);
    if (!scored.length) return null;
    const sum = scored.reduce((acc, r) => acc + (r.health_score ?? 0), 0);
    return Math.round(sum / scored.length);
  }, [reviews]);

  const successRate = useMemo(() => {
    const finished = reviews.filter(r => r.status === "complete" || r.status === "failed");
    if (!finished.length) return null;
    const completed = reviews.filter(r => r.status === "complete");
    return Math.round((completed.length / finished.length) * 100);
  }, [reviews]);

  async function handleDeleteReview(e: React.MouseEvent, reviewId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;
    
    try {
      await supabase.from("findings").delete().eq("review_id", reviewId);
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) throw error;
      toast.success("Review deleted successfully");
    } catch (err: any) {
      console.error("Failed to delete review", err);
      toast.error(err.message || "Failed to delete review");
    }
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!showTour) {
      setTargetRect(null);
      return;
    }
    const updateRect = () => {
      const step = TOUR_STEPS[tourStep - 1];
      if (!step) return;
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    const timer = setTimeout(updateRect, 250);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect);
    };
  }, [showTour, tourStep, activeTab]);

  const handleTourNext = () => {
    if (tourStep < TOUR_STEPS.length) {
      const nextStep = tourStep + 1;
      const stepConfig = TOUR_STEPS[nextStep - 1];
      if (stepConfig.tab && stepConfig.tab !== activeTab) {
        setActiveTab(stepConfig.tab as any);
      }
      setTourStep(nextStep);
    } else {
      dismissTour();
    }
  };

  const handleTourBack = () => {
    if (tourStep > 1) {
      const prevStep = tourStep - 1;
      const stepConfig = TOUR_STEPS[prevStep - 1];
      if (stepConfig.tab && stepConfig.tab !== activeTab) {
        setActiveTab(stepConfig.tab as any);
      }
      setTourStep(prevStep);
    }
  };

  const getPopoverCoordinates = () => {
    if (!targetRect) return { top: 0, left: 0, arrowLeft: 150, show: false, placement: "bottom" };
    
    let placement = "bottom";
    let top = targetRect.bottom + 12;
    let left = targetRect.left + targetRect.width / 2 - 160;
    
    const minPadding = 16;
    if (left < minPadding) left = minPadding;
    if (left + 320 > window.innerWidth - minPadding) left = window.innerWidth - 320 - minPadding;
    
    const popoverHeightEst = 220;
    if (top + popoverHeightEst > window.innerHeight - minPadding) {
      placement = "top";
      top = targetRect.top - popoverHeightEst - 12;
    }

    const targetCenterViewport = targetRect.left + targetRect.width / 2;
    const arrowLeft = targetCenterViewport - left - 6;
    
    return { 
      top, 
      left, 
      arrowLeft: Math.max(12, Math.min(300, arrowLeft)), 
      show: true, 
      placement 
    };
  };

  const popoverPos = getPopoverCoordinates();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) {
          await supabase
            .from("profiles")
            .update({ github_access_token: session.provider_token })
            .eq("id", user.id);
        }
      } catch (err) {
        console.error("Failed to save provider token", err);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      const list = (rows as Review[]) ?? [];
      setReviews(list);
      setLoadingR(false);
 
      if (list.length) {
        const { data: f } = await supabase
          .from("findings")
          .select("review_id,severity")
          .in("review_id", list.map(r => r.id));
        const map: typeof findingsBySev = {};
        for (const row of (f as Finding[] | null) ?? []) {
          const sevK = (row.severity ?? "low").toLowerCase();
          const k = sevK in SEV_ORDER ? sevK : "low";
          const cur = map[row.review_id] ?? { critical: 0, high: 0, medium: 0, low: 0, top: "low" };
          (cur as any)[k] = ((cur as any)[k] ?? 0) + 1;
          if (SEV_ORDER[k] > SEV_ORDER[cur.top]) cur.top = k;
          map[row.review_id] = cur;
        }
        if (!cancelled) setFindingsBySev(map);
      }
    })();

    const ch = supabase
      .channel("dash-reviews")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "reviews", filter: `user_id=eq.${user.id}` },
        (p) => {
          setReviews((prev) => {
            if (p.eventType === "INSERT") return [p.new as Review, ...prev];
            if (p.eventType === "UPDATE") return prev.map(r => r.id === (p.new as Review).id ? (p.new as Review) : r);
            if (p.eventType === "DELETE") return prev.filter(r => r.id !== (p.old as Review).id);
            return prev;
          });
        })
      .subscribe();

    const interval = setInterval(() => setLiveTick(t => t + 1), 30_000);
    return () => { cancelled = true; supabase.removeChannel(ch); clearInterval(interval); };
  }, [user]);

  const activeProcessing = useMemo(() => reviews.filter(r => r.status === "pending" || r.status === "processing").length, [reviews]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return reviews.filter(r => {
      if (status !== "all" && r.status !== status) return false;
      if (sev !== "all") {
        const top = findingsBySev[r.id]?.top;
        if (!top || top !== sev) return false;
      }
      if (!term) return true;
      const hay = `${r.pr_title ?? ""} ${r.repo_owner ?? ""} ${r.repo_name ?? ""} #${r.pr_number ?? ""} ${r.pr_url}`.toLowerCase();
      return hay.includes(term);
    });
  }, [reviews, q, status, sev, findingsBySev]);

  const counts = useMemo(() => ({
    all: reviews.length,
    pending: reviews.filter(r => r.status === "pending").length,
    processing: reviews.filter(r => r.status === "processing").length,
    complete: reviews.filter(r => r.status === "complete").length,
    failed: reviews.filter(r => r.status === "failed").length,
  }), [reviews]);

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="mx-auto max-w-[1240px] px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-primary">/ dashboard</div>
            <h1 className="mt-2 text-3xl font-medium tracking-tightest">Your workspace</h1>
            <div className="mt-2 flex items-center gap-2 font-mono text-xs text-text-faint">
              <span className={`h-1.5 w-1.5 rounded-full ${activeProcessing > 0 ? "bg-sev-med dp-pulse" : "bg-sev-ok"}`} />
              {activeProcessing > 0
                ? `${activeProcessing} review${activeProcessing > 1 ? "s" : ""} in progress · live`
                : "live · realtime connected"}
              <span className="text-text-faint/60">· {reviews.length} total</span>
              <button
                onClick={() => {
                  setTourStep(1);
                  setShowTour(true);
                  setActiveTab("reviews");
                }}
                className="ml-2 inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
              >
                <HelpCircle className="h-3.5 w-3.5 text-primary" /> Onboarding Guide
              </button>
            </div>
          </div>
          <Link
            id="tour-new-review"
            to="/reviews/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:-translate-y-px"
          >
            <Plus className="h-4 w-4" /> New review
          </Link>
        </div>



        {/* Workspace Analytics Metrics Strip */}
        <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg-elev p-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Average Health Score</div>
              <div className="mt-1 text-2xl font-bold font-mono tracking-tight text-foreground">
                {avgHealthScore != null ? (
                  <>
                    <span className={avgHealthScore >= 80 ? "text-sev-ok" : avgHealthScore >= 60 ? "text-sev-med" : "text-sev-crit"}>
                      {avgHealthScore}
                    </span>
                    <span className="text-xs text-text-muted font-normal font-sans"> / 100</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <Activity className="h-8 w-8 text-primary/20 shrink-0" />
          </div>

          <div className="rounded-xl border border-border bg-bg-elev p-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Review Success Rate</div>
              <div className="mt-1 text-2xl font-bold font-mono tracking-tight text-foreground">
                {successRate != null ? (
                  <>
                    <span className="text-primary">{successRate}%</span>
                    <span className="text-[10px] text-text-faint font-normal font-sans"> rate</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <Check className="h-8 w-8 text-sev-ok/20 shrink-0" />
          </div>

          <div className="rounded-xl border border-border bg-bg-elev p-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Automated Review Engine</div>
              <div className="mt-1.5 flex items-center gap-1.5 font-mono text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-sev-ok uppercase">Active & Online</span>
              </div>
            </div>
            <Clock className="h-8 w-8 text-text-muted/20 shrink-0" />
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-8 flex gap-1 border-b border-border-faint">
          <button 
            id="tour-reviews-tab"
            onClick={() => setActiveTab("reviews")} 
            className={`-mb-px px-4 py-2.5 text-sm font-medium transition border-b-2 ${activeTab === "reviews" ? "border-primary text-foreground" : "border-transparent text-text-muted hover:text-foreground"}`}
          >
            Reviews History
          </button>
          <button 
            id="tour-github-tab"
            onClick={() => setActiveTab("github")} 
            className={`-mb-px px-4 py-2.5 text-sm font-medium transition border-b-2 ${activeTab === "github" ? "border-primary text-foreground" : "border-transparent text-text-muted hover:text-foreground"}`}
          >
            GitHub Repositories Full Codebase Audit
          </button>
          <button 
            id="tour-api-tab"
            onClick={() => {
              if (showTour) {
                setActiveTab("api");
              } else {
                navigate({ to: "/api-analyser" });
              }
            }} 
            className={`-mb-px px-4 py-2.5 text-sm font-medium transition border-b-2 flex items-center gap-2 ${activeTab === "api" ? "border-orange-400 text-orange-300" : "border-transparent text-text-muted hover:text-foreground"}`}
          >
            <Database className="h-3.5 w-3.5" /> API & Backend Analyser
          </button>
        </div>

        {activeTab === "reviews" ? (
          <>
            {/* Toolbar */}
            <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by repo, PR title, or number…"
                  className="w-full rounded-md border border-border bg-bg-elev pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary"
                />
              </label>
              <Segmented<StatusFilter>
                value={status}
                onChange={setStatus}
                options={[
                  { v: "all", l: `All`, n: counts.all },
                  { v: "processing", l: `Running`, n: counts.processing + counts.pending },
                  { v: "complete", l: `Done`, n: counts.complete },
                  { v: "failed", l: `Failed`, n: counts.failed },
                ]}
              />
              <Segmented<SevFilter>
                value={sev}
                onChange={setSev}
                options={[
                  { v: "all", l: "Any" },
                  { v: "critical", l: "Crit", c: "text-sev-crit" },
                  { v: "high", l: "High", c: "text-sev-high" },
                  { v: "medium", l: "Med", c: "text-sev-med" },
                  { v: "low", l: "Low", c: "text-sev-low" },
                ]}
              />
            </div>

            {/* List */}
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-bg-elev">
              {loadingR ? (
                <div className="p-10 text-center font-mono text-sm text-text-faint">loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <GitPullRequest className="mx-auto h-8 w-8 text-text-faint" />
                  <div className="mt-3 text-text-muted">
                    {reviews.length === 0 ? "No reviews yet." : "No reviews match your filters."}
                  </div>
                  {reviews.length === 0 ? (
                    <Link to="/reviews/new" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      Submit your first PR <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => { setQ(""); setStatus("all"); setSev("all"); }}
                      className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <RotateCw className="h-3.5 w-3.5" /> Reset filters
                    </button>
                  )}
                </div>
              ) : (
                <ul>
                  {filtered.map((r) => {
                    const fs = findingsBySev[r.id];
                    return (
                      <li key={r.id} className="group relative border-b border-border-faint last:border-b-0">
                        <div className="flex items-center justify-between">
                          <Link
                            to="/reviews/$id"
                            params={{ id: r.id }}
                            className="flex-1 min-w-0 flex items-center gap-4 px-5 py-4 transition hover:bg-bg-soft/30"
                          >
                            <StatusPill status={r.status} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{r.pr_title ?? r.pr_url}</div>
                              <div className="font-mono text-xs text-text-faint">
                                {r.repo_owner ? `${r.repo_owner}/${r.repo_name}#${r.pr_number}` : r.pr_url}
                                <span className="ml-2 text-text-faint/60">· {timeAgo(r.created_at, liveTick)}</span>
                              </div>
                            </div>
                            {fs && (
                              <div className="hidden items-center gap-1.5 font-mono text-[11px] md:flex">
                                {fs.critical > 0 && <Dot c="bg-sev-crit" n={fs.critical} />}
                                {fs.high > 0 && <Dot c="bg-sev-high" n={fs.high} />}
                                {fs.medium > 0 && <Dot c="bg-sev-med" n={fs.medium} />}
                                {fs.low > 0 && <Dot c="bg-sev-low" n={fs.low} />}
                              </div>
                            )}
                            {r.health_score != null && (
                              <div className="font-mono text-sm tabular-nums">
                                <span className="text-text-muted">score </span>{r.health_score}
                              </div>
                            )}
                            <ArrowRight className="h-4 w-4 text-text-faint group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <div className="pr-5 py-4 flex items-center z-10">
                            <button
                              onClick={(e) => handleDeleteReview(e, r.id)}
                              className="p-1.5 rounded border border-transparent text-text-faint hover:text-sev-crit hover:border-sev-crit/25 hover:bg-sev-crit/5 transition duration-150"
                              title="Delete Review"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : activeTab === "github" ? (
          <div className="mt-8">
            <GithubBrowser />
          </div>
        ) : (
          <div className="mt-8">
            {/* API Analyser Hero */}
            <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-400/30 bg-orange-400/10">
                  <Database className="h-5 w-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-orange-400 mb-1">/ api & backend analyser</div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">Deep Backend & SQL Intelligence</h2>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Auto-detects your API routes, controllers, DB queries, and service layers. Runs Gemini AI across all backend files to surface N+1 queries, missing indexes, transaction locks, rate-limiting gaps, and concurrency hazards.
                  </p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { n: "01", title: "Pick a Repo", desc: "Open any connected GitHub repository via the GitHub tab, or use the workspace page directly." },
                { n: "02", title: "Select API & Backend Analyser", desc: "Under Workspace & Codebase Audit, switch to \"API & Backend Analyser\" mode." },
                { n: "03", title: "Review Deep Report", desc: "Get a full SQL performance audit, concurrency report, and load simulation scenarios in minutes." },
              ].map(s => (
                <div key={s.n} className="rounded-xl border border-border bg-bg-elev/60 p-5">
                  <div className="font-mono text-2xl font-bold text-orange-400/30 mb-3">{s.n}</div>
                  <div className="text-sm font-semibold mb-1">{s.title}</div>
                  <p className="text-xs text-text-muted leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link
                to="/api-analyser"
                className="inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-5 py-2.5 text-sm font-medium text-orange-300 transition hover:bg-orange-500/20"
              >
                <Database className="h-4 w-4" /> Open Dedicated API Analyser
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-xs text-text-faint">Click to select a repo or paste a link to start instantly</p>
            </div>

            {/* Recent API analyses from reviews list */}
            {reviews.filter(r => r.pr_title?.startsWith('API &') || r.pr_title?.startsWith('API&')).length > 0 && (
              <div className="mt-8">
                <div className="font-mono text-[11px] uppercase tracking-widest text-text-faint mb-3">Recent API Analyses</div>
                <div className="overflow-hidden rounded-xl border border-border bg-bg-elev">
                  <ul>
                    {reviews.filter(r => r.pr_title?.startsWith('API &') || r.pr_title?.startsWith('API&')).slice(0, 5).map(r => {
                      const fs = findingsBySev[r.id];
                      return (
                        <li key={r.id} className="group border-b border-border-faint last:border-b-0">
                          <Link to="/reviews/$id" params={{ id: r.id }} className="flex items-center gap-4 px-5 py-4 transition hover:bg-bg-soft/30">
                            <StatusPill status={r.status} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{r.pr_title ?? r.pr_url}</div>
                              <div className="font-mono text-xs text-text-faint">{r.repo_owner}/{r.repo_name} · {timeAgo(r.created_at, liveTick)}</div>
                            </div>
                            {r.health_score != null && <div className="font-mono text-sm tabular-nums"><span className="text-text-muted">score </span>{r.health_score}</div>}
                            <ArrowRight className="h-4 w-4 text-text-faint" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Walkthrough Tour Overlay */}
      {showTour && popoverPos.show && (
        <>
          {/* Backdrop Overlay */}
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] transition-all" />

          {/* Glowing Spotlight Focus Ring */}
          {targetRect && (
            <div 
              className="fixed z-[101] rounded-lg pointer-events-none transition-all duration-300 border-[3px] border-primary shadow-[0_0_20px_#bef264,0_0_0_9999px_rgba(0,0,0,0.65)] animate-in fade-in duration-200"
              style={{
                top: targetRect.top - 6,
                left: targetRect.left - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
              }}
            />
          )}

          {/* Floating Explanatory Popover Card */}
          <div 
            className="fixed z-[102] w-[320px] rounded-2xl border border-primary/30 bg-[#121214] p-5 shadow-2xl font-sans animate-in zoom-in-95 duration-200 text-foreground"
            style={{
              top: popoverPos.top,
              left: popoverPos.left,
            }}
          >
            {/* Small arrow pointing to target */}
            {popoverPos.placement === "bottom" ? (
              <div 
                className="absolute h-3 w-3 rotate-45 bg-[#121214] border-l border-t border-primary/30"
                style={{
                  top: -6,
                  left: popoverPos.arrowLeft,
                }}
              />
            ) : (
              <div 
                className="absolute h-3 w-3 rotate-45 bg-[#121214] border-r border-b border-primary/30"
                style={{
                  bottom: -6,
                  left: popoverPos.arrowLeft,
                }}
              />
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3.5">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Onboarding Guide
              </span>
              <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">
                Step {tourStep} of {TOUR_STEPS.length}
              </span>
            </div>

            {/* Body Content */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-tight text-white">
                {TOUR_STEPS[tourStep - 1]?.title}
              </h3>
              <p className="text-[11px] text-text-muted leading-relaxed font-sans font-normal">
                {TOUR_STEPS[tourStep - 1]?.content}
              </p>
            </div>

            {/* Navigation Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <button
                onClick={dismissTour}
                className="text-[10px] text-text-faint hover:text-foreground font-mono transition-colors font-semibold uppercase tracking-wider bg-transparent border-0 cursor-pointer"
              >
                Skip Guide
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  disabled={tourStep === 1}
                  onClick={handleTourBack}
                  className="rounded border border-border px-2.5 py-1.5 font-mono text-[10px] text-text-muted hover:text-foreground transition hover:bg-bg-soft disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleTourNext}
                  className="rounded bg-primary px-3 py-1.5 font-mono text-[10px] font-bold text-primary-foreground transition hover:opacity-90 cursor-pointer"
                >
                  {tourStep === TOUR_STEPS.length ? "Finish" : "Next Step"}
                </button>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

function Dot({ c, n }: { c: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-bg-soft px-1.5 py-0.5 text-text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${c}`} />{n}
    </span>
  );
}

function Segmented<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string; n?: number; c?: string }[];
}) {
  return (
    <div className="flex items-center rounded-md border border-border bg-bg-elev p-0.5 text-xs font-medium">
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded px-2.5 py-1.5 transition ${value === o.v ? "bg-bg-soft text-foreground" : `text-text-muted hover:text-foreground ${o.c ?? ""}`}`}
        >
          {o.l}{o.n != null && <span className="ml-1 font-mono text-text-faint">{o.n}</span>}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const m: Record<string, { c: string; l: string; pulse?: boolean }> = {
    pending: { c: "text-text-faint", l: "queued" },
    processing: { c: "text-sev-med", l: "running", pulse: true },
    complete: { c: "text-sev-ok", l: "done" },
    failed: { c: "text-sev-crit", l: "failed" },
  };
  const s = m[status] ?? m.pending;
  return (
    <span className={`inline-flex w-20 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider ${s.c}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${s.pulse ? "dp-pulse" : ""}`}
        style={{ backgroundColor: "currentColor" }}
      />
      {s.l}
    </span>
  );
}

function timeAgo(iso: string, _tick: number) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
