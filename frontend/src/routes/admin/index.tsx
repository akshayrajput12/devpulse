import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getAdminMetrics, getAdminSettings, updateAdminSettings } from "./-admin.functions";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import {
  AnimatedIconsStyles,
  DashboardIcon,
  UsersIcon,
  ReviewIcon,
  ActivityIcon,
  AlertTriangleIcon,
  GeminiIcon,
  OpenAIIcon,
  DualSystemIcon,
  ShieldIcon,
  CompassIcon,
  SettingsIcon,
} from "@/components/AnimatedIcons";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

type Metrics = {
  usersCount: number;
  reviewsCount: number;
  failedCount: number;
  pendingQueueCount: number;
  avgScore: number;
};

type RecentReview = {
  id: string;
  pr_title: string | null;
  pr_url: string;
  status: string;
  created_at: string;
  health_score: number | null;
  repo_owner: string | null;
  repo_name: string | null;
};

function AdminOverview() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai" | "both">("both");
  const [parallelEnabled, setParallelEnabled] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const fetchMetrics = async () => {
    if (!session?.access_token) return;
    try {
      const [res, settingsRes] = await Promise.all([
        getAdminMetrics({ data: { access_token: session.access_token } }),
        getAdminSettings({ data: { access_token: session.access_token } }).catch((err) => {
          console.error("Failed to load AI settings:", err);
          return { ai_provider: "both", parallel_engine_enabled: true };
        }),
      ]);
      setMetrics(res.metrics);
      setRecentReviews(res.recentReviews);
      if (settingsRes && settingsRes.ai_provider) {
        setAiProvider(settingsRes.ai_provider as "gemini" | "openai" | "both");
      }
      if (settingsRes && settingsRes.parallel_engine_enabled !== undefined) {
        setParallelEnabled(settingsRes.parallel_engine_enabled);
      }
    } catch (e: any) {
      console.error("Failed to load admin metrics:", e);
      toast.error(e.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProvider = async (provider: "gemini" | "openai" | "both") => {
    if (!session?.access_token) return;
    setUpdatingSettings(true);
    try {
      const res = await updateAdminSettings({
        data: {
          access_token: session.access_token,
          ai_provider: provider,
        },
      });
      if (res && res.ok) {
        setAiProvider(provider);
        toast.success(`AI updated to ${provider.toUpperCase()}`);
      }
    } catch (e: any) {
      console.error("Failed to update AI Orchestrator:", e);
      toast.error(e.message || "Failed to update AI settings");
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleUpdateParallel = async (enabled: boolean) => {
    if (!session?.access_token) return;
    setUpdatingSettings(true);
    try {
      const res = await updateAdminSettings({
        data: {
          access_token: session.access_token,
          parallel_engine_enabled: enabled,
        },
      });
      if (res && res.ok) {
        setParallelEnabled(enabled);
        toast.success(`Speed Booster ${enabled ? "ON" : "OFF"}`);
      }
    } catch (e: any) {
      console.error("Failed to update Parallel Slicing settings:", e);
      toast.error(e.message || "Failed to update scanner speed settings");
    } finally {
      setUpdatingSettings(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [session]);

  if (loading || !metrics) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <DevPulseLoader />
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Accounts",
      value: metrics.usersCount,
      desc: "Total user accounts",
      icon: UsersIcon,
      color: "text-blue-400 border-blue-400/20 bg-blue-400/5",
    },
    {
      title: "Reviews Conducted",
      value: metrics.reviewsCount,
      desc: "Total generated reviews",
      icon: ReviewIcon,
      color: "text-primary border-primary/20 bg-primary/5",
    },
    {
      title: "Active Queue Backlog",
      value: metrics.pendingQueueCount,
      desc: "Reviews waiting in queue",
      icon: ActivityIcon,
      color: "text-amber-400 border-amber-400/20 bg-amber-400/5",
    },
    {
      title: "Review Fail Rate",
      value: metrics.failedCount,
      desc: `${metrics.reviewsCount ? Math.round((metrics.failedCount / metrics.reviewsCount) * 100) : 0}% failure rate`,
      icon: AlertTriangleIcon,
      color: "text-red-400 border-red-400/20 bg-red-400/5",
    },
  ];

  return (
    <div className="space-y-8 pb-12 font-sans">
      <AnimatedIconsStyles />

      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-text-muted">/ admin / overview</div>
          <h1 className="text-3xl font-medium tracking-tightest mt-1 text-foreground font-sans">Admin Overview</h1>
          <p className="text-xs text-text-muted mt-1 leading-relaxed font-sans">
            Manage AI settings, view stats, and check recent reviews.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-border bg-bg-soft/40 px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-text-muted">Status:</span>
          <span className="text-primary font-semibold">Online</span>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          let label = card.title;
          let desc = card.desc;
          if (card.title === "Total Accounts") { label = "Registered Users"; desc = "Total developer accounts"; }
          else if (card.title === "Reviews Conducted") { label = "Total Reviews"; desc = "Total generated reviews"; }
          else if (card.title === "Active Queue Backlog") { label = "Queue Size"; desc = "Reviews waiting in queue"; }
          else if (card.title === "Review Fail Rate") { label = "Failed Reviews"; desc = `${metrics.reviewsCount ? Math.round((metrics.failedCount / metrics.reviewsCount) * 100) : 0}% failure rate`; }

          return (
            <div
              key={card.title}
              className={`rounded-xl border p-5 flex items-start justify-between transition-all duration-200 hover:scale-[1.01] hover:border-primary/20 ${card.color}`}
            >
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  {label}
                </span>
                <div className="text-3xl font-medium tracking-tightest font-sans">{card.value}</div>
                <p className="text-[10px] text-text-muted/80 leading-none">{desc}</p>
              </div>
              <div className="p-2 bg-background/40 rounded-lg border border-border/40">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main AI OS Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Orchestrator Controller */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Orchestrator Controls */}
          <div className="rounded-xl border border-border bg-bg-elev p-6 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary font-semibold">
                  <SettingsIcon className="h-3.5 w-3.5 text-primary" /> AI Settings
                </div>
                <h2 className="text-lg font-semibold tracking-tightest font-sans">Choose AI Model</h2>
                <p className="text-[11px] text-text-muted font-sans">
                  Pick which AI will check your code and reviews.
                </p>
              </div>
              <div>
                {updatingSettings && (
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-primary animate-pulse border border-primary/20 bg-primary/5 px-2.5 py-1 rounded-sm">
                    <RefreshCw className="h-3 w-3 animate-spin" /> SAVING AI SETTINGS...
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
              {/* Gemini Mode */}
              <button
                type="button"
                disabled={updatingSettings}
                onClick={() => handleUpdateProvider("gemini")}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  aiProvider === "gemini"
                    ? "border-primary bg-primary/5 shadow-[inset_0_1px_0_0_rgba(190,242,100,0.1)]"
                    : "border-border bg-bg-soft/40 hover:border-border-faint hover:bg-bg-soft/70"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`p-2 rounded-lg border ${
                    aiProvider === "gemini" ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-bg-elev text-text-muted"
                  }`}>
                    <GeminiIcon className="h-4 w-4" />
                  </span>
                  {aiProvider === "gemini" && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span> ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-semibold font-sans mt-4">Gemini Only</h3>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed font-sans">
                  Use Google Gemini to scan all code. Great for large projects.
                </p>
              </button>

              {/* OpenAI Mode */}
              <button
                type="button"
                disabled={updatingSettings}
                onClick={() => handleUpdateProvider("openai")}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  aiProvider === "openai"
                    ? "border-primary bg-primary/5 shadow-[inset_0_1px_0_0_rgba(190,242,100,0.1)]"
                    : "border-border bg-bg-soft/40 hover:border-border-faint hover:bg-bg-soft/70"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`p-2 rounded-lg border ${
                    aiProvider === "openai" ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-bg-elev text-text-muted"
                  }`}>
                    <OpenAIIcon className="h-4 w-4" />
                  </span>
                  {aiProvider === "openai" && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span> ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-semibold font-sans mt-4">OpenAI Only</h3>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed font-sans">
                  Use OpenAI to scan all code. Great for fast results.
                </p>
              </button>

              {/* Both Mode */}
              <button
                type="button"
                disabled={updatingSettings}
                onClick={() => handleUpdateProvider("both")}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 relative overflow-hidden cursor-pointer ${
                  aiProvider === "both"
                    ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(190,242,100,0.1)]"
                    : "border-border bg-bg-soft/40 hover:border-border-faint hover:bg-bg-soft/70"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`p-2 rounded-lg border ${
                    aiProvider === "both" ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-bg-elev text-text-muted"
                  }`}>
                    <DualSystemIcon className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans text-[8px] uppercase font-semibold border border-primary/20 bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">
                      BACKUP READY
                    </span>
                    {aiProvider === "both" && (
                      <span className="font-mono text-[9px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span> ACTIVE
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-xs font-semibold font-sans mt-4">Backup Mode</h3>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed font-sans">
                  Use Gemini first, and automatically switch to OpenAI if Gemini is busy.
                </p>
              </button>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-border/60 my-6"></div>

            {/* Parallel Slicing Engine Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-bg-soft/20 hover:bg-bg-soft/40 transition-all duration-200">
              <div className="space-y-1 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold font-sans text-foreground">Fast Batch Scanner</h3>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border font-sans text-[8px] font-bold ${
                    parallelEnabled
                      ? "border-primary/20 bg-primary/10 text-primary animate-pulse"
                      : "border-border bg-bg-elev text-text-muted"
                  }`}>
                    {parallelEnabled ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed font-sans">
                  Splits large projects into groups of 10 files to scan them faster. If turned off, the whole project is scanned at once.
                </p>
                <div className="flex gap-4 mt-2 font-mono text-[9px] text-text-muted/80">
                  <span>• Group Size: <strong className="text-foreground">10 files</strong></span>
                  <span>• Skip Grouping: <strong className="text-foreground">Under 15 files</strong></span>
                </div>
              </div>

              {/* Custom Switch Toggle */}
              <button
                type="button"
                disabled={updatingSettings}
                onClick={() => handleUpdateParallel(!parallelEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  parallelEnabled ? "bg-primary" : "bg-bg-soft border-border"
                } ${updatingSettings ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="sr-only">Toggle Batch Scanner</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    parallelEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Quick info or manual audit note */}
          <div className="rounded-xl border border-border bg-bg-soft/50 p-6 space-y-2 font-sans">
            <h4 className="font-sans text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldIcon className="h-4 w-4 text-primary" /> How Backup Mode Works
            </h4>
            <p className="text-[11px] text-text-muted leading-relaxed font-sans">
              Reviews are run quickly. If Gemini is busy, the backup AI (OpenAI) is automatically used so your review never gets stuck.
            </p>
          </div>

        </div>

        {/* Right 1 Column: Average Health & Model Engine Status */}
        <div className="space-y-6 font-sans">
          
          {/* Average Health Score Widget */}
          <div className="rounded-xl border border-primary/25 bg-primary/2 p-6 flex flex-col items-center text-center gap-4 shadow-[inset_0_1px_0_0_rgba(190,242,100,0.05)]">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary font-semibold">
              <ActivityIcon className="h-4 w-4" /> Code Health
            </div>
            <div>
              <div className="text-5xl font-medium font-sans text-primary tracking-tightest drop-shadow-[0_0_12px_rgba(190,242,100,0.15)]">
                {metrics.avgScore}
              </div>
              <div className="font-sans text-[9px] uppercase tracking-widest text-text-muted mt-1.5">Average Score</div>
            </div>
            <div className="h-px w-full bg-border/60 my-2"></div>
            <p className="text-[11px] text-text-muted leading-relaxed font-sans">
              Across all projects, the average code health score is <span className="text-foreground font-semibold">{metrics.avgScore}/100</span>.
            </p>
          </div>

          {/* Model Engines Status Board */}
          <div className="rounded-xl border border-border bg-bg-elev p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
              <CompassIcon className="h-3.5 w-3.5" /> AI Status
            </h3>
            
            <div className="space-y-3">
              {/* Gemini Engine Block */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-bg-soft/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-md">
                    <GeminiIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground font-sans">Gemini</div>
                    <div className="font-sans text-[8px] text-text-muted mt-0.5">Main AI</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-primary/20 bg-primary/10 text-primary font-sans text-[8px] font-bold">
                    ONLINE
                  </span>
                </div>
              </div>

              {/* OpenAI Engine Block */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-bg-soft/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-md">
                    <OpenAIIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground font-sans">OpenAI</div>
                    <div className="font-sans text-[8px] text-text-muted mt-0.5">Backup AI</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-primary/20 bg-primary/10 text-primary font-sans text-[8px] font-bold">
                    ONLINE
                  </span>
                </div>
              </div>

              {/* Supabase Broker Block */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-bg-soft/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-md">
                    <ShieldIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground font-sans">Database</div>
                    <div className="font-sans text-[8px] text-text-muted mt-0.5">System database</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-border bg-bg-elev text-text-muted font-sans text-[8px] font-bold">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Registry Link */}
          <div className="rounded-xl border border-border bg-bg-elev p-5 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.4)] font-sans">
            <div>
              <h4 className="text-xs font-semibold font-sans">Manage Users</h4>
              <p className="text-[10px] text-text-muted mt-0.5 font-sans">Change plans and add review credits</p>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex h-8 items-center justify-center rounded border border-border bg-bg-soft px-3 font-sans text-[10px] font-medium text-foreground hover:bg-bg-soft/80 transition-colors"
            >
              Manage Users
            </Link>
          </div>

        </div>

      </div>

      {/* Recent Reviews */}
      <div className="rounded-xl border border-border bg-bg-elev overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="p-5 border-b border-border/80 flex items-center justify-between">
          <h3 className="text-sm font-medium font-sans tracking-tightest">Recent Reviews</h3>
          <span className="font-mono text-[9px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2 py-0.5 rounded-sm">
            Recent
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-bg-soft/50 font-sans text-[10px] text-text-muted">
                <th className="px-5 py-3 font-medium">Repository & Title</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Created At</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {recentReviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-text-muted font-sans">
                    No reviews yet.
                  </td>
                </tr>
              ) : (
                recentReviews.map((r) => (
                  <tr key={r.id} className="hover:bg-bg-soft/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground truncate max-w-[280px]">
                        {r.pr_title || "Manual Review"}
                      </div>
                      <div className="font-mono text-[10px] text-text-muted mt-0.5 truncate max-w-[280px]">
                        {r.repo_owner && r.repo_name ? `${r.repo_owner}/${r.repo_name}` : r.pr_url}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider font-bold ${
                          r.status === "complete"
                            ? "bg-green-400/10 text-green-400 border border-green-400/20"
                            : r.status === "processing"
                              ? "bg-amber-400/10 text-amber-400 border border-amber-400/20 animate-pulse"
                              : r.status === "failed"
                                ? "bg-red-400/10 text-red-400 border border-red-400/20"
                                : "bg-bg-soft text-text-muted border border-border"
                        }`}
                      >
                        {r.status === "complete" ? "Done" : r.status === "processing" ? "Scanning" : r.status === "failed" ? "Failed" : r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm font-semibold">
                      {r.health_score !== null ? (
                        <span
                          className={
                            r.health_score >= 80
                              ? "text-primary"
                              : r.health_score >= 60
                                ? "text-amber-400"
                                : "text-red-400"
                          }
                        >
                          {r.health_score}
                        </span>
                      ) : (
                        <span className="text-text-faint">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-text-muted">
                      {new Date(r.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-sans">
                      <Link
                        to="/reviews/$id"
                        params={{ id: r.id }}
                        className="inline-flex items-center gap-1 font-sans text-[10px] text-primary hover:underline font-medium"
                      >
                        View report <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
