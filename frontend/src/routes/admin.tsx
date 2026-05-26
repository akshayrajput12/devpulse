import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import {
  AnimatedIconsStyles,
  DashboardIcon,
  UsersIcon,
  BlogIcon,
  ExitIcon,
  ShieldIcon,
  SettingsIcon,
  ReviewIcon,
} from "@/components/AnimatedIcons";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login" });
      return;
    }

    if (user) {
      (async () => {
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .maybeSingle();

          if (error || !profile || !profile.is_admin) {
            toast.error("Access Denied: Administrative privileges required.");
            navigate({ to: "/dashboard" });
            setIsAdmin(false);
          } else {
            setIsAdmin(true);
          }
        } catch (e) {
          console.error("Failed to verify admin status:", e);
          navigate({ to: "/dashboard" });
          setIsAdmin(false);
        } finally {
          setChecking(false);
        }
      })();
    }
  }, [session, user, loading, navigate]);

  if (loading || checking || isAdmin === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <DevPulseLoader />
          <p className="font-mono text-xs text-primary animate-pulse uppercase tracking-widest">
            Authorizing admin session...
          </p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { label: "Overview", to: "/admin", icon: DashboardIcon },
    { label: "Reviews", to: "/admin/reviews", icon: ReviewIcon },
    { label: "Users", to: "/admin/users", icon: UsersIcon },
    { label: "AI Settings", to: "/admin/settings", icon: SettingsIcon },
    { label: "Blogs", to: "/admin/blog", icon: BlogIcon },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans">
      <AnimatedIconsStyles />
      
      {/* Brutalist Sidebar */}
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border bg-bg-elev/80 backdrop-blur-md flex flex-col p-6">
        
        {/* Logo/Identity */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
            <ShieldIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-primary font-bold">Admin Panel</div>
            <div className="text-sm font-extrabold tracking-tight">DevPulse</div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-xs font-sans tracking-tight font-medium transition-all duration-200 border ${
                  isActive
                    ? "bg-primary/10 border-primary/20 text-primary font-semibold"
                    : "border-transparent text-text-muted hover:bg-bg-soft hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-text-muted"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="mt-auto pt-6 border-t border-border/60">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg border border-border bg-bg-soft/50 px-4 py-2.5 text-xs font-sans tracking-tight font-medium text-text-muted hover:text-foreground hover:bg-bg-soft transition-all duration-200"
          >
            <ExitIcon className="h-4 w-4" /> Exit Admin
          </Link>
        </div>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 overflow-y-auto bg-background/50 p-6 md:p-10">
        <Outlet />
      </main>

    </div>
  );
}
