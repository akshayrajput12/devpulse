import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, Zap, Info, ShieldAlert, Sparkles, User as UserIcon, Calendar, LayoutDashboard, LogOut, X } from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DevPulseLoader } from "@/components/DevPulseLoader";

export function AppNav() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
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
                onClick={() => navigate({ to: "/dashboard", search: { credits: "true" } as any })}
              >
                <button 
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-faint font-sans">Recent Credits</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-sans font-semibold text-primary capitalize">{profile?.plan || "free"} Plan</span>
                    </div>
                    
                    {/* Latest 3 credits usage logs */}
                    <div className="space-y-2 mb-3.5 mt-1.5">
                      {loadingReviews ? (
                        <div className="text-[10px] text-text-faint animate-pulse">Loading transaction logs...</div>
                      ) : reviews.length === 0 ? (
                        <p className="text-[11px] text-text-muted leading-relaxed font-sans">
                          No transactions yet. Scan code to use credits.
                        </p>
                      ) : (
                        reviews.slice(0, 3).map((rev) => {
                          const cost = rev.review_type === "folder_analysis" ? 2 : (rev.review_type === "codebase_audit" || rev.review_type === "api_analysis") ? 3 : 1;
                          return (
                            <div key={rev.id} className="flex justify-between items-center text-xs">
                              <span className="text-text-muted truncate max-w-[180px]" title={rev.pr_title || "Manual Review"}>
                                {rev.pr_title || "Manual Review"}
                              </span>
                              <span className="font-mono text-orange-400 font-semibold">-{cost} cr</span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-border/40 pt-2.5 text-center">
                      <span className="text-[10px] font-sans text-primary font-bold animate-pulse">
                        🖱️ Click to see complete ledger
                      </span>
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


    </header>
  );
}
