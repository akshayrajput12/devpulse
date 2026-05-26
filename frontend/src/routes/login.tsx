import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Github } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Check your email to confirm");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally { setBusy(false); }
  }

  async function github() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin + "/dashboard",
        scopes: "read:user user:email repo",
      },
    });
    if (error) { toast.error(error.message); setBusy(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border bg-bg-soft p-12 lg:flex">
        <a href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tightest">DevPulse</span>
        </a>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-primary">/ what you get</div>
          <h2 className="mt-3 max-w-[20ch] font-medium tracking-tightest" style={{ fontSize: 36, lineHeight: 1.05 }}>
            5 free reviews. No card. Connect GitHub to review private repos.
          </h2>
          <p className="mt-4 max-w-[42ch] text-sm leading-relaxed text-text-muted">
            Sign in with GitHub to grant repo read access — we use it only to fetch the PR diff. Email/password works too for public repos.
          </p>
        </div>
        <div className="font-mono text-xs text-text-faint">© DevPulse · built for shipping</div>
      </div>

      <div className="grid place-items-center p-8">
        <div className="w-full max-w-sm">
          <a href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span className="grid h-6 w-6 place-items-center rounded-sm bg-primary text-primary-foreground"><Activity className="h-3.5 w-3.5" strokeWidth={2.5} /></span>
            <span className="font-semibold tracking-tightest">DevPulse</span>
          </a>
          <div className="font-mono text-[11px] uppercase tracking-widest text-text-faint">{mode === "signup" ? "/ create account" : "/ sign in"}</div>
          <h1 className="mt-2 text-2xl font-medium tracking-tightest">{mode === "signup" ? "Get your first review free" : "Welcome back"}</h1>

          <button onClick={github} disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:-translate-y-px disabled:opacity-50">
            <Github className="h-4 w-4" />
            Continue with GitHub
          </button>

          <div className="my-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-text-faint">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
              className="w-full rounded-md border border-border bg-bg-elev px-3 py-2.5 text-sm outline-none transition focus:border-primary" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password"
              className="w-full rounded-md border border-border bg-bg-elev px-3 py-2.5 text-sm outline-none transition focus:border-primary" />
            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:-translate-y-px disabled:opacity-50">
              {mode === "signup" ? "Create account" : "Sign in"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <button onClick={() => setMode(m => m === "signin" ? "signup" : "signin")}
            className="mt-6 w-full text-center text-sm text-text-muted hover:text-foreground">
            {mode === "signin" ? "No account yet? Create one →" : "Have an account? Sign in →"}
          </button>
        </div>
      </div>
    </div>
  );
}
