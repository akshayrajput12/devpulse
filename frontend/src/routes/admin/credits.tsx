import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminUsers,
  updateAdminUserCredits,
  updateAdminUserPlan,
} from "./-admin.functions";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import {
  AnimatedIconsStyles,
  ActivityIcon,
} from "@/components/AnimatedIcons";
import { Search, Check, Edit2, Calendar, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/credits")({
  component: AdminCredits,
});

type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: string;
  review_credits: number;
  reviews_used_this_month: number;
  is_admin: boolean;
  is_blocked: boolean;
  has_password: boolean;
  created_at: string;
};

type GlobalReview = {
  id: string;
  pr_title: string | null;
  pr_url: string;
  review_type: string | null;
  created_at: string;
  user_email: string | null;
};

function AdminCredits() {
  const { session } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [globalReviews, setGlobalReviews] = useState<GlobalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingCreditsId, setEditingCreditsId] = useState<string | null>(null);
  const [tempCredits, setTempCredits] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showToast = false) => {
    if (!session?.access_token) return;
    if (showToast) setRefreshing(true);
    try {
      // 1. Fetch user accounts
      const userList = await getAdminUsers({
        data: {
          access_token: session.access_token,
        }
      });
      setUsers(userList as AdminUser[]);

      // 2. Fetch all recent reviews with user emails for credits audit feed
      const { data: revList, error: revErr } = await supabase
        .from("reviews")
        .select(`
          id,
          pr_title,
          pr_url,
          review_type,
          created_at,
          user_id
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!revErr && revList) {
        // Map user_id to email manually from user list
        const mappedReviews = revList.map((rev) => {
          const matchedUser = (userList as AdminUser[]).find((u) => u.id === rev.user_id);
          return {
            id: rev.id,
            pr_title: rev.pr_title,
            pr_url: rev.pr_url,
            review_type: rev.review_type,
            created_at: rev.created_at,
            user_email: matchedUser?.email || "anonymous_user",
          };
        });
        setGlobalReviews(mappedReviews);
      }

      if (showToast) toast.success("Credits data successfully updated.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to load credits panel data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleUpdatePlan = async (userId: string, plan: string) => {
    if (!session?.access_token) return;
    try {
      await updateAdminUserPlan({
        data: {
          access_token: session.access_token,
          user_id: userId,
          plan: plan as any,
        }
      });
      toast.success("User plan updated! Credits refreshed.");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update plan");
    }
  };

  const handleStartEditCredits = (user: AdminUser) => {
    setEditingCreditsId(user.id);
    setTempCredits(user.review_credits);
  };

  const handleSaveCredits = async (userId: string) => {
    if (!session?.access_token) return;
    try {
      await updateAdminUserCredits({
        data: {
          access_token: session.access_token,
          user_id: userId,
          credits: tempCredits,
        }
      });
      toast.success("Quotas successfully updated.");
      setEditingCreditsId(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to override credits");
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const email = (u.email || "").toLowerCase();
    const name = (u.display_name || "").toLowerCase();
    const plan = u.plan.toLowerCase();
    return email.includes(term) || name.includes(term) || plan.includes(term);
  });

  // Calculate high level summaries
  const totalAllocatedCredits = users.reduce((sum, u) => sum + u.review_credits, 0);
  const totalReviewsMonth = users.reduce((sum, u) => sum + u.reviews_used_this_month, 0);
  const activeProPlans = users.filter((u) => u.plan === "pro").length;

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-text-muted">/ admin / credits</div>
          <h1 className="text-3xl font-medium tracking-tightest mt-1 text-foreground font-sans">Credit Ledger</h1>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Monitor allocations, audit server-side transaction logs, and override credit parameters across all active users.
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-soft/50 px-4 py-2 text-xs font-mono font-bold text-foreground transition-all duration-200 hover:bg-bg-soft cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          {refreshing ? "Updating..." : "Sync"}
        </button>
      </div>

      {/* High Level Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-bg-elev p-5 flex flex-col justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Total Outstanding Credits</span>
          <span className="text-3xl font-semibold tracking-tightest text-orange-400 font-sans mt-2">{totalAllocatedCredits}</span>
          <span className="text-[10px] text-text-faint/80 mt-1">Sum of all user wallets</span>
        </div>
        <div className="rounded-xl border border-border bg-bg-elev p-5 flex flex-col justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Monthly Audits Conducted</span>
          <span className="text-3xl font-semibold tracking-tightest text-primary font-sans mt-2">{totalReviewsMonth}</span>
          <span className="text-[10px] text-text-faint/80 mt-1">Deducted credits in this billing cycle</span>
        </div>
        <div className="rounded-xl border border-border bg-bg-elev p-5 flex flex-col justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Paid Upgrades</span>
          <span className="text-3xl font-semibold tracking-tightest text-blue-400 font-sans mt-2">{activeProPlans}</span>
          <span className="text-[10px] text-text-faint/80 mt-1">Active PRO subscriptions</span>
        </div>
      </div>

      {/* User Credit Directory Panel */}
      <div className="rounded-xl border border-border bg-bg-elev overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold font-sans">User Balance Directory</h3>
            <p className="text-[10px] text-text-muted mt-0.5">Edit pricing plans and override remaining credits.</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search user email or plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-soft/40 py-1.5 pl-9 pr-3 font-sans text-xs text-foreground placeholder:text-text-muted focus:border-primary/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-bg-soft/50 font-sans text-[10px] text-text-muted">
                <th className="px-5 py-3 font-medium">User Profile</th>
                <th className="px-5 py-3 font-medium">Plan Level</th>
                <th className="px-5 py-3 font-medium">Remaining Credits</th>
                <th className="px-5 py-3 font-medium">Cycle Usage</th>
                <th className="px-5 py-3 font-medium">Next Renewal Rollup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-text-muted font-sans">
                    No matching user records found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  // Calculate next rollup (reset date + 30 days)
                  const resetDate = user.created_at; // Fallback to signup date if last_reset is null
                  const rollupDate = new Date(new Date(resetDate).getTime() + 30 * 24 * 60 * 60 * 1000);
                  const daysLeft = Math.ceil((rollupDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={user.id} className="hover:bg-bg-soft/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground truncate max-w-[200px]">
                          {user.display_name || "User"}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted mt-0.5 select-all truncate max-w-[200px]">
                          {user.email}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <select
                          value={user.plan}
                          onChange={(e) => handleUpdatePlan(user.id, e.target.value)}
                          className="rounded border border-border bg-bg-soft font-sans text-[10px] font-semibold text-foreground px-2 py-0.5 focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="free">FREE</option>
                          <option value="pro">PRO (₹999)</option>
                        </select>
                      </td>

                      <td className="px-5 py-3.5">
                        {editingCreditsId === user.id ? (
                          <div className="flex items-center gap-1.5 max-w-[120px]">
                            <input
                              type="number"
                              min="0"
                              value={tempCredits}
                              onChange={(e) => setTempCredits(Number(e.target.value))}
                              className="w-16 rounded border border-border bg-bg-soft px-1.5 py-0.5 font-mono text-xs text-foreground focus:border-primary/50 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveCredits(user.id)}
                              className="p-1 rounded bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-orange-400">
                              {user.review_credits}
                            </span>
                            <button
                              onClick={() => handleStartEditCredits(user)}
                              className="p-0.5 rounded text-text-muted hover:text-primary hover:bg-bg-soft/60 transition-all duration-200 cursor-pointer"
                              title="Change credits"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-mono">
                        {user.reviews_used_this_month} used
                      </td>

                      <td className="px-5 py-3.5 font-mono text-text-muted">
                        {rollupDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        <span className="ml-2 rounded bg-bg-soft px-1.5 py-0.5 text-[9px] font-semibold text-text-faint">
                          {daysLeft > 0 ? `${daysLeft}d left` : "Pending Reset"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Consumption Audit Log */}
      <div className="rounded-xl border border-border bg-bg-elev overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="p-5 border-b border-border/80">
          <h3 className="text-sm font-semibold font-sans">Credit Consumption Audit Log</h3>
          <p className="text-[10px] text-text-muted mt-0.5">Real-time ledger entries created during code analysis processes.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-bg-soft/50 font-sans text-[10px] text-text-muted">
                <th className="px-5 py-3 font-medium">User Account</th>
                <th className="px-5 py-3 font-medium">Offending Audit Operations</th>
                <th className="px-5 py-3 font-medium">Calculated Cost</th>
                <th className="px-5 py-3 font-medium">Transaction Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {globalReviews.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-text-muted font-sans">
                    No transactions recorded on this server.
                  </td>
                </tr>
              ) : (
                globalReviews.map((rev) => {
                  const cost = rev.review_type === "folder_analysis" ? 2 : (rev.review_type === "codebase_audit" || rev.review_type === "api_analysis") ? 3 : 1;
                  let desc = "PR Review Scanned";
                  if (rev.review_type === "folder_analysis") desc = "Folder Structure Audit";
                  else if (rev.review_type === "codebase_audit") desc = "Deep Codebase Audit";
                  else if (rev.review_type === "api_analysis") desc = "API & Backend Analyser";

                  return (
                    <tr key={rev.id} className="hover:bg-bg-soft/10 transition-colors">
                      <td className="px-5 py-3.5 font-mono select-all text-text-muted">
                        {rev.user_email}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground truncate max-w-[280px]">
                          {rev.pr_title || "Manual Review"}
                        </div>
                        <div className="font-sans text-[10px] text-text-faint mt-0.5 truncate max-w-[280px]">
                          {desc} · {rev.pr_url}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 shrink-0">
                        <span className="font-mono text-xs font-bold text-red-400">
                          -{cost} credits
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-text-muted">
                        {new Date(rev.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
