import { createFileRoute, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Database, GitPullRequest, Plus, Search, RotateCw, Trash2, HelpCircle, Github, ChevronLeft, ChevronRight, Check, Sparkles, Clock, Activity, ShieldAlert, X, User, Zap, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { useAuth } from "@/lib/auth";
import { GithubBrowser } from "@/components/GithubBrowser";
import { toast } from "sonner";
import { OnboardingTour } from "@/components/OnboardingTour";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  validateSearch: (s: Record<string, unknown>): { profile?: string } => ({
    profile: typeof s.profile === "string" ? s.profile : undefined,
  }),
});

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
    targetId: "tour-onboarding-guide-btn",
    title: "1. Interactive Onboarding Guide",
    content: "Welcome to DevPulse! This interactive 10-step guide walks you through automating pull request reviews, auditing backend services, checking folder modularity, and managing code health dashboards.\n\n🖱️ Action on Click: Opens this overlay system to easily understand our workflows.",
    tab: "reviews"
  },
  {
    targetId: "tour-new-review",
    title: "2. Automate Pull Request Reviews",
    content: "Connect repository branch triggers or paste active PR links here. DevPulse reviews code changes automatically, leaving inline comments to catch bugs, design errors, and security hazards.\n\n🖱️ Action on Click: Opens the PR Review panel where you paste a Pull Request URL and run audits.",
    tab: "reviews"
  },
  {
    targetId: "tour-reviews-list",
    title: "3. Complete & Track PR Reviews",
    content: "Track active scans and finished reviews. Each row shows commit status details, date triggers, and direct links to comprehensive diagnostics, modularity scores, and AI-suggested code fixes.\n\n🖱️ Action on Click: Highlights row logs. Clicking a review logs card opens the complete, detailed audit workspace.",
    tab: "reviews"
  },
  {
    targetId: "tour-average-health",
    title: "4. Average Code Health Metrics",
    content: "Every automated PR review calculates a Code Health score out of 100 based on code quality, security vulnerabilities, N+1 query structures, and code modularity hazards.\n\n🖱️ Action on Click: Tracks overall code quality indicators across all of your connected repositories.",
    tab: "reviews"
  },
  {
    targetId: "tour-success-rate",
    title: "5. Code Review Engine Performance",
    content: "Monitors the delivery success rate of our automated review scanner engine, ensuring all commit audits are completed and queued securely.\n\n🖱️ Action on Click: Displays real-time scan statistics to keep operations visible.",
    tab: "reviews"
  },
  {
    targetId: "tour-github-tab",
    title: "6. GitHub Repository Audits",
    content: "Integrate DevPulse with your GitHub accounts. View all connected public and private repositories, and trigger manual audits on any repository branch.\n\n🖱️ Action on Click: Switches to the Connected GitHub Repositories explorer page.",
    tab: "github"
  },
  {
    targetId: "tour-paste-url",
    title: "7. Connect Any Repository Instantly",
    content: "Need to audit a project quickly? Copy and paste any public or private GitHub repository link here to load branch workspaces and start auditing in seconds.\n\n🖱️ Action on Click: Resolves repository URLs to import and open project workspaces instantly.",
    tab: "github"
  },
  {
    targetId: "tour-repos-list",
    title: "8. Connected Repository Workspaces",
    content: "Once connected, your repositories are listed as cards. Clicking any repository opens its dedicated Codebase Workspace where you can run deep scans, browse files, and trigger PR audits.\n\n🖱️ Action on Click: Reveals your connected repositories and lets you navigate directly into their Workspaces.",
    tab: "github"
  },
  {
    targetId: "tour-api-tab",
    title: "9. API & Backend Database Analyzer",
    content: "Switch to this analyzer to scan server routes and DB controllers. It uses Gemini to catch N+1 query loops, missing indices, schema hazards, and concurrency database locks.\n\n🖱️ Action on Click: Programmatically opens API description cards, and redirects to dedicated API Audits.",
    tab: "api"
  },
  {
    targetId: "tour-folder-nav",
    title: "10. Visual Folder Modularity Scans",
    content: "Run structural folder audits. DevPulse analyzes your package layer structures, highlights circular dependencies, and generates modular migration checklists.\n\n🖱️ Action on Click: Directs you to the Folder Analysis dashboard to scan folder couplings and view refactoring steps.",
    tab: "reviews"
  },
  {
    targetId: "tour-profile-menu",
    title: "11. Account Settings & Credit Ledger",
    content: "Hover over your profile to see plan levels and credit resets. Click the 'Settings & Profile' option inside to view details, update your display name, browse your transaction ledger, and change your password.\n\n🖱️ Action on Click: Highlights the account menu dropdown to navigate to settings.",
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
  const search = Route.useSearch();

  const [activeTab, setActiveTab] = useState<"reviews" | "github" | "api">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [findingsBySev, setFindingsBySev] = useState<Record<string, { critical: number; high: number; medium: number; low: number; top: string }>>({});
  const [loadingR, setLoadingR] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sev, setSev] = useState<SevFilter>("all");
  const [liveTick, setLiveTick] = useState(0);

  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Failed to load profile details", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (search.profile === "true") {
      setShowProfileModal(true);
      const timer = setTimeout(() => {
        navigate({ to: "/dashboard", replace: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [search.profile, navigate]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditDisplayName(profile.display_name || "");
    }
  }, [profile, showProfileModal]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDisplayName.trim()) {
      toast.error("Display name cannot be empty.");
      return;
    }
    setUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: editDisplayName.trim(), updated_at: new Date().toISOString() })
        .eq("id", user?.id as string);
      if (error) throw error;
      toast.success("Profile updated successfully!");
      fetchProfile();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const [showTour, setShowTour] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("devpulse_dashboard_tour_seen") !== "true";
    }
    return true;
  });
  const [tourStep, setTourStep] = useState(1);

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
            <h1 className="mt-2 text-3xl font-medium tracking-tightest">Your workspace</h1>
            <div className="mt-2 flex items-center gap-2 font-mono text-xs text-text-faint font-normal">
              <span className={`h-1.5 w-1.5 rounded-full ${activeProcessing > 0 ? "bg-sev-med dp-pulse" : "bg-sev-ok"}`} />
              {activeProcessing > 0
                ? `${activeProcessing} review${activeProcessing > 1 ? "s" : ""} in progress · live`
                : "live · realtime connected"}
              <span className="text-text-faint/60">· {reviews.length} total</span>
              <button
                id="tour-onboarding-guide-btn"
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
          <div id="tour-average-health" className="rounded-xl border border-border bg-bg-elev p-4 flex items-center justify-between">
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

          <div id="tour-success-rate" className="rounded-xl border border-border bg-bg-elev p-4 flex items-center justify-between">
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
            <div id="tour-reviews-list" className="mt-6 overflow-hidden rounded-xl border border-border bg-bg-elev">
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
      <OnboardingTour
        showTour={showTour}
        tourStep={tourStep}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setTourStep={setTourStep}
        dismissTour={dismissTour}
        steps={TOUR_STEPS}
      />

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop (SOLID, dark, translucent overlay without backdrop blur) */}
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowProfileModal(false)} />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-border bg-bg-elev p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Settings & Account</h2>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)} 
                className="rounded-lg p-1.5 text-text-muted hover:text-foreground hover:bg-bg-soft transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body Columns */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-6 overflow-y-auto pr-1">
              {/* Left Column: Identity & Credit Plan Analytics */}
              <div className="space-y-5">
                <div className="rounded-xl border border-border/60 bg-bg-soft/40 p-4 space-y-4">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-muted border-b border-border/40 pb-1.5">User Identity</h3>
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-tr from-primary to-orange-400 font-sans font-bold text-xl text-primary-foreground shadow-lg shrink-0">
                      {profile?.display_name ? profile.display_name.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() || "US"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold text-foreground">
                        {profile?.display_name || "Developer Profile"}
                      </div>
                      <div className="truncate text-xs text-text-muted mt-0.5">
                        {user?.email}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-border/40 pt-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Date Joined:</span>
                      <span className="text-foreground font-medium">
                        {profile?.created_at 
                          ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-bg-soft/40 p-4 space-y-3.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-muted border-b border-border/40 pb-1.5">Status & Plan Matrix</h3>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-muted">Subscription Plan:</span>
                    <span className={`font-sans font-bold text-[10px] px-2 py-0.5 rounded border uppercase ${
                      profile?.plan === "pro" 
                        ? "bg-primary/10 border-primary/20 text-primary" 
                        : "bg-bg-soft border-border text-text-muted"
                    }`}>
                      {profile?.plan || "free"} Plan
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-border/10 pt-2.5">
                    <span className="text-text-muted">Credits Balance:</span>
                    <span className="font-mono font-bold text-sm text-orange-400 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 fill-orange-400/20" />
                      {profile?.review_credits || 0} Credits
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-border/10 pt-2.5">
                    <span className="text-text-muted">Used Scans (Month):</span>
                    <span className="font-mono font-medium text-foreground">
                      {profile?.reviews_used_this_month || 0} Reviews
                    </span>
                  </div>

                  {profile?.plan !== "free" && profile?.subscription_expires_at ? (
                    <div className="flex justify-between items-center text-xs border-t border-border/10 pt-2.5">
                      <span className="text-text-muted">Plan Renewal/Expiry:</span>
                      <span className="font-medium text-foreground">
                        {new Date(profile.subscription_expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs border-t border-border/10 pt-2.5">
                      <span className="text-text-muted">Expiry Schedule:</span>
                      <span className="text-text-faint">Lifetime Free</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start text-xs border-t border-border/10 pt-2.5">
                    <span className="text-text-muted">Next Grant Reset:</span>
                    <div className="text-right">
                      <span className="font-semibold text-primary">
                        +{profile?.plan === "pro" ? "150" : "10"} Credits
                      </span>
                      <div className="text-[9px] text-text-faint mt-0.5">
                        {profile?.last_reset_at 
                          ? new Date(new Date(profile.last_reset_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credit Transaction Ledger Card */}
                <div className="rounded-xl border border-border/60 bg-bg-soft/40 p-4 space-y-3">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-muted border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" /> Credit Ledger
                  </h3>
                  
                  <div className="overflow-y-auto max-h-[160px] divide-y divide-border/30 pr-1 space-y-2">
                    {reviews.length === 0 ? (
                      <div className="text-center py-4 text-xs text-text-faint">
                        No transactions recorded.
                      </div>
                    ) : (
                      reviews.map((rev) => {
                        const cost = rev.review_type === "folder_analysis" ? 2 : (rev.review_type === "codebase_audit" || rev.review_type === "api_analysis") ? 3 : 1;
                        const formattedType = rev.review_type === "folder_analysis" ? "Modularity Scan" : rev.review_type === "codebase_audit" ? "Codebase Audit" : rev.review_type === "api_analysis" ? "API Audit" : "PR Automated Review";
                        return (
                          <div key={rev.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground truncate" title={rev.pr_title || rev.pr_url}>
                                {rev.pr_title || "Manual Scan"}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] text-text-faint mt-0.5 font-mono">
                                <span>{formattedType}</span>
                                <span>•</span>
                                <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] font-bold text-orange-400 shrink-0">
                              -{cost} cr
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Profile Edit & Change Password Form */}
              <div className="space-y-5">
                {/* Profile Edit Form */}
                <form onSubmit={handleUpdateProfile} className="rounded-xl border border-border/60 bg-bg-soft/40 p-4 space-y-4">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-muted border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" /> Edit Profile
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-faint font-semibold uppercase">Email Address</label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ""}
                      className="w-full rounded border border-border bg-bg-soft/30 font-sans text-xs text-text-faint px-3 py-2 outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-faint font-semibold uppercase">Display Name</label>
                    <input
                      type="text"
                      required
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="e.g. Akshay Pratap Singh"
                      className="w-full rounded border border-border bg-bg-soft font-sans text-xs text-foreground px-3 py-2 outline-none focus:border-primary/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="w-full rounded bg-primary text-primary-foreground font-sans text-xs font-semibold px-4 py-2 hover:bg-primary/95 transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {updatingProfile ? "Saving Profile..." : "Save Profile Details"}
                  </button>
                </form>

                {/* Change Password Form */}
                <form onSubmit={handleUpdatePassword} className="rounded-xl border border-border/60 bg-bg-soft/40 p-4 space-y-4">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-muted border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-primary animate-pulse" /> Change Password
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-faint font-semibold uppercase">New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded border border-border bg-bg-soft font-sans text-xs text-foreground px-3 py-2 outline-none focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-faint font-semibold uppercase">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded border border-border bg-bg-soft font-sans text-xs text-foreground px-3 py-2 outline-none focus:border-primary/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="w-full rounded bg-primary text-primary-foreground font-sans text-xs font-semibold px-4 py-2 hover:bg-primary/95 transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {updatingPassword ? "Updating Password..." : "Change Account Password"}
                  </button>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-border pt-4 mt-5">
              <button
                onClick={() => setShowProfileModal(false)}
                className="rounded-lg bg-bg-soft border border-border px-4 py-2 font-sans text-xs font-semibold text-text hover:text-foreground hover:bg-bg-soft/80 transition cursor-pointer"
              >
                Close Settings
              </button>
            </div>

          </div>
        </div>
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
