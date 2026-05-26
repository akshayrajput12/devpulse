import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, ExternalLink, GitPullRequest } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SeverityBadge } from "@/components/SeverityBadge";
import { HealthScore } from "@/components/HealthScore";

export const Route = createFileRoute("/r/$token")({ component: PublicReview });

function PublicReview() {
  const { token } = Route.useParams();
  const [review, setReview] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("reviews").select("*")
        .eq("share_token", token).eq("is_public", true).maybeSingle();
      if (!r) { setNotFound(true); return; }
      setReview(r);
      const { data: f } = await supabase.from("findings").select("*").eq("review_id", r.id);
      setFindings(f ?? []);
    })();
  }, [token]);

  if (notFound) return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tightest">Review not found</h1>
        <p className="mt-2 text-text-muted">This share link is invalid or the owner made it private.</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-1 text-primary">go home <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </div>
  );
  if (!review) return <div className="p-12 text-center font-mono text-text-faint">loading…</div>;

  const order: Record<string, number> = { crit: 0, high: 1, med: 2, low: 3, ok: 4 };
  const sorted = [...findings].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-sm bg-primary text-primary-foreground"><Activity className="h-3.5 w-3.5" strokeWidth={2.5} /></span>
            <span className="font-semibold tracking-tightest">DevPulse</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-6 py-10">
        <div className="flex items-start justify-between gap-6 rounded-xl border border-border bg-bg-elev p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
              <GitPullRequest className="h-3.5 w-3.5" />
              {review.repo_owner && <span>{review.repo_owner}/{review.repo_name}#{review.pr_number}</span>}
              <a href={review.pr_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-text-faint hover:text-foreground">
                <ExternalLink className="h-3 w-3" /> github
              </a>
            </div>
            <h1 className="mt-2 truncate text-2xl font-medium tracking-tightest">{review.pr_title}</h1>
            <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-text-muted">{review.summary}</p>
          </div>
          <HealthScore value={review.health_score} size={110} />
        </div>

        <div className="mt-6 space-y-3">
          {sorted.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-bg-elev p-5">
              <div className="flex items-center gap-2">
                <SeverityBadge level={f.severity} />
                <span className="font-mono text-[11px] uppercase tracking-widest text-text-muted">{f.category}</span>
                <span className="ml-auto font-mono text-xs text-text-faint">{f.file_path}{f.line_start ? `:${f.line_start}` : ""}</span>
              </div>
              <div className="mt-2 font-medium">{f.title}</div>
              <p className="mt-1 text-sm text-text-muted">{f.description}</p>
              {f.bad_code && <pre className="mt-3 overflow-x-auto rounded-lg border border-border-faint bg-bg-code p-3 font-mono text-xs">{f.bad_code}</pre>}
              {f.suggested_fix && <pre className="mt-2 overflow-x-auto rounded-lg border border-border-faint bg-bg-code p-3 font-mono text-xs">{f.suggested_fix}</pre>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
