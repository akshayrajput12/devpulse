import { Link } from "@tanstack/react-router";
import { Activity, Zap, Info, ShieldAlert, Sparkles, User as UserIcon, Calendar, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DevPulseLoader } from "@/components/DevPulseLoader";

export function AppNav() {
  const { user, loading } = useAuth();
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
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setReviews([]);
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

        // Fetch user reviews representing credit ledger
        setLoadingReviews(true);
        const { data: revList, error: revErr } = await supabase
          .from("reviews")
          .select("id, pr_title, pr_url, review_type, created_at, status")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (!revErr && revList && active) {
          setReviews(revList);
        }
        setLoadingReviews(false);
      } catch (err) {
        console.error("Failed to load profile credits", err);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "US";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-sm bg-primary text-primary-foreground">
            <Activity className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span className="font-semibold tracking-tightest">DevPulse</span>
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary dp-pulse" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-text-muted md:flex">
          <Link to="/" hash="features" className="hover:text-foreground">Features</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          {user && <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>}
          {user && (
            <Link to="/folder-analysis" className="hover:text-foreground flex items-center gap-1">
              Folder Analysis
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">AI</span>
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <ThemeToggle />
          {loading ? null : user ? (
            <div className="flex items-center gap-4">
              {/* Credit Balance Capsule with Tooltip */}
              <div 
                className="relative cursor-pointer"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <button 
                  onClick={() => setShowCreditModal(true)}
                  className="flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 px-3 py-1 font-mono text-xs font-semibold text-orange-400 shadow-sm transition hover:bg-orange-500/10 cursor-pointer"
                  title="View detailed credit ledger"
                >
                  <Zap className="h-3.5 w-3.5 text-orange-400 fill-orange-400/20" />
                  <span>{profile ? `${profile.review_credits} credits` : "loading..."}</span>
                </button>
                
                {/* Custom Gorgeous Dropdown Tooltip */}
                {showTooltip && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-bg-elev p-4 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150 z-50 font-sans">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-text-faint font-sans">Credit Ledger</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-sans font-semibold text-primary capitalize">{profile?.plan || "free"} Plan</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed mb-3 font-sans">
                      Click to view exactly where and how your credits were used. Refreshes every 30 days.
                    </p>
                    <div className="space-y-2 font-sans">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted">⚡ Pull Request Review</span>
                        <span className="font-medium text-foreground">-1 credit</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted">🏗️ Folder Structure Audit</span>
                        <span className="font-medium text-foreground">-2 credits</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted">💡 Deep Codebase Audit</span>
                        <span className="font-medium text-foreground">-3 credits</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted">🎛️ API & Backend Analyser</span>
                        <span className="font-medium text-foreground">-3 credits</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Hover Card (Hover-Triggered) */}
              <div 
                className="relative py-1"
                onMouseEnter={() => setShowDropdown(true)}
                onMouseLeave={() => setShowDropdown(false)}
              >
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 rounded-full border border-border bg-bg-soft/40 p-0.5 pr-2.5 transition hover:bg-bg-soft hover:border-text-muted cursor-pointer"
                >
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="profile" 
                      className="h-7 w-7 rounded-full object-cover border border-border-faint"
                    />
                  ) : (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-border text-[10px] font-bold text-text">
                      {initials}
                    </div>
                  )}
                  <span className="max-w-[80px] truncate text-xs font-sans font-medium text-text-muted hidden sm:inline-block">
                    {profile?.display_name || user?.email?.split("@")[0] || "User"}
                  </span>
                </button>

                {/* Dropdown Menu Overlay */}
                {showDropdown && (
                  <div className="absolute right-0 top-full pt-1.5 w-80 z-50 font-sans">
                    <div className="rounded-xl border border-border bg-bg-elev p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
                      
                      {/* User Identity Header */}
                      <div className="flex items-center gap-3 border-b border-border/40 pb-4 mb-4">
                        {profile?.avatar_url ? (
                          <img 
                            src={profile.avatar_url} 
                            alt="profile" 
                            className="h-10 w-10 rounded-full object-cover border border-border-faint"
                          />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-border font-sans font-medium text-sm text-foreground shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-sans text-sm font-semibold text-foreground leading-tight">
                            {profile?.display_name || "Developer Profile"}
                          </div>
                          <div className="truncate font-sans text-[10px] text-text-faint mt-0.5">
                            {user?.email}
                          </div>
                        </div>
                      </div>

                      {/* Premium Status Matrix Panel (Prominent top section) */}
                      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                        <div className="flex items-center justify-between border-b border-primary/10 pb-2 mb-2">
                          <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-primary animate-pulse" /> Status Matrix
                          </span>
                          <span className={`rounded-sm border px-2 py-0.5 text-[9px] font-sans font-bold uppercase leading-none ${
                            profile?.plan === "pro" 
                              ? "border-primary/40 text-primary bg-primary/10" 
                              : profile?.plan === "team"
                                ? "border-orange-500/40 text-orange-400 bg-orange-500/10"
                                : "border-border text-text-faint bg-bg-soft/10"
                          }`}>
                            {profile?.plan || "free"} Plan
                          </span>
                        </div>
                        
                        <div className="space-y-2 font-sans text-[11px] text-text-muted">
                          {/* Expiration Countdown */}
                          {profile?.plan !== "free" && profile?.subscription_expires_at ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-text-faint">Subscription Ends:</span>
                              <span className="font-medium text-foreground">
                                {new Date(profile.subscription_expires_at).toLocaleDateString(undefined, { 
                                  month: "short", 
                                  day: "numeric" 
                                })}
                                {(() => {
                                  const days = Math.ceil((new Date(profile.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                  return days > 0 ? (
                                    <span className="ml-1.5 text-[9px] px-1.5 py-0.25 rounded-sm bg-primary/20 text-primary font-bold">{days}d left</span>
                                  ) : null;
                                })()}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-text-faint">Access Level:</span>
                              <span className="font-medium text-text-faint">Lifetime Free Tier</span>
                            </div>
                          )}

                          {/* Next Credit Grant Info */}
                          <div className="flex items-start justify-between gap-2 border-t border-primary/10 pt-2 mt-2">
                            <span className="text-text-faint">Next Grant:</span>
                            <div className="text-right">
                              <span className="font-semibold text-primary font-sans">+{profile?.plan === "pro" ? "150" : "10"} credits</span>
                              <div className="text-[9px] text-text-faint font-sans mt-0.5">
                                Auto-reset on {
                                  profile?.last_reset_at 
                                    ? new Date(new Date(profile.last_reset_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { 
                                        month: "short", 
                                        day: "numeric"
                                      })
                                    : "N/A"
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Options & CTAs */}
                      <div className="space-y-1.5">
                        {/* Admin Dashboard CTA - Only visible to admin users */}
                        {profile?.is_admin && (
                          <Link 
                            to="/admin" 
                            onClick={() => setShowDropdown(false)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3.5 py-2 text-xs font-sans font-medium text-red-400 transition hover:bg-red-500/10 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <ShieldAlert className="h-3.5 w-3.5 text-red-400" /> Root Admin Manager
                            </span>
                          </Link>
                        )}

                        <Link 
                          to="/dashboard"
                          onClick={() => setShowDropdown(false)}
                          className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg-soft/20 hover:bg-bg-soft/60 px-3.5 py-2 text-xs font-sans font-medium text-text hover:text-foreground transition cursor-pointer"
                        >
                          <LayoutDashboard className="h-3.5 w-3.5 text-text-muted" /> User Dashboard
                        </Link>

                        <button
                          onClick={async () => {
                            setShowDropdown(false);
                            await signOut();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg border border-transparent hover:bg-red-500/5 hover:text-red-400 px-3.5 py-2 text-xs font-sans font-medium text-text-muted transition cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" /> Sign out
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link to="/login" className="px-3 py-1.5 text-text-muted hover:text-foreground">Sign in</Link>
              <Link
                to="/login"
                className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground transition hover:-translate-y-px"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Credit Allocation Ledger Dialog Modal */}
      {showCreditModal && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreditModal(false)} />
          
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-bg-elev p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans">
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
              <div className="p-4 rounded-xl border border-border bg-bg-soft/30 flex flex-col justify-center">
                <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Balance</span>
                <span className="text-3xl font-medium text-orange-400 tracking-tightest font-sans mt-1">
                  {profile.review_credits} <span className="text-xs text-text-muted">credits left</span>
                </span>
              </div>
              <div className="p-4 rounded-xl border border-border bg-bg-soft/30 flex flex-col justify-center">
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
                {loadingReviews ? (
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
    </header>
  );
}
