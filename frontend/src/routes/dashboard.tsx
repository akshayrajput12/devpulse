import { createFileRoute, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Database, GitPullRequest, Plus, Search, RotateCw, Trash2, HelpCircle, Github, ChevronLeft, ChevronRight, Check, Sparkles, Clock, Activity, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { useAuth } from "@/lib/auth";
import { GithubBrowser } from "@/components/GithubBrowser";
import { toast } from "sonner";
import { DevPulseLoader } from "@/components/DevPulseLoader";

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
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [profile, setProfile] = useState<{
    id: string;
    email: string | null;
    plan: string;
    review_credits: number;
    last_reset_at: string;
    subscription_expires_at: string | null;
    is_admin: boolean;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);

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
    toast.success("Walkthrough guide dismissed. Access it anytime with the '(?) Onboarding Guide' button.");
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
    if (!user) {
      setProfile(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { getUserProfileData } = await import("@/lib/reviews.functions");
        const data = await getUserProfileData({ data: { access_token: session.access_token } });
        if (active) setProfile(data as any);
      } catch (err) {
        console.error("Failed to load profile credits", err);
      }
    })();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("credits") === "true") {
      setShowCreditModal(true);
      // Clean URL without adding history entry after a tiny timeout to avoid React transition collision
      const timer = setTimeout(() => {
        navigate({ to: "/dashboard", replace: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

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
                onClick={() => setShowTour(prev => !prev)}
                className="ml-2 inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
              >
                <HelpCircle className="h-3.5 w-3.5 text-primary" /> Onboarding Guide
              </button>
            </div>
          </div>
          <Link
            to="/reviews/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:-translate-y-px"
          >
            <Plus className="h-4 w-4" /> New review
          </Link>
        </div>

        {/* Onboarding stepper walkthrough guide */}
        {showTour && (
          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6 transition-all duration-200 shadow-sm relative overflow-hidden">
            {/* Visual background accents */}
            <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/10 blur-xl pointer-events-none" />
            
            {/* Top row */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-semibold tracking-tight">Walkthrough Guide for First-time Users</span>
                <span className="rounded bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary">
                  Step {tourStep} of 3
                </span>
              </div>
              <button
                onClick={dismissTour}
                className="text-xs text-text-muted hover:text-foreground font-mono transition-colors font-semibold"
              >
                Dismiss walkthrough
              </button>
            </div>

            {/* Step content */}
            <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
              {/* Stepper Side Icons */}
              <div className="flex flex-col items-center gap-2 md:w-16">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                  tourStep === 1 
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_8px_rgba(190,242,100,0.2)]" 
                    : "border-border bg-bg-elev text-text-muted"
                }`}>
                  <Github className="h-5.5 w-5.5" />
                </div>
                <div className="h-5 w-px bg-border/40" />
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                  tourStep === 2 
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_8px_rgba(190,242,100,0.2)]" 
                    : "border-border bg-bg-elev text-text-muted"
                }`}>
                  <GitPullRequest className="h-5.5 w-5.5" />
                </div>
                <div className="h-5 w-px bg-border/40" />
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                  tourStep === 3 
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_8px_rgba(190,242,100,0.2)]" 
                    : "border-border bg-bg-elev text-text-muted"
                }`}>
                  <Database className="h-5.5 w-5.5" />
                </div>
              </div>

              {/* Step Detail Description */}
              <div className="space-y-4">
                {tourStep === 1 && (
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-foreground">Step 1: Connect your GitHub Account</h3>
                    <p className="text-xs text-text-muted leading-relaxed font-sans">
                      DevPulse integrates directly into your version control system to audit your repositories securely.
                    </p>
                    <ul className="space-y-1.5 text-xs text-text-muted/90 font-mono">
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>Navigate to the <strong>GitHub Repositories</strong> tab below.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>Click <strong>"Configure & Connect Account"</strong> to install our GitHub Integration App.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>Select the repos you want to analyze — both public & private work seamlessly.</span>
                      </li>
                    </ul>
                  </div>
                )}

                {tourStep === 2 && (
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-foreground">Step 2: Automate AI Code & PR Reviews</h3>
                    <p className="text-xs text-text-muted leading-relaxed font-sans">
                      DevPulse acts as an automated security and performance-focused code reviewer on every commit.
                    </p>
                    <ul className="space-y-1.5 text-xs text-text-muted/90 font-mono">
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>Submit a Pull Request on GitHub to trigger audits automatically!</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>Or, click <strong>"New review"</strong> at the top right of this dashboard and paste any PR link.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>Inspect diagnostics and apply suggested code fixes in one click inside reviews.</span>
                      </li>
                    </ul>
                  </div>
                )}

                {tourStep === 3 && (
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-foreground">Step 3: Advanced Structure & API Audits</h3>
                    <p className="text-xs text-text-muted leading-relaxed font-sans">
                      Run specialised, deep architecture analysis and database performance audits on demand.
                    </p>
                    <ul className="space-y-1.5 text-xs text-text-muted/90 font-mono">
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>Open <strong>API & Backend Analyser</strong> to check routes, SQL efficiency, and concurrency lock hazards.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>Click <strong>"Folder Analysis"</strong> in the main navigation to audit directory structures against industry anti-patterns.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>Explore full structural migration checklists to keep code clean and modular.</span>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/20 mt-4 flex-wrap">
                  <button
                    disabled={tourStep === 1}
                    onClick={() => setTourStep(t => Math.max(1, t - 1))}
                    className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 font-mono text-xs text-text-muted hover:text-foreground transition hover:bg-bg-soft disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  {tourStep < 3 ? (
                    <button
                      onClick={() => setTourStep(t => Math.min(3, t + 1))}
                      className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground transition hover:-translate-y-px"
                    >
                      Next Step <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={dismissTour}
                      className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground transition hover:-translate-y-px"
                    >
                      <Check className="h-3.5 w-3.5" /> Finish Walkthrough
                    </button>
                  )}
                  <div className="ml-auto flex gap-1">
                    {[1, 2, 3].map(step => (
                      <button
                        key={step}
                        onClick={() => setTourStep(step)}
                        className={`h-2 w-2 rounded-full transition-all ${tourStep === step ? "bg-primary w-4" : "bg-border/60 hover:bg-text-muted"}`}
                        aria-label={`Go to step ${step}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
            onClick={() => setActiveTab("reviews")} 
            className={`-mb-px px-4 py-2.5 text-sm font-medium transition border-b-2 ${activeTab === "reviews" ? "border-primary text-foreground" : "border-transparent text-text-muted hover:text-foreground"}`}
          >
            Reviews History
          </button>
          <button 
            onClick={() => setActiveTab("github")} 
            className={`-mb-px px-4 py-2.5 text-sm font-medium transition border-b-2 ${activeTab === "github" ? "border-primary text-foreground" : "border-transparent text-text-muted hover:text-foreground"}`}
          >
            GitHub Repositories Full Codebase Audit
          </button>
          <button 
            onClick={() => navigate({ to: "/api-analyser" })} 
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

      {/* Credit Allocation Ledger Dialog Modal */}
      {showCreditModal && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowCreditModal(false)} />
          
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-bg-elev p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-primary mb-0.5">/ credit ledger</div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">My Credit Usage</h2>
              </div>
              <button 
                onClick={() => setShowCreditModal(false)} 
                className="rounded-lg p-1.5 text-text-muted hover:text-foreground hover:bg-bg-soft transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Credit Status Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 rounded-xl border border-border bg-bg-soft/30 flex flex-col justify-center animate-in slide-in-from-left duration-200">
                <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Balance</span>
                <span className="text-3xl font-medium text-orange-400 tracking-tightest font-sans mt-1">
                  {profile.review_credits} <span className="text-xs text-text-muted">credits left</span>
                </span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-bg-soft/30 flex flex-col justify-center animate-in slide-in-from-right duration-200">
                <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Current Plan</span>
                <span className="text-xl font-bold uppercase text-primary mt-1">
                  {profile.plan} plan
                </span>
              </div>
            </div>

            {/* Scrollable ledger logs list */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3 text-[10px] uppercase font-mono text-text-muted">
                <span>Credit transaction history</span>
                <span>{reviews.length} logs</span>
              </div>

              <div className="flex-1 border border-border rounded-xl bg-bg-soft/10 overflow-y-auto divide-y divide-border/30">
                {loadingR ? (
                  <div className="h-32 flex items-center justify-center">
                    <DevPulseLoader />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted">
                    No transactions found. Scan code to use credits.
                  </div>
                ) : (
                  reviews.map((rev) => {
                    let cost = 1;
                    let desc = "PR Review Scanned";
                    if (rev.review_type === "folder_analysis") {
                      cost = 2;
                      desc = "Folder Structure Audit";
                    } else if (rev.review_type === "codebase_audit") {
                      cost = 3;
                      desc = "Deep Codebase Audit";
                    } else if (rev.review_type === "api_analysis") {
                      cost = 3;
                      desc = "API & Backend Analyser";
                    }
                    return (
                      <div key={rev.id} className="p-3.5 flex justify-between items-center gap-4 hover:bg-bg-soft/20 transition-colors">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate max-w-[340px]">
                            {rev.pr_title || "Manual Review"}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-text-faint font-mono">
                            <span>{desc}</span>
                            <span>•</span>
                            <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="font-mono text-xs font-bold text-red-400">
                            -{cost} credits
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 border-t border-border pt-4 flex justify-end">
              <button
                onClick={() => setShowCreditModal(false)}
                className="rounded-lg bg-primary px-5 py-2 text-xs font-mono font-bold text-primary-foreground transition-all duration-200 hover:-translate-y-px cursor-pointer"
              >
                Close Ledger
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
