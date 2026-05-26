import { useEffect, useState, useRef, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { FolderGit2, Search, ChevronRight, Loader2, ExternalLink, Lock, Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUserRepos } from "@/lib/reviews.functions";

const TYPEWRITER_PHRASES = [
  "https://github.com/vercel/next.js",
  "Paste any GitHub repository URL here",
  "Works with public & private repos",
  "https://github.com/facebook/react",
  "Opens workspace, PRs & codebase audit",
];

function useTypewriter(phrases: string[]) {
  const [text, setText] = useState("");
  const stateRef = useRef({ phrase: 0, char: 0, deleting: false });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const s = stateRef.current;
      const full = phrases[s.phrase];

      if (!s.deleting) {
        if (s.char < full.length) {
          setText(full.slice(0, s.char + 1));
          s.char++;
          timer = setTimeout(tick, 55);
        } else {
          s.deleting = true;
          timer = setTimeout(tick, 1800);
        }
      } else {
        if (s.char > 0) {
          setText(full.slice(0, s.char - 1));
          s.char--;
          timer = setTimeout(tick, 28);
        } else {
          s.phrase = (s.phrase + 1) % phrases.length;
          s.deleting = false;
          timer = setTimeout(tick, 300);
        }
      }
    }

    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [phrases]);

  return text;
}

type Repo = {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  description: string | null;
  html_url: string;
};

export function GithubBrowser() {
  const navigate = useNavigate();
  const getUserReposFn = useServerFn(getUserRepos);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const typedText = useTypewriter(TYPEWRITER_PHRASES);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const data = await getUserReposFn({ data: { access_token: session.access_token } });
        setRepos(data || []);
      } catch (err: any) {
        setError(err.message || "Could not retrieve repositories. Try reconnecting GitHub.");
      } finally {
        setLoadingRepos(false);
      }
    }
    load();
  }, [getUserReposFn]);

  function parseRepoLink(value: string) {
    const m = value.trim().match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
  }

  function handleOpenRepoLink(e: FormEvent) {
    e.preventDefault();
    const parsed = parseRepoLink(repoLink);
    if (!parsed) {
      toast.error("Paste a valid GitHub repository URL");
      return;
    }
    navigate({ to: "/workspace/$owner/$repo", params: { owner: parsed.owner, repo: parsed.repo } });
  }

  const filtered = repos.filter(
    r =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.full_name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search repositories…"
          className="w-full rounded-md border border-border bg-bg-elev pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary"
        />
      </label>

      {/* Paste URL — highlighted bar */}
      <div id="tour-paste-url" className="rounded-xl border border-primary/35 bg-primary/5 p-[1px] shadow-[0_0_12px_hsl(var(--primary)/0.12)]">
        <form
          onSubmit={handleOpenRepoLink}
          className="flex items-center gap-2 rounded-[10px] bg-bg-elev px-3 py-2.5 transition-all focus-within:bg-card"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-primary/70" />
          <div className="relative min-w-0 flex-1">
            <input
              value={repoLink}
              onChange={e => setRepoLink(e.target.value)}
              className="w-full bg-transparent font-mono text-sm outline-none"
            />
            {repoLink === "" && (
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center font-mono text-sm text-text-faint">
                {typedText}
                <span className="ml-px animate-pulse">|</span>
              </span>
            )}
          </div>
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            Open <ExternalLink className="h-3 w-3" />
          </button>
        </form>
      </div>
      <p className="px-1 text-[11px] text-text-faint">
        Paste any GitHub repo URL above — supports public &amp; private repositories
      </p>

      {/* Repo list */}
      <div id="tour-repos-list" className="overflow-hidden rounded-xl border border-border bg-bg-elev">
        {loadingRepos ? (
          <div className="flex items-center justify-center gap-2 p-12 text-text-faint">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-mono text-sm">syncing repositories…</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <FolderGit2 className="mx-auto h-8 w-8 text-text-faint mb-2" />
            <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">{error}</p>
            {error.toLowerCase().includes("token") && (
              <button
                onClick={async () => {
                  const { error: authErr } = await supabase.auth.signInWithOAuth({
                    provider: "github",
                    options: {
                      redirectTo: window.location.origin + "/dashboard",
                      scopes: "read:user user:email repo",
                    },
                  });
                  if (authErr) toast.error(authErr.message);
                }}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
              >
                Reconnect GitHub
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center font-mono text-sm text-text-faint">
            No repositories found{q ? ` matching "${q}"` : ""}.
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filtered.map(r => (
              <li key={r.id}>
                <button
                  onClick={() =>
                    navigate({
                      to: "/workspace/$owner/$repo",
                      params: { owner: r.owner, repo: r.name },
                    })
                  }
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-bg-soft/20"
                >
                  <FolderGit2 className="h-5 w-5 shrink-0 text-text-faint" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {r.private ? (
                        <Lock className="h-3 w-3 shrink-0 text-text-faint" />
                      ) : (
                        <Globe className="h-3 w-3 shrink-0 text-text-faint" />
                      )}
                      <span className="text-sm font-medium">{r.name}</span>
                      {r.private && (
                        <span className="rounded bg-bg-soft px-1.5 py-0.5 font-mono text-[9px] text-text-faint uppercase">
                          Private
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <p className="mt-0.5 truncate font-mono text-xs text-text-faint">
                        {r.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-faint" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
