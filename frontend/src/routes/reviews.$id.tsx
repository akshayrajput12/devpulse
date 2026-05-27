import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Copy, ExternalLink, GitPullRequest, RefreshCw, Trash2,
  Code, ShieldAlert, Info, Zap, Layers, Shield, FlaskConical, BookOpen,
  Github, FileText, GitCommit, Hash, X, ChevronRight, Diff, Globe, Mail, Database,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { SeverityBadge } from "@/components/SeverityBadge";
import { HealthScore } from "@/components/HealthScore";
import { useAuth } from "@/lib/auth";
import {
  retryReview, processReview, postReviewStyled, applyFindingFix, emailReviewReport,
} from "@/lib/reviews.functions";
import { AnimatedLog, type LogStep } from "@/components/AnimatedLog";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { DevPulseLoader } from "@/components/DevPulseLoader";

export const Route = createFileRoute("/reviews/$id")({ component: ReviewDetail });

type Review = any;
type Finding = any;

const SEV_ORDER: Record<string, number> = { crit: 0, high: 1, med: 2, low: 3, ok: 4 };
const SEV_COLOR: Record<string, string> = { crit: "#ef4444", high: "#f97316", med: "#eab308", low: "#3b82f6", ok: "#22c55e" };
const SEV_BG: Record<string, string> = { crit: "#fef2f2", high: "#fff7ed", med: "#fefce8", low: "#eff6ff", ok: "#f0fdf4" };
const CAT_EMOJI: Record<string, string> = { security: "🔒", performance: "⚡", architecture: "🏗️", reliability: "🛡️", testability: "🧪", readability: "📖" };

const CATEGORY_CONFIG = [
  { id: "security",     label: "Security",     icon: ShieldAlert,  color: "#ef4444", bg: "bg-red-500/10",    border: "border-red-500/20",    text: "text-red-400",    desc: "Vulnerabilities, auth flaws, injection risks" },
  { id: "performance",  label: "Performance",  icon: Zap,          color: "#f59e0b", bg: "bg-amber-500/10",  border: "border-amber-500/20",  text: "text-amber-400",  desc: "N+1 queries, memory leaks, slow operations" },
  { id: "architecture", label: "Architecture", icon: Layers,       color: "#3b82f6", bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400",   desc: "Design patterns, coupling, SOLID principles" },
  { id: "reliability",  label: "Reliability",  icon: Shield,       color: "#8b5cf6", bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", desc: "Error handling, race conditions, crash paths" },
  { id: "testability",  label: "Testability",  icon: FlaskConical, color: "#22c55e", bg: "bg-green-500/10",  border: "border-green-500/20",  text: "text-green-400",  desc: "Test coverage gaps, untestable code patterns" },
  { id: "readability",  label: "Readability",  icon: BookOpen,     color: "#6b7280", bg: "bg-slate-500/10",  border: "border-slate-500/20",  text: "text-slate-400",  desc: "Naming, complexity, documentation clarity" },
] as const;
type CategoryId = typeof CATEGORY_CONFIG[number]["id"];

// ── Post-to-GitHub dialog ──────────────────────────────────────────────────
function PostDialog({
  open, onClose, onPost, posting, reviewerName, reviewerLogin,
}: {
  open: boolean;
  onClose: () => void;
  onPost: (style: "devpulse" | "human") => void;
  posting: boolean;
  reviewerName: string;
  reviewerLogin: string;
}) {
  const [style, setStyle] = useState<"devpulse" | "human">("devpulse");
  const firstName = (reviewerName || reviewerLogin || "You").split(" ")[0];

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative z-10 w-full max-w-lg mx-4 rounded-2xl border border-border bg-bg-elev shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Choose review voice</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:text-foreground hover:bg-bg-soft transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {/* DevPulse style */}
          <button
            onClick={() => setStyle("devpulse")}
            className={`w-full text-left rounded-xl border p-4 transition ${style === "devpulse" ? "border-primary bg-primary/5" : "border-border hover:border-border-faint"}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${style === "devpulse" ? "border-primary bg-primary" : "border-border"}`}>
                {style === "devpulse" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">Post as DevPulse AI</span>
                  <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary uppercase tracking-wider">Recommended</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">Professional, branded review. Structured markdown with health score, category badges, and direct suggestion Apply buttons. Clearly attributed to DevPulse.</p>
                <div className="mt-2.5 rounded-lg border border-border bg-bg-code px-3 py-2 font-mono text-[10px] text-text-faint leading-relaxed">
                  ## DevPulse AI Code Review<br />
                  {'>'} Health Score: 74/100 · 5 issues found<br />
                  ### 🔴 CRIT — SQL Injection Risk<br />
                  {'>'}  🔒 security | src/api/users.ts · Line 42...
                </div>
              </div>
            </div>
          </button>

          {/* Human style */}
          <button
            onClick={() => setStyle("human")}
            className={`w-full text-left rounded-xl border p-4 transition ${style === "human" ? "border-primary bg-primary/5" : "border-border hover:border-border-faint"}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${style === "human" ? "border-primary bg-primary" : "border-border"}`}>
                {style === "human" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">Post as {firstName}</span>
                  <span className="rounded-sm bg-bg-soft px-1.5 py-0.5 font-mono text-[9px] text-text-muted uppercase tracking-wider">Personal</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">Casual, human-written style with natural language and minor imperfections. Posted under your GitHub account. Signed with your first name.</p>
                <div className="mt-2.5 rounded-lg border border-border bg-bg-code px-3 py-2 font-mono text-[10px] text-text-faint leading-relaxed">
                  hey @author, had a look — caught 2 things<br /><br />
                  **SQL Injection in api/users.ts** (`src/api/users.ts:42`)<br />
                  this one's a blocker imo — the query's concatenating...
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] text-text-faint">
            Inline suggestions post as one-click <strong>Apply</strong> buttons in the PR diff.
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 font-mono text-xs text-text-muted hover:text-foreground transition">
              Cancel
            </button>
            <button
              onClick={() => onPost(style)}
              disabled={posting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-mono text-xs text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            >
              <Github className="h-3.5 w-3.5" />
              {posting ? "Posting…" : "Post to GitHub"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function EmailReportDialog({
  open,
  onClose,
  onSend,
  sending,
  defaultEmail,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  sending: boolean;
  defaultEmail: string;
}) {
  const [email, setEmail] = useState(defaultEmail);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-bg-elev p-6 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Send Review to Inbox</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:text-foreground hover:bg-bg-soft transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-text-muted leading-relaxed">
            Deliver a highly polished engineering health report directly to your developer inbox or team distribution list.
          </p>

          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Recipient Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. engineering@company.com"
              className="w-full rounded-lg border border-border bg-bg-code px-3.5 py-2 font-sans text-sm text-foreground placeholder:text-text-faint focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 font-mono text-xs">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-text-muted hover:text-foreground hover:bg-bg-soft transition">
            Cancel
          </button>
          <button
            onClick={() => onSend(email)}
            disabled={sending || !email.includes("@")}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-black hover:opacity-90 transition disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Report"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Sanitize AI-provider error messages before showing to user
function friendlyAiError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("503") || m.includes("unavailable") || m.includes("high demand") || m.includes("overloaded")) {
    return "DevPulse AI is experiencing high demand right now. Please wait a moment and try again.";
  }
  if (m.includes("429") || m.includes("rate limit") || m.includes("quota")) {
    return "DevPulse AI rate limit reached. Please wait a moment and try again.";
  }
  if (m.includes("gemini") || m.includes("api error") || m.includes("api key")) {
    return "DevPulse AI encountered an error. Please try again.";
  }
  return msg;
}

// ── Main component ─────────────────────────────────────────────────────────
function ReviewDetail() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [review, setReview] = useState<Review | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [changedFiles, setChangedFiles] = useState<string[]>([]);
  const [tab, setTab] = useState<"issues" | "categories" | "summary" | "files" | "share">("issues");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CategoryId>("all");
  const [findingTab, setFindingTab] = useState<"analysis" | "diff" | "test" | "github">("analysis");
  const [active, setActive] = useState<string | null>(null);
  const [logSteps, setLogSteps] = useState<LogStep[]>([]);
  const [startedId, setStartedId] = useState<string | null>(null);
  // True while background processing is in flight; drives the completion watcher.
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [posting, setPosting] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  // Custom UI Modals state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmRetryOpen, setConfirmRetryOpen] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => { setFindingTab("analysis"); }, [active]);

  const sortedFindings = useMemo(
    () => [...findings].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)),
    [findings],
  );
  const filteredFindings = useMemo(
    () => categoryFilter === "all" ? sortedFindings : sortedFindings.filter(f => f.category === categoryFilter),
    [sortedFindings, categoryFilter],
  );
  const findingsByFile = useMemo(() => {
    const map: Record<string, Finding[]> = {};
    findings.forEach(f => {
      const p = f.file_path || "Unknown";
      if (!map[p]) map[p] = [];
      map[p].push(f);
    });
    return map;
  }, [findings]);
  const categoryStats = useMemo(
    () => CATEGORY_CONFIG.map(cat => ({
      ...cat,
      findings: sortedFindings.filter(f => f.category === cat.id),
      count: sortedFindings.filter(f => f.category === cat.id && f.severity !== "ok").length,
    })),
    [sortedFindings],
  );

  // Auth guard
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  // Trigger processing only once per pending review
  useEffect(() => {
    if (review && review.status === "pending" && startedId !== review.id) {
      setStartedId(review.id);
    }
  }, [review, startedId]);

  // Load review + realtime
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: r } = await supabase.from("reviews").select("*").eq("id", id).maybeSingle();
      if (!cancelled) setReview(r);
      const { data: f } = await supabase.from("findings").select("*").eq("review_id", id).order("severity");
      if (!cancelled) {
        const list = f ?? [];
        setFindings(list);
        if (list[0]) setActive(list[0].id);
      }
    }
    load();
    const ch = supabase.channel(`review-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reviews", filter: `id=eq.${id}` }, p => setReview(p.new))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "findings", filter: `review_id=eq.${id}` }, p =>
        setFindings(prev => {
          if (prev.some(x => x.id === p.new.id)) return prev;
          const next = [...prev, p.new];
          if (!active) setActive(p.new.id);
          return next;
        }),
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [id]);

  const processReviewFn = useServerFn(processReview);
  const retryFn = useServerFn(retryReview);
  const postReviewStyledFn = useServerFn(postReviewStyled);
  const applyFindingFixFn = useServerFn(applyFindingFix);

  // Processing trigger — fires once per pending review, returns immediately.
  // Actual completion is detected by the Supabase watcher effect below.
  useEffect(() => {
    if (!startedId || !review || loading) return;
    if (!user) return;
    if (review.user_id !== user.id) return;

    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    async function start() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession || !alive) return;

      const isApiAnalysisLocal = review.review_type === "api_analysis" || (review.pr_url && review.pr_url.includes("type=api"));
      const isCodebaseAudit = !review.pr_number;
      const stepDefs = isApiAnalysisLocal
        ? [
            { id: "init",    label: "Initializing API & Backend Analysis" },
            { id: "tree",    label: "Fetching repository tree from GitHub" },
            { id: "files",   label: "Selecting backend code files" },
            { id: "analyze", label: "DevPulse AI analyzing API & DB query performance" },
            { id: "save",    label: "Synthesizing full SQL & load simulation report" },
          ]
        : isCodebaseAudit
        ? [
            { id: "init",    label: "Initializing codebase audit" },
            { id: "tree",    label: "Fetching repository tree from GitHub" },
            { id: "files",   label: "Reading source files (up to 60 files)" },
            { id: "analyze", label: "DevPulse AI analyzing codebase" },
            { id: "save",    label: "Saving findings to database" },
          ]
        : [
            { id: "init",    label: "Submitting PR review job" },
            { id: "fetch",   label: "Fetching PR diff from GitHub" },
            { id: "analyze", label: "DevPulse AI reviewing changes" },
            { id: "save",    label: "Saving findings to database" },
          ];

      const now = Date.now();
      setLogSteps(stepDefs.map((s, i) => ({
        ...s,
        status: i === 0 ? "active" : "pending",
        startedAt: i === 0 ? now : undefined,
      })));

      const advance = (nextIdx: number) => {
        if (!alive || nextIdx >= stepDefs.length) return;
        const t = Date.now();
        setLogSteps(prev => prev.map((s, i) => ({
          ...s,
          status: i < nextIdx ? "done" : i === nextIdx ? "active" : s.status,
          startedAt: i === nextIdx ? t : s.startedAt,
          finishedAt: i < nextIdx ? (s.finishedAt ?? t) : s.finishedAt,
        })));
      };

      if (isCodebaseAudit) {
        timers.push(setTimeout(() => advance(1), 1000));
        timers.push(setTimeout(() => advance(2), 3000));
        timers.push(setTimeout(() => advance(3), 6000));
      } else {
        timers.push(setTimeout(() => advance(1), 1500));
        timers.push(setTimeout(() => advance(2), 4000));
      }

      // Fire-and-forget: the server fn uses waitUntil so it returns immediately.
      // Completion is handled by the Supabase watcher effect below.
      setIsProcessing(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "");
      const kick = backendUrl
        ? fetch(`${backendUrl}/api/reviews/process`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentSession.access_token}`,
            },
            body: JSON.stringify({ review_id: id }),
          }).then(async res => {
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || `Backend error ${res.status}`);
          })
        : processReviewFn({ data: { review_id: id, access_token: currentSession.access_token } })
            .then(() => {});

      kick.catch((err: any) => {
        if (!alive) return;
        const msg = friendlyAiError(err?.message || "Failed to start review");
        setIsProcessing(false);
        setLogSteps(prev => prev.map(s => ({
          ...s,
          status: s.status === "active" ? "error" : s.status,
          finishedAt: s.status === "active" ? Date.now() : s.finishedAt,
          detail: s.status === "active" ? msg : s.detail,
        })));
        toast.error(`Review failed: ${msg}`);
      });
    }

    start();
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [startedId, loading, user?.id, id]);

  // Completion watcher — marks log steps done when Supabase confirms review finished.
  useEffect(() => {
    if (!isProcessing || !startedId || !review) return;

    if (review.status === "complete") {
      setIsProcessing(false);
      const done = Date.now();
      setLogSteps(prev => prev.map(s => ({
        ...s,
        status: "done",
        finishedAt: s.finishedAt ?? done,
      })));
      toast.success("Review complete");
    } else if (review.status === "failed") {
      setIsProcessing(false);
      const msg = friendlyAiError(review.error_message || "Review failed");
      setLogSteps(prev => prev.map(s => ({
        ...s,
        status: s.status === "active" ? "error" : s.status,
        finishedAt: s.status === "active" ? Date.now() : s.finishedAt,
        detail: s.status === "active" ? msg : s.detail,
      })));
      toast.error(`Review failed: ${msg}`);
    }
  }, [review?.status, isProcessing, startedId]);

  // ── Actions ─────────────────────────────────────────────────────────────
  async function handlePost(style: "devpulse" | "human") {
    setPosting(true);
    setShowPostDialog(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const reviewerName = (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || "";
      const reviewerLogin = (user as any)?.user_metadata?.user_name || (user as any)?.email?.split("@")[0] || "";
      const result = await postReviewStyledFn({
        data: { review_id: id, access_token: session.access_token, style, reviewer_name: reviewerName, reviewer_login: reviewerLogin },
      });
      toast.success(`Posted to GitHub as ${style === "human" ? reviewerName || "you" : "DevPulse"}! ${result.inline_posted} inline suggestions.`);
      if (result.review_url) window.open(result.review_url, "_blank");
    } catch (err: any) {
      toast.error("Failed to post: " + (err.message || "Unknown error"));
    } finally {
      setPosting(false);
    }
  }

  async function handleApplyFix(findingId: string) {
    setApplying(findingId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const result = await applyFindingFixFn({ data: { review_id: id, finding_id: findingId, access_token: session.access_token } });
      toast.success("Fix committed to branch!");
      if (result.commit_url) window.open(result.commit_url, "_blank");
    } catch (err: any) {
      toast.error("Apply fix failed: " + (err.message || "Unknown error"));
    } finally {
      setApplying(null);
    }
  }

  function retry() {
    setConfirmRetryOpen(true);
  }

  async function executeRetry() {
    setConfirmRetryOpen(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setStartedId(null);
    setFindings([]);
    setActive(null);
    setChangedFiles([]);
    await retryFn({ data: { review_id: id, access_token: session.access_token } });
  }

  function handleDelete() {
    setConfirmDeleteOpen(true);
  }

  async function executeDelete() {
    setConfirmDeleteOpen(false);
    try {
      await supabase.from("findings").delete().eq("review_id", id);
      await supabase.from("reviews").delete().eq("id", id);
      toast.success("Review deleted");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  // ── PDF Export ───────────────────────────────────────────────────────────
  function handleExportPdf() {
    const win = window.open("", "_blank");
    if (!win) { toast.error("Allow popups for this page to export PDF."); return; }

    const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    const scoreColor = (s: number) => s >= 80 ? "#16a34a" : s >= 60 ? "#d97706" : "#dc2626";
    const scoreBg = (s: number) => s >= 80 ? "#f0fdf4" : s >= 60 ? "#fffbeb" : "#fef2f2";
    const scoreBorder = (s: number) => s >= 80 ? "#bbf7d0" : s >= 60 ? "#fef08a" : "#fca5a5";

    const SEV_DETAILS: Record<string, { bg: string; text: string; border: string; label: string }> = {
      crit: { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5", label: "Critical" },
      high: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", label: "High" },
      med: { bg: "#fefce8", text: "#a16207", border: "#fef08a", label: "Medium" },
      low: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", label: "Low" },
      ok: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0", label: "Clean" },
    };

    const CAT_SVG: Record<string, string> = {
      security: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
      performance: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
      architecture: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
      reliability: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
      testability: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M6 3h12"></path><path d="M12 3v15"></path><path d="M9 12h6"></path><path d="M18 15V3H6v12a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3z"></path></svg>`,
      readability: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`
    };

    const catCards = CATEGORY_CONFIG.map(cat => {
      const catF = sortedFindings.filter(f => f.category === cat.id && f.severity !== "ok");
      return `<div class="cat-card">
        <div class="cat-header">
          <span style="color:${cat.color};display:flex;align-items:center;justify-content:center;">${CAT_SVG[cat.id] || ""}</span>
          <span class="cat-title">${cat.label}</span>
          <span class="cat-badge" style="background:${cat.color}12;color:${cat.color};border:1px solid ${cat.color}25;">${catF.length} issue${catF.length === 1 ? "" : "s"}</span>
        </div>
        <p class="cat-desc">${cat.desc}</p>
        <div class="cat-findings-list">
          ${catF.slice(0, 4).map(f => {
            const sd = SEV_DETAILS[f.severity] || { text: "#475569", bg: "#f1f5f9", border: "#e2e8f0", label: f.severity.toUpperCase() };
            return `<div class="cat-finding-item">
              <span style="font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:700;color:${sd.text};background:${sd.bg};border:1px solid ${sd.border};padding:1px 4px;border-radius:3px;text-transform:uppercase;">${f.severity}</span>
              <span class="cat-finding-title">${esc(f.title)}</span>
            </div>`;
          }).join("")}
          ${catF.length > 4 ? `<div style="font-size:10px;color:#94a3b8;font-weight:500;padding-top:4px;">+${catF.length - 4} more issues</div>` : ""}
          ${catF.length === 0 ? `<div style="font-size:11px;color:#16a34a;font-style:italic;display:flex;align-items:center;gap:4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg> No issues found
          </div>` : ""}
        </div>
      </div>`;
    }).join("");

    const findingsHtml = sortedFindings.filter(f => f.severity !== "ok").map((f: Finding, i: number) => {
      const sd = SEV_DETAILS[f.severity] || { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0", label: f.severity.toUpperCase() };
      
      const fileBadge = f.file_path ? `
        <div class="file-path">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          <span>${esc(f.file_path)}${f.line_start ? `:${f.line_start}` : ""}${f.line_end && f.line_end !== f.line_start ? `–${f.line_end}` : ""}</span>
        </div>
      ` : "";

      const badCodeBlock = f.bad_code ? `
        <div class="code-section">
          <div class="code-title code-title-bad">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>What we have (offending code)</span>
          </div>
          <pre class="code-block code-block-bad">${esc(f.bad_code)}</pre>
        </div>
      ` : "";

      const goodCodeBlock = f.suggested_fix ? `
        <div class="code-section">
          <div class="code-title code-title-good">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>What it should be (complete fix)</span>
          </div>
          <pre class="code-block code-block-good">${esc(f.suggested_fix)}</pre>
        </div>
      ` : "";

      return `
      <div class="finding-card">
        <div class="finding-header">
          <span class="badge" style="background:${sd.bg};color:${sd.text};border:1px solid ${sd.border};">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 22 22 22 12 2"></polygon><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            &nbsp;${sd.label}
          </span>
          <span class="badge badge-category">
            <span style="display:inline-flex;align-items:center;justify-content:center;margin-right:4px;color:#475569;">
              ${CAT_SVG[f.category] || ""}
            </span>
            ${esc(f.category)}
          </span>
          <span class="badge-confidence">
            #${i + 1} &middot; ${f.confidence ?? 80}% confidence
          </span>
        </div>
        <h3 class="finding-title">${esc(f.title)}</h3>
        <p class="finding-desc">${esc(f.description)}</p>
        ${fileBadge}
        ${badCodeBlock}
        ${goodCodeBlock}
      </div>`;
    }).join("\n");

    const filesSection = changedFiles.length > 0 ? `
      <div style="margin-bottom: 32px;">
        <h2 class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Changed Files (${changedFiles.length})
        </h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${changedFiles.map(f => `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;padding:4px 10px;border-radius:6px;">${esc(f)}</span>`).join("")}
        </div>
      </div>` : "";

    const summarySection = review.summary ? `
      <div class="summary-box">
        <div class="summary-title">AI Executive Summary</div>
        <p class="summary-text">${esc(review.summary)}</p>
      </div>` : "";

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DevPulse Diagnostic Report — ${esc(review.pr_title || "Code Review")}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #ffffff;
      color: #334155;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 48px 40px;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Space Grotesk', sans-serif;
      color: #0f172a;
      margin-top: 0;
    }
    .btn-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 100;
    }
    .print-btn {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      font-family: 'Space Grotesk', sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
      transition: all 0.2s ease;
    }
    .print-btn:hover {
      background: #1e293b;
      transform: translateY(-1px);
    }
    @media print {
      .btn-container { display: none; }
      body { background: #ffffff; }
      .page { padding: 20px 10px; }
    }
    .header-divider {
      height: 4px;
      background: linear-gradient(90deg, #bef264 0%, #15803d 100%);
      margin-bottom: 24px;
      border-radius: 2px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 16px;
      border-radius: 12px;
    }
    .meta-item {
      font-size: 13px;
    }
    .meta-label {
      font-weight: 600;
      color: #64748b;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .meta-val {
      color: #1e293b;
      font-weight: 500;
    }
    .score-badge-container {
      display: flex;
      gap: 16px;
      margin-bottom: 32px;
    }
    .score-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 24px;
      min-width: 120px;
      text-align: center;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .score-num {
      font-size: 38px;
      font-weight: 700;
      font-family: 'Space Grotesk', sans-serif;
      line-height: 1;
      margin-bottom: 6px;
    }
    .score-lbl {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
    }
    .severity-bar {
      display: flex;
      gap: 8px;
      flex: 1;
    }
    .sev-card {
      border-radius: 10px;
      padding: 10px 14px;
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-width: 70px;
    }
    .sev-card-count {
      font-size: 22px;
      font-weight: 700;
      font-family: 'Space Grotesk', sans-serif;
      line-height: 1.2;
    }
    .sev-card-lbl {
      font-size: 9px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .cat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    @media (max-width: 768px) {
      .cat-grid { grid-template-columns: 1fr; }
      .meta-grid { grid-template-columns: 1fr; }
      .score-badge-container { flex-direction: column; }
    }
    .cat-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .cat-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .cat-title {
      font-weight: 600;
      font-size: 14px;
      color: #0f172a;
      font-family: 'Space Grotesk', sans-serif;
    }
    .cat-badge {
      margin-left: auto;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
    }
    .cat-desc {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 12px 0;
      line-height: 1.5;
    }
    .cat-findings-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cat-finding-item {
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 4px;
      border-bottom: 1px dashed #f1f5f9;
    }
    .cat-finding-item:last-child {
      border-bottom: none;
    }
    .cat-finding-title {
      color: #475569;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 10px;
      margin: 40px 0 20px 0;
      font-family: 'Space Grotesk', sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .summary-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #16a34a;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 32px;
    }
    .summary-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #15803d;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .summary-text {
      font-size: 13px;
      line-height: 1.6;
      color: #166534;
      margin: 0;
      white-space: pre-wrap;
    }
    .finding-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 20px;
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -2px rgba(0,0,0,0.02);
      page-break-inside: avoid;
    }
    .finding-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .badge-category {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .badge-confidence {
      margin-left: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
    }
    .finding-title {
      margin: 0 0 10px 0;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .finding-desc {
      margin: 0 0 16px 0;
      font-size: 13px;
      line-height: 1.6;
      color: #475569;
    }
    .file-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #334155;
      margin: 0 0 16px 0;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .code-section {
      margin-bottom: 16px;
    }
    .code-section:last-child {
      margin-bottom: 0;
    }
    .code-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .code-title-bad {
      color: #dc2626;
    }
    .code-title-good {
      color: #16a34a;
    }
    pre.code-block {
      font-family: 'JetBrains Mono', monospace;
      padding: 14px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 11.5px;
      line-height: 1.6;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .code-block-bad {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #dc2626;
    }
    .code-block-good {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #16a34a;
    }
    .footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body>
<div class="btn-container">
  <button class="print-btn" onclick="window.print()">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
    Save Report to PDF
  </button>
</div>
<div class="page">

  <!-- Cover Header -->
  <div style="border-bottom:1px solid #e2e8f0;padding-bottom:24px;margin-bottom:32px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <div style="background-color:#0f172a;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(15,23,42,0.15);">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bef264" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
      </div>
      <span style="font-family:'Space Grotesk',sans-serif;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">DevPulse AI &bull; Diagnostic Code Audit</span>
    </div>
    
    <div class="header-divider"></div>
    
    <h1 style="margin:0 0 10px;font-size:28px;font-weight:700;line-height:1.2;color:#0f172a;font-family:'Space Grotesk',sans-serif;">
      ${esc(review.pr_title || "Code Review Audit Report")}
    </h1>
    
    <div style="font-size:12px;color:#64748b;margin-bottom:24px;font-family:'JetBrains Mono',monospace;">
      ${review.repo_owner ? `${esc(review.repo_owner)}/${esc(review.repo_name)}` : ""}${review.pr_number ? ` &bull; PR #${review.pr_number}` : ""}${review.pr_author ? ` &bull; @${esc(review.pr_author)}` : ""}${review.branch_from ? ` &bull; ${esc(review.branch_from)} &rarr; ${esc(review.branch_to || "main")}` : ""}
    </div>

    <!-- Metadata Grid -->
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Target Repository</div>
        <div class="meta-val">${esc(review.repo_owner ?? "Local Source")}/${esc(review.repo_name ?? "Workspace")}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Diagnostic Authority</div>
        <div class="meta-val">DevPulse AI Audit Engine</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Review Date</div>
        <div class="meta-val">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Audit Scope Identifier</div>
        <div class="meta-val" style="font-family:'JetBrains Mono',monospace;font-size:11px;">${id.slice(0, 18)}...</div>
      </div>
    </div>

    <!-- Metrics Cards -->
    <div class="score-badge-container">
      <div class="score-card" style="background:${scoreBg(review.health_score || 0)};border-color:${scoreBorder(review.health_score || 0)};">
        <div class="score-num" style="color:${scoreColor(review.health_score || 0)};">${review.health_score ?? "—"}</div>
        <div class="score-lbl">Health Score</div>
      </div>
      
      <div class="severity-bar">
        ${[
          { sev: "crit", label: "Crit", details: SEV_DETAILS.crit },
          { sev: "high", label: "High", details: SEV_DETAILS.high },
          { sev: "med", label: "Med", details: SEV_DETAILS.med },
          { sev: "low", label: "Low", details: SEV_DETAILS.low },
        ].map(({ sev, label, details }) => {
          const cnt = sortedFindings.filter(f => f.severity === sev).length;
          return `<div class="sev-card" style="background:${details.bg};border:1px solid ${details.border};color:${details.text};">
            <div class="sev-card-count">${cnt}</div>
            <div class="sev-card-lbl">${details.label}</div>
          </div>`;
        }).join("")}
        <div class="sev-card" style="background:#f8fafc;border:1px solid #e2e8f0;color:#334155;">
          <div class="sev-card-count">${sortedFindings.filter(f => f.severity !== "ok").length}</div>
          <div class="sev-card-lbl">Total</div>
        </div>
      </div>
    </div>
  </div>

  ${filesSection}
  ${summarySection}

  <!-- Category Breakdown -->
  <div style="margin-bottom:32px;">
    <h2 class="section-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
      Category Breakdown
    </h2>
    <div class="cat-grid">${catCards}</div>
  </div>

  <!-- Findings -->
  <div>
    <h2 class="section-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      All Detected Findings (${sortedFindings.filter(f => f.severity !== "ok").length} issues)
    </h2>
    ${findingsHtml || `<div style="text-align:center;padding:36px;border:1px dashed #e2e8f0;border-radius:12px;background:#f8fafc;color:#16a34a;font-weight:600;font-family:'Space Grotesk',sans-serif;font-size:14px;display:flex;flex-direction:column;align-items:center;gap:8px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      No architectural flaws or vulnerabilities identified in this revision. Code is secure and optimized.
    </div>`}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>Generated automatically by DevPulse AI Diagnostics &bull; <a href="https://devpulse.app" target="_blank" style="color:#0f172a;font-weight:600;text-decoration:none;">devpulse.app</a></div>
    <div style="margin-top:4px;font-size:9px;color:#94a3b8;">Report SHA: ${id} &bull; ${new Date().toISOString()}</div>
  </div>
</div>
</body>
</html>`);
    win.document.close();
  }

  // ── Render guard ─────────────────────────────────────────────────────────
  if (!review) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <DevPulseLoader text="Retrieving review diagnostics..." />
        </div>
      </div>
    );
  }

  const activeF = filteredFindings.find(f => f.id === active) || sortedFindings.find(f => f.id === active);
  const isPrReview = !!(review.pr_number && review.repo_owner && review.repo_name);
  const isApiAnalysis = review.review_type === "api_analysis" || (review.pr_url && review.pr_url.includes("type=api"));
  const isComplete = review.status === "complete";
  const issueCount = sortedFindings.filter(f => f.severity !== "ok").length;
  const reviewerName = (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || "";
  const reviewerLogin = (user as any)?.user_metadata?.user_name || (user as any)?.email?.split("@")[0] || "";

  function copyShare() {
    navigator.clipboard.writeText(`${window.location.origin}/r/${review.share_token}`);
    toast.success("Share link copied");
  }

  return (
    <>
      {/* Post dialog */}
      <AnimatePresence>
        {showPostDialog && (
          <PostDialog
            open={showPostDialog}
            onClose={() => setShowPostDialog(false)}
            onPost={handlePost}
            posting={posting}
            reviewerName={reviewerName}
            reviewerLogin={reviewerLogin}
          />
        )}
      </AnimatePresence>

      {/* Email Report dialog */}
      <AnimatePresence>
        {showEmailDialog && (
          <EmailReportDialog
            open={showEmailDialog}
            onClose={() => setShowEmailDialog(false)}
            sending={emailSending}
            defaultEmail={user?.email || ""}
            onSend={async (email) => {
              setEmailSending(true);
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Please log in again");
                await emailReviewReport({
                  data: {
                    review_id: id,
                    email,
                    access_token: session.access_token,
                  },
                });
                toast.success("Health report sent successfully!");
                setShowEmailDialog(false);
              } catch (err: any) {
                toast.error(err.message || "Failed to send email");
              } finally {
                setEmailSending(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modals */}
      <AnimatePresence>
        {confirmDeleteOpen && (
          <ConfirmationModal
            isOpen={confirmDeleteOpen}
            onClose={() => setConfirmDeleteOpen(false)}
            onConfirm={executeDelete}
            title="Delete Permanently?"
            message="This will delete this review and all of its findings permanently. This action cannot be undone."
            confirmText="Delete"
            isDanger={true}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmRetryOpen && (
          <ConfirmationModal
            isOpen={confirmRetryOpen}
            onClose={() => setConfirmRetryOpen(false)}
            onConfirm={executeRetry}
            title="Re-analyze from scratch?"
            message="This will purge all current findings and run the codebase analysis again. Continue?"
            confirmText="Re-analyze"
            isDanger={false}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen">
        <AppNav />

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="border-b border-border bg-bg-elev">
          <div className="mx-auto max-w-[1240px] px-6 py-6">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 font-mono text-xs text-text-muted flex-wrap">
              {isApiAnalysis ? (
                <Database className="h-3.5 w-3.5 shrink-0 text-orange-400 animate-pulse" />
              ) : isPrReview ? (
                <GitPullRequest className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
              {review.repo_owner ? <span>{review.repo_owner}/{review.repo_name}</span> : <span>—</span>}
              {isApiAnalysis ? (
                <><ChevronRight className="h-3 w-3 text-text-faint" /><span className="rounded bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-orange-300">API & Backend Analysis</span></>
              ) : isPrReview ? (
                <><ChevronRight className="h-3 w-3 text-text-faint" /><span className="text-text-faint">PR #{review.pr_number}</span></>
              ) : (
                <><ChevronRight className="h-3 w-3 text-text-faint" /><span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Full Codebase Audit</span></>
              )}
              {review.pr_url && (
                <a href={review.pr_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-text-faint hover:text-foreground ml-1">
                  <ExternalLink className="h-3 w-3" /> GitHub
                </a>
              )}
              <span className="ml-auto inline-flex items-center gap-1 rounded bg-bg-code px-2 py-0.5 text-[10px] text-text-faint border border-border-faint font-mono">
                <Hash className="h-2.5 w-2.5" />{id.slice(0, 8)}
              </span>
            </div>

            {/* Title row */}
            <div className="mt-3 flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
                  {isApiAnalysis
                    ? `API & Backend Analysis — ${review.repo_owner}/${review.repo_name}`
                    : isPrReview
                      ? (review.pr_title ?? "PR Review")
                      : `Codebase Audit — ${review.repo_owner}/${review.repo_name}`}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-text-muted">
                  {isPrReview && review.pr_author && <span>@{review.pr_author}</span>}
                  {isPrReview && review.branch_from && (
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded bg-bg-soft px-1.5 py-0.5">{review.branch_from}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="rounded bg-bg-soft px-1.5 py-0.5">{review.branch_to}</span>
                    </span>
                  )}
                  {isPrReview && review.files_changed != null && (
                    <span>{review.files_changed} files · <span className="text-sev-ok">+{review.additions}</span> <span className="text-sev-crit">-{review.deletions}</span></span>
                  )}
                  {!isPrReview && review.files_changed != null && (
                    <span>{review.files_changed} files audited</span>
                  )}
                </div>

                {/* Status + actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusLine status={review.status} error={review.error_message} onRetry={retry} onDelete={handleDelete} />

                  {isComplete && isPrReview && (
                    <button
                      onClick={() => setShowPostDialog(true)}
                      disabled={posting}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 font-mono text-xs text-text-muted transition hover:border-primary/40 hover:text-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      <Github className="h-3 w-3" />
                      {posting ? "Posting…" : "Post to GitHub PR"}
                    </button>
                  )}

                  {isComplete && (
                    <button
                      onClick={handleExportPdf}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 font-mono text-xs text-text-muted transition hover:border-border-faint hover:text-foreground"
                    >
                      <FileText className="h-3 w-3" /> Export PDF
                    </button>
                  )}

                  {isComplete && (
                    <button
                      onClick={() => setShowEmailDialog(true)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 font-mono text-xs text-text-muted transition hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                    >
                      <Mail className="h-3 w-3" /> Email Report
                    </button>
                  )}
                </div>

                {/* Progress pipeline */}
                {(review.status === "pending" || review.status === "processing") && logSteps.length > 0 && (
                  <div className="mt-5 max-w-lg">
                    <AnimatedLog
                      steps={logSteps}
                      title={isApiAnalysis
                        ? `API & Backend Analysis · ${review.repo_owner}/${review.repo_name}`
                        : isPrReview
                          ? `PR Review · ${review.repo_owner}/${review.repo_name} #${review.pr_number}`
                          : `Codebase Audit · ${review.repo_owner}/${review.repo_name}`}
                    />
                  </div>
                )}
              </div>
              <HealthScore value={review.health_score} size={110} />
            </div>

            {/* Tab bar */}
            <div className="mt-6 flex gap-0 border-b border-border-faint overflow-x-auto">
              {(["issues", "categories", "summary", "files", "share"] as const).map(t => {
                if (isApiAnalysis && t === "categories") return null;
                return (
                  <button key={t} onClick={() => setTab(t)}
                    className={`-mb-px shrink-0 px-4 py-2.5 text-sm transition border-b-2 ${tab === t ? "border-primary text-foreground font-medium" : "border-transparent text-text-muted hover:text-foreground"}`}>
                    {t === "files" ? "Files Changed" : t === "categories" ? "Categories" : t.charAt(0).toUpperCase() + t.slice(1)}
                    {t === "issues" && issueCount > 0 && <span className="ml-1.5 rounded bg-bg-soft px-1.5 py-0.5 font-mono text-[10px]">{issueCount}</span>}
                    {t === "files" && (changedFiles.length > 0 || Object.keys(findingsByFile).length > 0) && <span className="ml-1.5 rounded bg-bg-soft px-1.5 py-0.5 font-mono text-[10px]">{changedFiles.length || Object.keys(findingsByFile).length}</span>}
                    {t === "categories" && findings.length > 0 && <span className="ml-1.5 rounded bg-bg-soft px-1.5 py-0.5 font-mono text-[10px]">{CATEGORY_CONFIG.filter(c => findings.some(f => f.category === c.id && f.severity !== "ok")).length}/6</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-[1240px] px-6 py-8">

          {/* ── ISSUES TAB ── */}
          {tab === "issues" && (
            <div className="space-y-4">
              {/* Category filter */}
              {!isApiAnalysis && (
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setCategoryFilter("all")}
                    className={`rounded-full px-3 py-1 font-mono text-[11px] border transition ${categoryFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:text-foreground"}`}>
                    All ({issueCount})
                  </button>
                  {CATEGORY_CONFIG.map(cat => {
                    const cnt = findings.filter(f => f.category === cat.id && f.severity !== "ok").length;
                    if (cnt === 0) return null;
                    const Icon = cat.icon;
                    return (
                      <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] border transition ${categoryFilter === cat.id ? `${cat.border} ${cat.bg} ${cat.text}` : "border-border text-text-muted hover:text-foreground"}`}>
                        <Icon className="h-3 w-3" />{cat.label} ({cnt})
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                {/* Sidebar */}
                <aside className="space-y-1">
                  {filteredFindings.filter(f => f.severity !== "ok").length === 0 ? (
                    <div className="rounded-lg border border-border bg-bg-elev p-6 text-center font-mono text-xs text-text-faint">
                      {review.status === "complete" ? "no issues in this category" : "waiting for findings…"}
                    </div>
                  ) : filteredFindings.filter(f => f.severity !== "ok").map((f: Finding) => {
                    const cfg = CATEGORY_CONFIG.find(c => c.id === f.category);
                    const Icon = cfg?.icon ?? Info;
                    return (
                      <button key={f.id} onClick={() => setActive(f.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${active === f.id ? "border-primary bg-bg-elev shadow-sm" : "border-border bg-bg-elev hover:border-border-faint"}`}>
                        <div className="flex items-center gap-2">
                          <SeverityBadge level={f.severity} />
                          {!isApiAnalysis && cfg && (
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                              <Icon className="h-2.5 w-2.5" />{f.category}
                            </span>
                          )}
                          <span className="ml-auto font-mono text-[10px] text-text-faint">{f.confidence}%</span>
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-foreground leading-snug">{f.title}</div>
                        <div className="font-mono text-[10px] text-text-faint mt-0.5">{f.file_path}{f.line_start ? `:${f.line_start}` : ""}</div>
                      </button>
                    );
                  })}
                </aside>

                {/* Detail pane */}
                <div className="min-w-0">
                  <AnimatePresence mode="wait">
                    {activeF ? (
                      <motion.div key={activeF.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                        {/* Sub-tabs */}
                        <div className="flex border-b border-border bg-bg-elev rounded-t-xl px-4 overflow-x-auto">
                          {[
                            { id: "analysis", label: "Analysis", icon: Info },
                            { id: "diff", label: "What We Have vs Fix", icon: Diff },
                            { id: "test", label: "QA & Verify", icon: FlaskConical },
                            { id: "github", label: "GitHub Actions", icon: Github },
                          ].map(sub => {
                            const Icon = sub.icon;
                            return (
                              <button key={sub.id} onClick={() => setFindingTab(sub.id as any)}
                                className={`shrink-0 flex items-center gap-1.5 px-4 py-3 font-mono text-xs border-b-2 -mb-px transition ${findingTab === sub.id ? "border-primary text-foreground font-semibold" : "border-transparent text-text-muted hover:text-foreground"}`}>
                                <Icon className="h-3.5 w-3.5" />{sub.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="rounded-b-xl border border-t-0 border-border bg-bg-elev p-6">
                          {/* Finding header */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <SeverityBadge level={activeF.severity} />
                            {!isApiAnalysis && activeF.category && (() => {
                              const cfg = CATEGORY_CONFIG.find(c => c.id === activeF.category);
                              const Icon = cfg?.icon ?? Info;
                              return (
                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest border ${cfg ? `${cfg.bg} ${cfg.border} ${cfg.text}` : "bg-bg-soft text-text-muted"}`}>
                                  <Icon className="h-3 w-3" />{activeF.category}
                                </span>
                              );
                            })()}
                            {activeF.confidence != null && (
                              <span className="ml-auto rounded bg-bg-soft px-2 py-0.5 font-mono text-[10px] text-text-faint">{activeF.confidence}% confidence</span>
                            )}
                          </div>
                          <h3 className="mt-3 text-xl font-semibold tracking-tight">{activeF.title}</h3>

                          {/* Analysis */}
                          {findingTab === "analysis" && (
                            <div className="mt-4 space-y-4">
                              <p className="text-sm leading-relaxed text-text-muted">{activeF.description}</p>
                              {activeF.file_path && (
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-soft px-3 py-2 font-mono text-xs text-text-muted">
                                  <Code className="h-3.5 w-3.5 shrink-0" />
                                  <span>{activeF.file_path}{activeF.line_start ? `:${activeF.line_start}` : ""}{activeF.line_end && activeF.line_end !== activeF.line_start ? `–${activeF.line_end}` : ""}</span>
                                </div>
                              )}
                              {activeF.bad_code && (
                                <div className="rounded-lg border border-sev-crit/15 bg-sev-crit/5 overflow-hidden">
                                  <div className="px-4 py-2 border-b border-sev-crit/10 font-mono text-[10px] uppercase tracking-widest text-sev-crit">Offending Block</div>
                                  <pre className="p-4 font-mono text-xs leading-relaxed text-text overflow-auto max-h-[300px]"><code>{activeF.bad_code}</code></pre>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Before / After */}
                          {findingTab === "diff" && (
                            <div className="mt-4 space-y-4">
                              <div className="rounded border border-border bg-bg-soft px-3 py-2 font-mono text-xs text-text-muted flex items-center justify-between">
                                <span><Code className="inline h-3 w-3 mr-1" />{activeF.file_path}</span>
                                {activeF.line_start && <span>Lines {activeF.line_start}{activeF.line_end && activeF.line_end !== activeF.line_start ? `–${activeF.line_end}` : ""}</span>}
                              </div>
                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-lg border border-sev-crit/20 bg-sev-crit/5 overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-2 border-b border-sev-crit/10 bg-sev-crit/10">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-sev-crit">⛔ What We Have</span>
                                    <span className="font-mono text-[9px] text-sev-crit/70">{activeF.line_start ? `:${activeF.line_start}` : ""}</span>
                                  </div>
                                  <pre className="p-4 font-mono text-xs leading-relaxed text-text overflow-auto max-h-[350px]"><code>{activeF.bad_code || "// No code captured"}</code></pre>
                                </div>
                                <div className="rounded-lg border border-sev-ok/20 bg-sev-ok/5 overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-2 border-b border-sev-ok/10 bg-sev-ok/10">
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-sev-ok">✅ What It Should Be</span>
                                    <button
                                      onClick={() => { navigator.clipboard.writeText(activeF.suggested_fix || ""); toast.success("Fix copied"); }}
                                      className="inline-flex items-center gap-1 rounded border border-sev-ok/20 px-1.5 py-0.5 font-mono text-[9px] text-sev-ok hover:bg-sev-ok/10 transition"
                                    >
                                      <Copy className="h-2.5 w-2.5" /> copy
                                    </button>
                                  </div>
                                  <pre className="p-4 font-mono text-xs leading-relaxed text-text overflow-auto max-h-[350px]"><code>{activeF.suggested_fix || "// No fix available"}</code></pre>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* QA & Verify */}
                          {findingTab === "test" && (
                            <div className="mt-4 space-y-4">
                              <div className="rounded-lg border border-border bg-bg-soft p-4">
                                <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-2">Confidence</div>
                                <div className="flex items-center gap-3">
                                  <div className="h-2 flex-1 rounded-full bg-border overflow-hidden">
                                    <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${activeF.confidence || 90}%` }} />
                                  </div>
                                  <span className="font-mono text-xs font-semibold">{activeF.confidence || 90}%</span>
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-bg-soft p-4">
                                <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-2">Location</div>
                                <code className="font-mono text-xs text-foreground">{activeF.file_path || "?"}{activeF.line_start ? `:${activeF.line_start}` : ""}</code>
                              </div>
                              <div className="rounded-lg border border-border bg-bg-soft p-4">
                                <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-3">Verification Checklist</div>
                                <QAChecklist finding={activeF} />
                              </div>
                            </div>
                          )}

                          {/* GitHub Actions */}
                          {findingTab === "github" && (
                            <div className="mt-4 space-y-5">
                              <div className="rounded-lg border border-border bg-bg-code p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">GitHub Suggestion Code Fence</div>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText("```suggestion\n" + (activeF.suggested_fix || "") + "\n```"); toast.success("Copied suggestion fence"); }}
                                    className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 font-mono text-[10px] text-text-muted hover:text-foreground"
                                  >
                                    <Copy className="h-2.5 w-2.5" /> copy
                                  </button>
                                </div>
                                <pre className="font-mono text-xs overflow-auto leading-relaxed max-h-[250px]">
                                  <code className="text-text-faint">{"```suggestion"}{"\n"}</code>
                                  <code className="text-sev-ok">{activeF.suggested_fix || "// No fix available"}</code>
                                  <code className="text-text-faint">{"\n```"}</code>
                                </pre>
                                <p className="mt-3 font-mono text-[10px] text-text-faint">When posted to GitHub as an inline PR comment, this renders as a one-click <strong className="text-text-muted">Apply suggestion</strong> button in the PR diff.</p>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-border bg-bg-elev p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Github className="h-4 w-4 text-primary" />
                                    <span className="font-mono text-xs font-semibold">Post Review to PR</span>
                                  </div>
                                  <p className="text-xs text-text-muted mb-3 leading-relaxed">Posts all findings with inline suggestion Apply buttons. Choose DevPulse or human voice.</p>
                                  {isPrReview ? (
                                    <button onClick={() => setShowPostDialog(true)} disabled={posting}
                                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2 font-mono text-xs text-primary hover:bg-primary/20 transition disabled:opacity-50">
                                      <Github className="h-3.5 w-3.5" />Post All Findings
                                    </button>
                                  ) : (
                                    <div className="rounded bg-bg-soft px-3 py-2 font-mono text-[10px] text-text-faint">PR reviews only</div>
                                  )}
                                </div>

                                <div className="rounded-xl border border-border bg-bg-elev p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <GitCommit className="h-4 w-4 text-sev-ok" />
                                    <span className="font-mono text-xs font-semibold">Apply Fix to Branch</span>
                                  </div>
                                  <p className="text-xs text-text-muted mb-3 leading-relaxed">Commits the complete fix directly to the PR branch — visible in GitHub immediately.</p>
                                  {isPrReview && activeF.suggested_fix ? (
                                    <button onClick={() => handleApplyFix(activeF.id)} disabled={applying === activeF.id}
                                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-sev-ok/30 bg-sev-ok/10 px-4 py-2 font-mono text-xs text-sev-ok hover:bg-sev-ok/20 transition disabled:opacity-50">
                                      <GitCommit className="h-3.5 w-3.5" />
                                      {applying === activeF.id ? "Committing…" : "Apply & Commit"}
                                    </button>
                                  ) : (
                                    <div className="rounded bg-bg-soft px-3 py-2 font-mono text-[10px] text-text-faint">
                                      {!isPrReview ? "PR reviews only" : "No fix for this finding"}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="rounded-lg border border-border-faint bg-bg-soft/50 px-4 py-3">
                                <p className="font-mono text-[10px] text-text-faint leading-relaxed">
                                  <strong className="text-text-muted">Branch:</strong> <code className="bg-bg-code rounded px-1 text-[9px]">{review.branch_from || "—"}</code> ·
                                  Applying commits directly. Review the diff in GitHub before merging. Inline suggestions require the exact line to be in the PR diff.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="rounded-xl border border-border bg-bg-elev p-12 text-center font-mono text-xs text-text-faint">
                        select a finding to inspect
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {/* ── CATEGORIES TAB ── */}
          {tab === "categories" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-bg-elev p-6">
                <h3 className="mt-2 text-lg font-medium">Six-dimension analysis</h3>
                <p className="mt-1 text-sm text-text-muted max-w-2xl">Every PR is evaluated across all six dimensions that separate a principal engineer's review from a basic linter. Each finding is precisely categorized so you know exactly what kind of problem you're dealing with.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryStats.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.id} className={`rounded-xl border ${cat.border} ${cat.bg} p-5 flex flex-col`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`flex items-center gap-2 ${cat.text}`}>
                          <Icon className="h-5 w-5" />
                          <span className="font-semibold">{cat.label}</span>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${cat.text} ${cat.bg} border ${cat.border}`}>{cat.count}</span>
                      </div>
                      <p className="font-mono text-[10px] text-text-faint mb-4">{cat.desc}</p>
                      {cat.findings.filter(f => f.severity !== "ok").length === 0 ? (
                        <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border p-4">
                          <Check className="h-4 w-4 text-sev-ok mr-2" />
                          <span className="font-mono text-[11px] text-sev-ok">clean</span>
                        </div>
                      ) : (
                        <div className="flex-1 space-y-1.5">
                          {cat.findings.filter(f => f.severity !== "ok").slice(0, 5).map((f: Finding) => (
                            <button key={f.id} onClick={() => { setActive(f.id); setTab("issues"); setCategoryFilter(cat.id); }}
                              className="w-full text-left rounded-lg border border-border/50 bg-bg-elev/60 px-3 py-2 hover:bg-bg-elev transition">
                              <div className="flex items-center gap-1.5 mb-0.5"><SeverityBadge level={f.severity} /></div>
                              <div className="truncate font-mono text-[11px] text-foreground">{f.title}</div>
                              {f.file_path && <div className="truncate font-mono text-[9px] text-text-faint mt-0.5">{f.file_path}{f.line_start ? `:${f.line_start}` : ""}</div>}
                            </button>
                          ))}
                          {cat.findings.filter(f => f.severity !== "ok").length > 5 && (
                            <button onClick={() => { setTab("issues"); setCategoryFilter(cat.id); }}
                              className={`w-full text-center font-mono text-[10px] py-1.5 rounded-lg ${cat.text} ${cat.bg} ${cat.border} border hover:opacity-80 transition`}>
                              +{cat.findings.filter(f => f.severity !== "ok").length - 5} more
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SUMMARY TAB ── */}
          {tab === "summary" && (
            <div className="rounded-xl border border-border bg-bg-elev p-8 space-y-6">
              <h3 className="text-lg font-medium border-b border-border pb-2">AI Architectural Summary</h3>
              {review.summary
                ? <div className="prose max-w-none">{parseMarkdown(review.summary)}</div>
                : <p className="text-sm text-text-muted">{review.status === "complete" ? "No summary." : "Summary will appear when review completes…"}</p>
              }
            </div>
          )}

          {/* ── FILES TAB ── */}
          {tab === "files" && (
            <div className="space-y-6">
              {/* Changed files from diff */}
              {changedFiles.length > 0 && (
                <div className="rounded-xl border border-border bg-bg-elev p-6">
                  <h3 className="text-base font-medium mb-3">Files changed in this PR ({changedFiles.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {changedFiles.map(f => {
                      const hasFindings = !!findingsByFile[f];
                      return (
                        <span key={f} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] ${hasFindings ? "border-sev-med/30 bg-sev-med/5 text-sev-med" : "border-border bg-bg-soft text-text-muted"}`}>
                          {hasFindings && <span className="h-1.5 w-1.5 rounded-full bg-sev-med" />}
                          {f}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files with findings */}
              <div className="rounded-xl border border-border bg-bg-elev p-6">
                <h3 className="text-base font-medium mb-1">Files with findings</h3>
                <p className="text-sm text-text-muted mb-0">Click any finding to inspect in the Issues tab.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.keys(findingsByFile).length === 0 ? (
                  <div className="col-span-2 rounded-xl border border-border bg-bg-elev p-12 text-center font-mono text-sm text-text-faint">No findings for any file.</div>
                ) : Object.entries(findingsByFile).map(([fp, ff]) => {
                  const sevs = (ff as Finding[]).map(x => x.severity);
                  const highest = ["crit","high","med","low","ok"].find(s => sevs.includes(s)) || "ok";
                  return (
                    <div key={fp} className="rounded-xl border border-border bg-bg-elev p-5 flex flex-col">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-sm font-semibold truncate">{fp.split("/").pop()}</div>
                          <div className="font-mono text-[10px] text-text-faint truncate mt-0.5">{fp}</div>
                        </div>
                        <SeverityBadge level={highest} />
                      </div>
                      <div className="font-mono text-[11px] text-text-muted mb-4">{(ff as Finding[]).length} issue{(ff as Finding[]).length !== 1 ? "s" : ""}</div>
                      <div className="space-y-1.5">
                        {(ff as Finding[]).map(f => {
                          const cfg = CATEGORY_CONFIG.find(c => c.id === f.category);
                          return (
                            <button key={f.id} onClick={() => { setActive(f.id); setTab("issues"); }}
                              className="w-full text-left rounded bg-bg-soft/50 hover:bg-bg-soft px-3 py-2 flex items-center gap-2 text-xs font-mono border border-transparent hover:border-border-faint transition">
                              <SeverityBadge level={f.severity} />
                              {cfg && <span className={`shrink-0 text-[9px] ${cfg.text}`}>{cfg.label}</span>}
                              <span className="truncate text-text-muted flex-1">{f.title}</span>
                              {f.line_start && <span className="shrink-0 text-text-faint text-[9px]">:{f.line_start}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SHARE TAB ── */}
          {tab === "share" && (
            <div className="max-w-2xl space-y-4">
              <div className="rounded-xl border border-border bg-bg-elev p-8">
                <h3 className="text-lg font-medium">Read-only URL</h3>
                <p className="mt-1 text-sm text-text-muted">Anyone with this link can view the review. They cannot edit or re-run it.</p>
                <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-bg-code px-3 py-2 font-mono text-sm">
                  <span className="truncate text-text-muted">{typeof window !== "undefined" ? window.location.origin : ""}/r/{review.share_token}</span>
                  <button onClick={copyShare} className="ml-auto inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-text-muted hover:text-foreground">
                    <Copy className="h-3 w-3" /> copy
                  </button>
                </div>
                <label className="mt-4 inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!review.is_public} onChange={async e => {
                    await supabase.from("reviews").update({ is_public: e.target.checked }).eq("id", id);
                    setReview({ ...review, is_public: e.target.checked });
                  }} />
                  <span>Public</span>
                  <span className="font-mono text-xs text-text-faint">— required for the link to work</span>
                </label>
              </div>

              <div className="rounded-xl border border-border bg-bg-elev p-6">
                <h3 className="text-base font-medium mb-3">Review Metadata</h3>
                <dl className="space-y-2 font-mono text-xs">
                  {[
                    ["Review ID", id],
                    ["Share Token", review.share_token],
                    ["Status", review.status],
                    ["Health Score", `${review.health_score ?? "—"}/100`],
                    ["Total Findings", findings.length],
                    ["Issues", issueCount],
                    ["Model", "DevPulse AI"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-4">
                      <dt className="text-text-faint w-32 shrink-0">{k}</dt>
                      <dd className="text-text">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── QA Checklist ─────────────────────────────────────────────────────────
function QAChecklist({ finding }: { finding: Finding }) {
  const cat = finding.category as CategoryId | null;
  const file = finding.file_path || "the target file";
  const lines = finding.line_start ? `lines ${finding.line_start}–${finding.line_end ?? finding.line_start}` : "the affected block";

  const checks: Record<string, string[]> = {
    security: [
      `Trigger the vulnerability in ${file} at ${lines} using adversarial input (empty string, null, SQL metacharacters, oversized payload)`,
      "Confirm auth/authz gates cannot be bypassed by manipulating query params, headers, or JWT claims",
      "Verify all user-supplied data is sanitized before use in queries, HTML output, or shell commands",
      "Run a static analysis tool (Semgrep / CodeQL) to detect similar patterns across the codebase",
      "Test with valid credentials, expired tokens, and forged tokens to confirm the fix is complete",
    ],
    performance: [
      `Profile the code path at ${lines} under 100+ concurrent requests and measure p50/p95/p99`,
      "Count database queries before and after the fix — verify no N+1 pattern remains",
      "Measure heap allocation delta using a profiler (Chrome DevTools / clinic.js / pprof)",
      "Benchmark cold vs warm path — confirm caching invalidation works correctly if added",
      "Load test the endpoint / function and verify CPU stays linear, not quadratic",
    ],
    architecture: [
      "Confirm the fixed module still has a single, well-defined responsibility",
      "Check for tight coupling: verify the fix doesn't require changes in unrelated modules",
      "Validate public API surface — ensure the right things are exposed, hidden, or configurable",
      "Review the abstraction level — ensure the fix isn't over-engineered or too specific",
      "Run the dependency graph tool and confirm no new circular imports were introduced",
    ],
    reliability: [
      `Pass null, undefined, empty string, and out-of-range values at ${lines} — verify graceful handling`,
      "Simulate network timeouts and partial failures — confirm the error path is complete",
      "Test concurrent access to any shared state in this code path",
      "Verify error messages are actionable for debugging but don't leak sensitive info",
      "Confirm all error paths are logged at the appropriate level (warn vs error vs fatal)",
    ],
    testability: [
      "Write a regression test that would have caught this issue before the fix was applied",
      "Verify the fixed code can be unit-tested in isolation without external services",
      "Confirm the function has clear inputs/outputs with no hidden global state side effects",
      "Add boundary value tests: empty collections, max-length strings, zero, negatives",
      "Verify mocks/stubs exist for all external dependencies touched by this fix",
    ],
    readability: [
      "Have a team member read the fixed code cold — confirm intent is immediately clear",
      "Check all new variable and function names against the project's naming conventions",
      "Verify magic constants are extracted to named constants with explanatory names",
      "Run the formatter and linter — ensure zero style violations in the changed lines",
      "Confirm any non-obvious 'why' (not 'what') is documented in a one-line comment",
    ],
  };

  const items = checks[cat || ""] || [
    `Locate the block in ${file} at ${lines} and apply the fix`,
    "Run the full test suite and confirm no regressions",
    "Write a targeted test for the scenario described in this finding",
    "Pass boundary values to verify edge cases are handled",
  ];

  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-xs text-text-muted leading-relaxed">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[9px] text-text-faint">{i + 1}</span>
          {item}
        </li>
      ))}
    </ol>
  );
}

// ── Status Line ───────────────────────────────────────────────────────────
function StatusLine({ status, error, onRetry, onDelete }: { status: string; error: string | null; onRetry: () => void; onDelete: () => void }) {
  if (status === "pending" || status === "processing") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md bg-bg-soft px-3 py-1.5 font-mono text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-sev-med dp-pulse" />
        {status === "pending" ? "queued" : "analyzing…"}
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-2 rounded-md bg-sev-crit/10 px-3 py-1.5 font-mono text-xs text-sev-crit">
          failed: {error?.slice(0, 60) ?? "unknown"}
          <button onClick={onRetry} className="ml-2 inline-flex items-center gap-1 rounded border border-sev-crit/40 px-1.5 py-0.5">
            <RefreshCw className="h-3 w-3" /> retry
          </button>
        </div>
        <button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 font-mono text-xs text-text-muted hover:text-sev-crit transition">
          <Trash2 className="h-3 w-3" /> delete
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 font-mono text-xs text-accent-foreground">
        <Check className="h-3 w-3" /> complete
      </div>
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 font-mono text-xs text-text-muted hover:text-foreground transition">
        <RefreshCw className="h-3 w-3" /> re-review
      </button>
      <button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 font-mono text-xs text-text-muted hover:text-sev-crit transition">
        <Trash2 className="h-3 w-3" /> delete
      </button>
    </div>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────
function parseMarkdown(text: string) {
  if (!text) return null;
  return (
    <div className="space-y-1">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (t.startsWith("### ")) return <h4 key={i} className="mt-6 mb-3 first:mt-0 text-base font-semibold border-b border-border-faint pb-1.5">{parseInline(t.slice(4))}</h4>;
        if (t.startsWith("## ")) return <h3 key={i} className="mt-8 mb-3 first:mt-0 text-lg font-semibold">{parseInline(t.slice(3))}</h3>;
        if (t.startsWith("- ") || t.startsWith("* ")) return <li key={i} className="ml-4 list-disc text-sm text-text-muted leading-relaxed mb-1.5">{parseInline(t.slice(2))}</li>;
        if (t.length > 0) return <p key={i} className="text-sm text-text-muted leading-relaxed mb-3">{parseInline(t)}</p>;
        return null;
      })}
    </div>
  );
}

function parseInline(text: string) {
  return text.split(/(\*\*.*?\*\*|`.*?`)/).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="rounded bg-bg-code px-1.5 py-0.5 font-mono text-xs text-primary">{p.slice(1, -1)}</code>;
    return p;
  });
}
