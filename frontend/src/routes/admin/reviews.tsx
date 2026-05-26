import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getAdminMetrics } from "./-admin.functions";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import { AnimatedIconsStyles, ReviewIcon } from "@/components/AnimatedIcons";
import { ArrowUpRight, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

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

function AdminReviews() {
  const { session } = useAuth();
  const [reviews, setReviews] = useState<RecentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = async (showToast = false) => {
    if (!session?.access_token) return;
    if (showToast) setRefreshing(true);
    try {
      const res = await getAdminMetrics({ data: { access_token: session.access_token } });
      setReviews(res.recentReviews || []);
      if (showToast) toast.success("Review list refreshed successfully.");
    } catch (e: any) {
      console.error("Failed to load reviews:", e);
      toast.error(e.message || "Failed to load reviews");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    const interval = setInterval(() => fetchReviews(false), 30000);
    return () => clearInterval(interval);
  }, [session]);

  const filteredReviews = reviews.filter((r) => {
    const term = search.toLowerCase();
    const title = (r.pr_title || "").toLowerCase();
    const repo = `${r.repo_owner || ""}/${r.repo_name || ""}`.toLowerCase();
    const url = r.pr_url.toLowerCase();
    const id = r.id.toLowerCase();
    return title.includes(term) || repo.includes(term) || url.includes(term) || id.includes(term);
  });

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <DevPulseLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <AnimatedIconsStyles />

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-text-muted">/ admin / reviews</div>
          <h1 className="text-3xl font-medium tracking-tightest mt-1 text-foreground font-sans">All Reviews</h1>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Inspect all codebase scan reports, active audit operations, and health scores across repositories.
          </p>
        </div>
        <button
          onClick={() => fetchReviews(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-soft/50 px-4 py-2 text-xs font-mono font-bold text-foreground transition-all duration-200 hover:bg-bg-soft cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search repository, review title, url..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-elev/40 py-2.5 pl-10 pr-4 font-sans text-xs text-foreground placeholder:text-text-muted focus:border-primary/50 focus:outline-none transition-colors"
          />
        </div>
        <div className="font-sans text-[10px] text-text-muted">
          Matching reports: <span className="text-primary font-semibold">{filteredReviews.length}</span>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="rounded-xl border border-border bg-bg-elev overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-bg-soft/50 font-sans text-[10px] text-text-muted">
                <th className="px-5 py-3 font-medium">Repository & Title</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-text-muted font-sans">
                    {search ? "No matching reviews found for your query." : "No code reviews processed yet."}
                  </td>
                </tr>
              ) : (
                filteredReviews.map((r) => (
                  <tr key={r.id} className="hover:bg-bg-soft/20 transition-colors">
                    {/* Repository owner/name and PR Title */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground truncate max-w-[340px]">
                        {r.pr_title || "Manual Review"}
                      </div>
                      <div className="font-mono text-[10px] text-text-muted mt-0.5 truncate max-w-[340px] select-all">
                        {r.repo_owner && r.repo_name ? `${r.repo_owner}/${r.repo_name}` : r.pr_url}
                      </div>
                    </td>

                    {/* Status badge */}
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

                    {/* Health score numeric badge */}
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
                          {r.health_score} / 100
                        </span>
                      ) : (
                        <span className="text-text-faint">—</span>
                      )}
                    </td>

                    {/* Date localized */}
                    <td className="px-5 py-3.5 font-mono text-text-muted">
                      {new Date(r.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Action button */}
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
