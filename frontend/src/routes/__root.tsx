import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";

import { Toaster, toast } from "sonner";
import { ThemeProvider, useTheme } from "@/lib/theme.js";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

import { useAuth } from "@/lib/auth.js";
import { supabase } from "@/integrations/supabase/client.js";
import { useState, useEffect } from "react";
import { ShieldAlert, KeyRound, Eye, EyeOff } from "lucide-react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setFetchingProfile(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_blocked, has_password")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && data) {
        setProfile(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingProfile(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmittingPassword(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from("profiles")
        .update({ has_password: true })
        .eq("id", user.id);
      if (dbError) throw dbError;

      toast.success("Password configured successfully!");
      setProfile((prev: any) => ({ ...prev, has_password: true }));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to configure password.");
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (profile?.is_blocked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 font-sans text-center">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#111114] p-8 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mb-6 animate-pulse">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">Account Suspended</h2>
          <p className="text-xs text-text-muted leading-relaxed mb-6">
            Your DevPulse developer account has been suspended by system administrative command due to profile audits or credit constraints.
          </p>
          <div className="rounded-xl border border-border bg-[#16161a] p-4 font-mono text-xs text-text-muted space-y-2 select-all text-center">
            <div>✉ akshayrajput2616@gmail.com</div>
            <div>📞 +91 9653814628</div>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            className="mt-6 w-full rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition cursor-pointer"
          >
            Logout Session
          </button>
        </div>
      </div>
    );
  }

  if (user && profile && !profile.has_password && !fetchingProfile) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-border bg-bg-elev p-8 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/30 text-primary mb-6">
            <KeyRound className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground text-center mb-1">Set Up Your Password</h2>
          <p className="text-xs text-text-muted text-center mb-6 leading-relaxed">
            You logged in via GitHub. For secure standalone credentials, please configure a master password below.
          </p>
          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Master Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full rounded-lg border border-border bg-bg-soft px-3.5 py-2.5 pr-10 font-sans text-xs text-foreground placeholder:text-text-faint outline-none focus:border-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground cursor-pointer bg-transparent border-0"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                className="w-full rounded-lg border border-border bg-bg-soft px-3.5 py-2.5 font-sans text-xs text-foreground placeholder:text-text-faint outline-none focus:border-primary/50"
              />
            </div>
            <button
              type="submit"
              disabled={submittingPassword}
              className="mt-2 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
            >
              {submittingPassword ? "Configuring Credentials..." : "Configure Credentials"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthGuard>
          <Outlet />
        </AuthGuard>
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-right" />;}
