import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getAdminMetrics } from "./-admin.functions";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import {
  AnimatedIconsStyles,
  UsersIcon,
  ReviewIcon,
  ActivityIcon,
  AlertTriangleIcon,
  ShieldIcon,
  SettingsIcon,
  BlogIcon,
} from "@/components/AnimatedIcons";
import { ArrowUpRight, ChevronRight } from "lucide-react";
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

  const fetchMetrics = async () => {
    if (!session?.access_token) return;
    try {
      const res = await getAdminMetrics({ data: { access_token: session.access_token } });
      setMetrics(res.metrics);
      setRecentReviews(res.recentReviews || []);
    } catch (e: any) {
      console.error("Failed to load admin metrics:", e);
      toast.error(e.message || "Failed to load metrics");
    } finally {
      setLoading(false);
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
      title: "Registered Users",
      value: metrics.usersCount,
      desc: "Total user accounts",
      icon: UsersIcon,
      color: "text-blue-400 border-blue-400/20 bg-blue-400/5",
    },
    {
      title: "Total Reviews",
      value: metrics.reviewsCount,
      desc: "Total generated reviews",
      icon: ReviewIcon,
      color: "text-primary border-primary/20 bg-primary/5",
    },
    {
      title: "Queue Size",
      value: metrics.pendingQueueCount,
      desc: "Reviews waiting in queue",
      icon: ActivityIcon,
      color: "text-amber-400 border-amber-400/20 bg-amber-400/5",
    },
    {
      title: "Failed Reviews",
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
          return (
            <div
              key={card.title}
              className={`rounded-xl border p-5 flex items-start justify-between transition-all duration-200 hover:scale-[1.01] hover:border-primary/20 ${card.color}`}
            >
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  {card.title}
                </span>
                <div className="text-3xl font-medium tracking-tightest font-sans">{card.value}</div>
                <p className="text-[10px] text-text-muted/80 leading-none">{card.desc}</p>
              </div>
              <div className="p-2 bg-background/40 rounded-lg border border-border/40">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Navigation Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Panel 1: Manage AI settings */}
        <div className="rounded-xl border border-border bg-bg-elev p-6 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.4)] font-sans">
          <div className="space-y-2">
            <div className="p-2 bg-primary/10 border border-primary/20 text-primary w-fit rounded-lg">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold font-sans mt-2">AI Configuration</h3>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Choose your active AI provider, enable fallback engines, or fine-tune parallel multi-file scanner parameters.
            </p>
          </div>
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline mt-6 group"
          >
            Configure AI settings <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Panel 2: Users and Subscriptions */}
        <div className="rounded-xl border border-border bg-bg-elev p-6 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.4)] font-sans">
          <div className="space-y-2">
            <div className="p-2 bg-primary/10 border border-primary/20 text-primary w-fit rounded-lg">
              <UsersIcon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold font-sans mt-2">User Directory</h3>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Inspect developer credentials, modify subscription tiers, grant manual review credits, or toggle user suspensions.
            </p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline mt-6 group"
          >
            Manage User accounts <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Panel 3: Blog Manager */}
        <div className="rounded-xl border border-border bg-bg-elev p-6 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.4)] font-sans">
          <div className="space-y-2">
            <div className="p-2 bg-primary/10 border border-primary/20 text-primary w-fit rounded-lg">
              <BlogIcon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold font-sans mt-2">Blogs & Articles</h3>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Create and publish rich-text articles, draft tutorials, and maintain developer resources on the public knowledge base.
            </p>
          </div>
          <Link
            to="/admin/blog"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline mt-6 group"
          >
            Manage Blog drafts <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Panel 4: Code Health Overview */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.2)] font-sans">
          <div className="space-y-2">
            <div className="p-2 bg-primary/10 border border-primary/20 text-primary w-fit rounded-lg">
              <ShieldIcon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold font-sans mt-2">Core Health Index</h3>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              The aggregate health of analyzed code stands at <strong className="text-primary">{metrics.avgScore}/100</strong> across repositories, indicating highly compliant coding practices.
            </p>
          </div>
          <Link
            to="/admin/reviews"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline mt-6 group"
          >
            Inspect audit reports <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

      </div>

      {/* Recent Reviews Preview */}
      <div className="rounded-xl border border-border bg-bg-elev overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="p-5 border-b border-border/80 flex items-center justify-between">
          <h3 className="text-sm font-medium font-sans tracking-tightest">Recent Activity</h3>
          <Link
            to="/admin/reviews"
            className="font-mono text-[9px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2.5 py-1 rounded-sm hover:bg-primary/10 transition-colors"
          >
            View All Reviews
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-bg-soft/50 font-sans text-[10px] text-text-muted">
                <th className="px-5 py-3 font-medium">Repository & Title</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {recentReviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-text-muted font-sans">
                    No reviews yet.
                  </td>
                </tr>
              ) : (
                recentReviews.slice(0, 5).map((r) => (
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
                    <td className="px-5 py-3.5 text-right font-sans">
                      <Link
                        to="/reviews/$id"
                        params={{ id: r.id }}
                        className="inline-flex items-center gap-1 font-sans text-[10px] text-primary hover:underline font-medium"
                      >
                        View Report <ArrowUpRight className="h-3 w-3" />
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
