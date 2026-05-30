import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminUsers,
  updateAdminUserCredits,
  updateAdminUserPlan,
  toggleAdminRole,
  deleteAdminUserAccount,
  toggleAdminUserBlock,
} from "./-admin.functions";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import { Search, Shield, Edit2, Check, Trash2, ShieldAlert, X, Eye, Ban, Unlock, RefreshCw, GitPullRequest, Database, KeyRound, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
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

function UserDetailModal({
  user,
  onClose,
  onUpdatePlan,
  onToggleBlock,
  onToggleAdmin,
  onRefresh,
  accessToken,
}: {
  user: AdminUser;
  onClose: () => void;
  onUpdatePlan: (uid: string, plan: string) => Promise<void>;
  onToggleBlock: (uid: string, current: boolean) => Promise<void>;
  onToggleAdmin: (uid: string, current: boolean) => Promise<void>;
  onRefresh: () => void;
  accessToken: string;
}) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  // Administrative Overrides states
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editCredits, setEditCredits] = useState<number>(0);
  const [editUsedThisMonth, setEditUsedThisMonth] = useState<number>(0);
  const [editLastReset, setEditLastReset] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [savingOverrides, setSavingOverrides] = useState(false);

  const loadData = async () => {
    setLoadingReviews(true);
    try {
      // 1. Fetch user reviews directly
      const { data: revList, error: revErr } = await supabase
        .from("reviews")
        .select("id, pr_title, pr_url, status, health_score, created_at, review_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!revErr && revList) {
        setReviews(revList);
      }

      // 2. Fetch full profile including github integration
      const { data: prof, error: profErr } = await (supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle() as any);

      if (!profErr && prof) {
        setProfileData(prof);
        setEditDisplayName(prof.display_name || "");
        setEditEmail(prof.email || "");
        setEditPlan(prof.plan || "free");
        setEditCredits(prof.review_credits || 0);
        setEditUsedThisMonth(prof.reviews_used_this_month || 0);
        
        if (prof.last_reset_at) {
          setEditLastReset(prof.last_reset_at.slice(0, 16));
        } else {
          setEditLastReset("");
        }
        
        if (prof.subscription_expires_at) {
          setEditExpiresAt(prof.subscription_expires_at.slice(0, 16));
        } else {
          setEditExpiresAt("");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const handleSaveOverrides = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOverrides(true);
    try {
      const { error } = await (supabase
        .from("profiles")
        .update({
          display_name: editDisplayName.trim() || null,
          email: editEmail.trim() || null,
          plan: editPlan,
          review_credits: Number(editCredits),
          reviews_used_this_month: Number(editUsedThisMonth),
          last_reset_at: editLastReset ? new Date(editLastReset).toISOString() : null,
          subscription_expires_at: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id) as any);

      if (error) throw error;
      toast.success("System overrides saved successfully!");
      onRefresh();
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save system overrides.");
    } finally {
      setSavingOverrides(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop (SOLID dark translucent - no blur as requested) */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-border bg-bg-elev p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{profileData?.display_name || user.display_name || "User Details"}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:text-foreground hover:bg-bg-soft transition cursor-pointer">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content columns */}
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1.2fr] gap-6 overflow-y-auto pr-1">
          
          {/* Left Column: Overrides Form and settings */}
          <div className="space-y-5">
            <form onSubmit={handleSaveOverrides} className="space-y-4">
              {/* Account details */}
              <div className="rounded-xl border border-border/60 bg-bg-soft/40 p-4 space-y-3.5">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-muted border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-primary" /> Profile Overrides
                </h3>
                
                <div>
                  <label className="text-[10px] text-text-faint font-semibold uppercase">Email Address</label>
                  <input
                    type="text"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded border border-border bg-bg-soft font-mono text-xs text-foreground px-3 py-1.5 outline-none mt-0.5 focus:border-primary/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-text-faint font-semibold uppercase">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full rounded border border-border bg-bg-soft font-sans text-xs text-foreground px-3 py-1.5 outline-none mt-0.5 focus:border-primary/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <div className="text-[10px] text-text-faint font-semibold uppercase">User ID</div>
                    <div className="text-[9px] text-text-faint font-mono mt-0.5 select-all truncate" title={user.id}>{user.id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-faint font-semibold uppercase">Date Joined</div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscriptions, limits & billing reset dates */}
              <div className="rounded-xl border border-border/60 bg-bg-soft/40 p-4 space-y-3.5">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-muted border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-primary" /> Plan & Cycles Overrides
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-faint font-semibold uppercase">Pricing Plan</label>
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="w-full rounded border border-border bg-bg-soft font-sans text-xs font-semibold text-foreground px-2 py-1.5 outline-none cursor-pointer focus:border-primary/50"
                    >
                      <option value="free">FREE</option>
                      <option value="pro">PRO (₹999/mo)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-faint font-semibold uppercase">Credits Balance</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editCredits}
                      onChange={(e) => setEditCredits(Number(e.target.value))}
                      className="w-full rounded border border-border bg-bg-soft font-mono text-xs text-foreground px-2 py-1.5 outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-faint font-semibold uppercase">Used Scans (Month)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editUsedThisMonth}
                      onChange={(e) => setEditUsedThisMonth(Number(e.target.value))}
                      className="w-full rounded border border-border bg-bg-soft font-mono text-xs text-foreground px-2 py-1.5 outline-none focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col justify-end">
                    <span className="text-[10px] text-text-faint font-semibold uppercase">Security Role</span>
                    <button
                      type="button"
                      onClick={() => onToggleAdmin(user.id, user.is_admin)}
                      className={`w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded border font-sans text-[10px] font-bold uppercase transition cursor-pointer ${
                        user.is_admin
                          ? "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                          : "bg-bg-soft border-border text-text-muted hover:border-primary/30 hover:text-primary"
                      }`}
                    >
                      <Shield className="h-3 w-3" />
                      {user.is_admin ? "Remove Admin" : "Make Admin"}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-1 border-t border-border/10">
                  <div className="space-y-1">
                    <label className="text-[10px] text-text-faint font-semibold uppercase flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Billing Start Date (Last Reset)
                    </label>
                    <input
                      type="datetime-local"
                      value={editLastReset}
                      onChange={(e) => setEditLastReset(e.target.value)}
                      className="w-full rounded border border-border bg-bg-soft font-mono text-xs text-foreground px-2 py-1.5 outline-none focus:border-primary/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-text-faint font-semibold uppercase flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Next Billing/Expiry Date
                    </label>
                    <input
                      type="datetime-local"
                      value={editExpiresAt}
                      onChange={(e) => setEditExpiresAt(e.target.value)}
                      className="w-full rounded border border-border bg-bg-soft font-mono text-xs text-foreground px-2 py-1.5 outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Suspension parameters */}
                <div className="flex gap-2 pt-2 border-t border-border/10">
                  <button
                    type="button"
                    onClick={() => onToggleBlock(user.id, user.is_blocked)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded border font-sans text-xs font-semibold uppercase transition cursor-pointer ${
                      user.is_blocked
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                        : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                    }`}
                  >
                    {user.is_blocked ? (
                      <><Unlock className="h-3.5 w-3.5" /> Unsuspend User</>
                    ) : (
                      <><Ban className="h-3.5 w-3.5" /> Suspend User</>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={savingOverrides}
                className="w-full rounded bg-primary text-primary-foreground font-sans text-xs font-semibold py-2.5 hover:bg-primary/95 transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingOverrides ? "Saving System Overrides..." : "Save System Changes"}
              </button>
            </form>
          </div>

          {/* Right Column: User review history */}
          <div className="flex flex-col h-full overflow-hidden min-h-[300px]">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Review History</h3>
              <span className="rounded bg-bg-soft border border-border px-2 py-0.5 font-mono text-[10px] text-text-muted">
                {reviews.length} reviews
              </span>
            </div>

            <div className="flex-1 rounded-xl border border-border bg-bg-soft/10 overflow-hidden flex flex-col">
              {loadingReviews ? (
                <div className="flex-1 flex items-center justify-center p-12">
                  <DevPulseLoader />
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 font-sans">
                  <GitPullRequest className="h-8 w-8 text-text-faint mb-2" />
                  <p className="text-xs text-text-muted">This user hasn't run any reviews yet.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[480px] divide-y divide-border/30">
                  {reviews.map((rev) => {
                    const cost = rev.review_type === "folder_analysis" ? 2 : (rev.review_type === "codebase_audit" || rev.review_type === "api_analysis") ? 3 : 1;
                    return (
                      <div key={rev.id} className="p-3.5 hover:bg-bg-soft/20 transition-colors flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground truncate">{rev.pr_title || rev.pr_url}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-mono text-[9px] text-text-faint max-w-[180px] truncate select-all">{rev.pr_url}</span>
                            <span className="text-text-faint/60 font-mono text-[9px]">• {new Date(rev.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-orange-500/20 bg-orange-500/5 text-orange-400 font-bold">
                            -{cost} cr
                          </span>
                          {rev.health_score != null && (
                            <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                              rev.health_score >= 80 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : rev.health_score >= 60 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {rev.health_score} / 100
                            </span>
                          )}
                          <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${
                            rev.status === "complete" ? "bg-emerald-500/10 text-emerald-400" : rev.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {rev.status === "complete" ? "Done" : rev.status === "failed" ? "Failed" : rev.status === "processing" ? "Scanning" : rev.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const { session } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingCreditsId, setEditingCreditsId] = useState<string | null>(null);
  const [tempCredits, setTempCredits] = useState<number>(0);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const fetchUsers = async () => {
    if (!session?.access_token) return;
    try {
      const res = await getAdminUsers({
        data: {
          access_token: session.access_token,
          search: search.trim() || undefined,
        }
      });
      setUsers(res as AdminUser[]);
    } catch (e: any) {
      console.error("Failed to fetch users:", e);
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session, search]);

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (!session?.access_token) return;
    try {
      await toggleAdminRole({
        data: {
          access_token: session.access_token,
          user_id: userId,
          is_admin: !currentStatus,
        }
      });
      toast.success(`Admin role updated successfully.`);
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, is_admin: !currentStatus } : null);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update admin role");
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    if (!session?.access_token) return;
    try {
      await toggleAdminUserBlock({
        data: {
          access_token: session.access_token,
          user_id: userId,
          is_blocked: !currentStatus,
        }
      });
      toast.success(`User suspension state updated successfully.`);
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, is_blocked: !currentStatus } : null);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to toggle user block status");
    }
  };

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
      toast.success(`User plan upgraded to ${plan.toUpperCase()}! Credits reset.`);
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, plan, review_credits: plan === "pro" ? 150 : 10 } : null);
      }
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
      toast.success("Review credits overridden successfully.");
      setEditingCreditsId(null);
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, review_credits: tempCredits } : null);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save credits");
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!session?.access_token) return;
    const confirm = window.confirm(
      `CRITICAL ACTION:\nAre you sure you want to permanently delete user ${
        user.display_name || user.email
      }?\n\nThis will purge all reviews, findings, and authentication parameters from Supabase. This cannot be undone.`
    );
    if (!confirm) return;

    try {
      await deleteAdminUserAccount({
        data: {
          access_token: session.access_token,
          user_id: user.id,
        }
      });
      toast.success("User account deleted successfully.");
      setSelectedUser(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-medium tracking-tightest mt-1 text-foreground font-sans">Manage Users</h1>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          Manage user plans, review credits, admin roles, and account settings.
        </p>
      </div>

      {/* Actions / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search email, ID, display name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-elev/40 py-2.5 pl-10 pr-4 font-sans text-xs text-foreground placeholder:text-text-muted focus:border-primary/50 focus:outline-none transition-colors"
          />
        </div>
        <div className="font-sans text-[10px] text-text-muted">
          Total users: <span className="text-primary font-semibold">{users.length}</span>
        </div>
      </div>

      {/* User Records Table */}
      <div className="rounded-xl border border-border bg-bg-elev overflow-hidden">
        {loading ? (
          <div className="flex h-48 w-full items-center justify-center">
            <DevPulseLoader />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-bg-soft/50 font-sans text-[10px] text-text-muted">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Credits</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Admin</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-sans">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-text-muted font-sans">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className={`hover:bg-bg-soft/10 transition-colors ${user.is_blocked ? "bg-red-500/[0.02]" : ""}`}>
                      
                      {/* Name/Email Column */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground truncate max-w-[200px]">
                          {user.display_name || "User"}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted mt-0.5 select-all truncate max-w-[200px]">
                          {user.email}
                        </div>
                        <div className="font-mono text-[8px] text-text-faint/80 mt-0.5">
                          ID: {user.id}
                        </div>
                      </td>

                      {/* Plan Column */}
                      <td className="px-5 py-3.5">
                        <select
                          value={user.plan}
                          onChange={(e) => handleUpdatePlan(user.id, e.target.value)}
                          className="rounded border border-border bg-bg-soft font-sans text-[10px] font-semibold text-foreground px-2.5 py-1 focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="free">FREE</option>
                          <option value="pro">PRO (₹999)</option>
                        </select>
                      </td>

                      {/* Credits Column */}
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
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {user.review_credits}
                            </span>
                            <span className="font-mono text-[10px] text-text-muted">
                              / {user.reviews_used_this_month} used
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

                      {/* Suspension Status Column */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[9px] font-semibold border ${
                          user.is_blocked
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}>
                          {user.is_blocked ? (
                            <><Ban className="h-2.5 w-2.5" /> Suspended</>
                          ) : (
                            <><Check className="h-2.5 w-2.5" /> Active</>
                          )}
                        </span>
                      </td>

                      {/* Admin status Column */}
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border font-sans text-[9px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                            user.is_admin
                              ? "bg-red-400/10 border-red-400/30 text-red-300 hover:bg-red-400/20"
                              : "bg-bg-soft border-border text-text-muted hover:border-primary/30 hover:text-primary"
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          {user.is_admin ? "Admin" : "User"}
                        </button>
                      </td>

                      {/* System Actions Column */}
                      <td className="px-5 py-3.5 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-1.5 rounded border border-border bg-bg-soft text-text-muted hover:text-foreground hover:bg-bg-soft transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleBlock(user.id, user.is_blocked)}
                          className={`p-1.5 rounded border transition-colors cursor-pointer ${
                            user.is_blocked
                              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
                              : "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                          }`}
                          title={user.is_blocked ? "Unsuspend" : "Suspend"}
                        >
                          {user.is_blocked ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.is_admin && user.email === "akshayrajput2616@gmail.com"} // safeguard
                          className="p-1.5 rounded border border-red-400/10 bg-red-400/5 text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40 disabled:hover:bg-red-400/5 disabled:cursor-not-allowed cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail View Dialog Modal */}
      {selectedUser && session?.access_token && (
        <UserDetailModal
          user={selectedUser}
          accessToken={session.access_token}
          onClose={() => setSelectedUser(null)}
          onUpdatePlan={handleUpdatePlan}
          onToggleBlock={handleToggleBlock}
          onToggleAdmin={handleToggleAdmin}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
}
