import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Github, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { useAuth } from "@/lib/auth";
import { createReview } from "@/lib/reviews.functions";

const schema = z.object({
  url: z.string().url().regex(/github\.com\/[^/]+\/[^/]+\/pull\/\d+/, "Must be a GitHub PR URL"),
});

export const Route = createFileRoute("/reviews/new")({
  validateSearch: (s: Record<string, unknown>): { url?: string } => ({
    url: typeof s.url === "string" && s.url ? s.url : undefined,
  }),
  component: NewReview,
});

function NewReview() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [url, setUrl] = useState(search.url || "");
  const [busy, setBusy] = useState(false);
  const createReviewFn = useServerFn(createReview);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = schema.safeParse({ url });
    if (!v.success) { toast.error(v.error.issues[0].message); return; }
    if (!user) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      const result = await createReviewFn({
        data: { pr_url: url, access_token: session.access_token, user_id: user.id },
      });
      navigate({ to: "/reviews/$id", params: { id: result.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start review");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">/ new review</div>
        <h1 className="mt-2 text-3xl font-medium tracking-tightest">Paste a GitHub PR URL</h1>
        <p className="mt-2 text-text-muted">Public repos work out of the box. The review streams in as the AI lands findings.</p>

        <form onSubmit={submit} className="mt-8 flex items-center gap-2 rounded-lg border border-border bg-bg-elev p-1.5 transition focus-within:border-primary">
          <Github className="ml-2 h-4 w-4 text-text-muted" />
          <input
            autoFocus value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="min-w-0 flex-1 bg-transparent py-2 font-mono text-sm outline-none placeholder:text-text-faint"
          />
          <button disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:-translate-y-px disabled:opacity-50">
            {busy ? "Queuing…" : "Review"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-border bg-bg-soft p-5">
          <div className="font-mono text-[11px] uppercase tracking-widest text-text-faint">Try one of these</div>
          <div className="mt-3 space-y-1.5 font-mono text-sm">
            {[
              "https://github.com/facebook/react/pull/27513",
              "https://github.com/vercel/next.js/pull/58104",
            ].map((u) => (
              <button key={u} onClick={() => setUrl(u)} className="block w-full truncate text-left text-text-muted hover:text-foreground">
                › {u}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
