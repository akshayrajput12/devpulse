import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Star, X, MessageSquare, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const QUICK_TAGS = [
  { id: "extremely_accurate", label: "Extremely Accurate" },
  { id: "mostly_helpful", label: "Mostly Helpful" },
  { id: "false_positives", label: "False Positives" },
  { id: "needs_improvement", label: "Needs Work" },
];

export function FeedbackModal() {
  const { user } = useAuth();
  const location = useLocation();

  const [showModal, setShowModal] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const [currentReviewId, setCurrentReviewId] = useState<string | null>(null);
  const [currentReviewType, setCurrentReviewType] = useState<string | null>(null);

  // 1. Initial mounting check: Verify if the user already submitted feedback in DB or LocalStorage
  useEffect(() => {
    if (!user) return;

    const checkFeedbackStatus = async () => {
      // First check local storage for fast skip
      if (localStorage.getItem("devpulse_feedback_submitted") === "true") {
        setAlreadySubmitted(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_feedback" as any)
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (!error && data && data.length > 0) {
          setAlreadySubmitted(true);
          localStorage.setItem("devpulse_feedback_submitted", "true");
        }
      } catch (err) {
        console.warn("[Feedback] Status fetch failed, normal for first-run migrations:", err);
      }
    };

    checkFeedbackStatus();
  }, [user]);

  // 2. Routing listener and 25-second active scan countdown trigger
  useEffect(() => {
    if (!user || alreadySubmitted || showModal) return;

    const pathname = location.pathname;
    const isReview = /^\/reviews\/([^/]+)$/.exec(pathname);
    const isFolder = /^\/folder-analysis_\/([^/]+)$/.exec(pathname);
    const isDashboard = pathname === "/dashboard" || pathname === "/";

    // Suppression boundary: suppress if dismissed in the last 24 hours
    const dismissedAt = localStorage.getItem("devpulse_feedback_dismissed_at");
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) {
        return; 
      }
    }

    let activeTimer: any = null;

    if (isReview) {
      const reviewId = isReview[1];
      const checkReviewComplete = async () => {
        try {
          const { data } = await (supabase
            .from("reviews")
            .select("status")
            .eq("id", reviewId)
            .maybeSingle() as any);

          if (data && data.status === "complete") {
            setCurrentReviewId(reviewId);
            setCurrentReviewType("pr");
            
            // Set 25-second active engagement countdown timer!
            activeTimer = setTimeout(() => {
              setShowModal(true);
            }, 25000);
          }
        } catch (err) {
          console.error(err);
        }
      };
      checkReviewComplete();
    } else if (isFolder) {
      const folderId = isFolder[1];
      const checkFolderComplete = async () => {
        try {
          const { data } = await (supabase
            .from("folder_analyses" as any)
            .select("status")
            .eq("id", folderId)
            .maybeSingle() as any);

          if (data && data.status === "complete") {
            setCurrentReviewId(folderId);
            setCurrentReviewType("folder");
            
            // Set 25-second active engagement countdown timer!
            activeTimer = setTimeout(() => {
              setShowModal(true);
            }, 25000);
          }
        } catch (err) {
          console.error(err);
        }
      };
      checkFolderComplete();
    } else if (isDashboard) {
      // Trigger A: Onboarding post-login dashboard delay loader
      const checkDashboardTrigger = async () => {
        const tourSeen = localStorage.getItem("devpulse_dashboard_tour_seen") === "true";
        if (!tourSeen) return;

        try {
          // Check if they have at least one complete review in reviews or folder analyses
          const { count: reviewCount } = await supabase
            .from("reviews")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "complete");

          const { count: folderCount } = await supabase
            .from("folder_analyses" as any)
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "complete");

          const totalCompleted = (reviewCount || 0) + (folderCount || 0);
          if (totalCompleted > 0) {
            // Wait 5 seconds after landing on the dashboard
            activeTimer = setTimeout(() => {
              setShowModal(true);
            }, 5000);
          }
        } catch (err) {
          console.error(err);
        }
      };
      checkDashboardTrigger();
    }

    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer);
      }
    };
  }, [location.pathname, user, alreadySubmitted, showModal]);

  const handleDismiss = () => {
    setShowModal(false);
    localStorage.setItem("devpulse_feedback_dismissed_at", Date.now().toString());
    toast.info("Feedback dismissed. We'll ask again later!", {
      duration: 3000,
    });
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (rating === 0) {
      toast.error("Please select a star rating before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase.from("user_feedback" as any) as any).insert({
        user_id: user.id,
        rating,
        comments,
        selected_tags: selectedTags,
        review_id: currentReviewId || null,
        review_type: currentReviewType || null,
      });

      if (error) throw error;

      setSubmittedSuccess(true);
      localStorage.setItem("devpulse_feedback_submitted", "true");
      setAlreadySubmitted(true);

      // Auto close after 2 seconds
      setTimeout(() => {
        setShowModal(false);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-300 text-foreground">
        
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          disabled={submitting || submittedSuccess}
          className="absolute right-4 top-4 rounded-lg border border-border bg-bg-soft p-1.5 text-text-muted hover:text-foreground transition-all cursor-pointer disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Dynamic Inner Panel */}
        {submittedSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/30 text-primary animate-bounce">
              <Check className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight">Thank You!</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Your feedback has been logged securely. We really appreciate your help in refining DevPulse!
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header Title */}
            <div className="space-y-1 pr-8">
              <span className="text-[10px] font-bold tracking-widest text-primary font-mono uppercase flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Community Feedback
              </span>
              <h2 className="text-lg font-bold tracking-tight">How was your DevPulse experience?</h2>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Help us keep our AI scans accurate and lightning-fast. Takes just 15 seconds!
              </p>
            </div>

            {/* Stars Rating Container */}
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
                Rate Scanner Accuracy
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="group p-1 bg-transparent border-0 cursor-pointer outline-none transition hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`h-7 w-7 transition-all ${
                          isActive
                            ? "fill-primary text-primary drop-shadow-[0_0_8px_rgba(190,242,100,0.4)] dark:drop-shadow-[0_0_12px_#bef264]"
                            : "text-text-faint hover:text-text-muted"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick tag sentiment selection */}
            <div className="space-y-2">
              <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
                Quick Sentiment Assessment
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium font-sans border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary border-primary text-primary-ink shadow-lg"
                          : "border-border bg-bg-soft text-text-muted hover:text-foreground hover:border-text-muted/40"
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional suggestions textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
                  Comments & Suggestions
                </label>
                <span className="text-[9px] font-mono text-text-faint">Optional</span>
              </div>
              <div className="relative">
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Tell us what we can improve, or any false positives you flagged..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 font-sans text-xs text-foreground placeholder:text-text-faint outline-none focus:border-primary/50 transition-all resize-none"
                />
                <MessageSquare className="absolute bottom-3 right-3 h-4 w-4 text-text-faint pointer-events-none" />
              </div>
            </div>

            {/* Actions Button */}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4 mt-2">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={submitting}
                className="text-xs text-text-muted hover:text-foreground transition-all bg-transparent border-0 cursor-pointer font-semibold"
              >
                Maybe Later
              </button>

              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="rounded-lg bg-primary text-primary-ink px-4 py-2.5 text-xs font-bold transition-all shadow-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? "Saving Assessment..." : "Submit Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
