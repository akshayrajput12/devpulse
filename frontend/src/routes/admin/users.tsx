import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  getAdminUsers,
  updateAdminUserCredits,
  updateAdminUserPlan,
  toggleAdminRole,
  deleteAdminUserAccount,
} from "./-admin.functions";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import { Search, Shield, Award, Edit2, Check, Trash2, UserCheck, AlertTriangle } from "lucide-react";
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
  created_at: string;
};

function AdminUsers() {
  const { session } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingCreditsId, setEditingCreditsId] = useState<string | null>(null);
  const [tempCredits, setTempCredits] = useState<number>(0);

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
    } catch (e: any) {
      toast.error(e.message || "Failed to update admin role");
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
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title */}
      <div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-text-muted">/ terminal root / database user registry</div>
        <h1 className="text-3xl font-medium tracking-tightest mt-1 text-foreground font-sans">User Account Management</h1>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          Manage individual user plans, override credit quotas, toggle administrative terminal privileges, or purge accounts.
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
          Active users: <span className="text-primary font-semibold">{users.length}</span>
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
                  <th className="px-5 py-3 font-medium">User Profile</th>
                  <th className="px-5 py-3 font-medium">Subscription Tier</th>
                  <th className="px-5 py-3 font-medium">Credits Quota</th>
                  <th className="px-5 py-3 font-medium">Terminal Role</th>
                  <th className="px-5 py-3 font-medium text-right">System Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-sans">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-text-muted font-mono">
                      No matching user records found in the registry.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-bg-soft/10 transition-colors">
                      
                      {/* Name/Email Column */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground truncate max-w-[200px]">
                          {user.display_name || "Unidentified User"}
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
                              title="Override credits"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
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
                          {user.is_admin ? "Sys Admin" : "Standard"}
                        </button>
                      </td>

                      {/* Delete actions Column */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.is_admin && user.email === "akshayrajput2616@gmail.com"} // safeguard
                          className="p-1.5 rounded border border-red-400/10 bg-red-400/5 text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40 disabled:hover:bg-red-400/5 disabled:cursor-not-allowed"
                          title="Purge user account"
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
    </div>
  );
}
