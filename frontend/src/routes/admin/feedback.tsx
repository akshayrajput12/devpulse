import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { 
  Star, Search, MessageSquare, Calendar, TrendingUp, Sparkles, 
  Play, Pause, Volume2, VolumeX, X, Shield, Activity, Clock, ArrowUpRight 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedbackPage,
});

type FeedbackRecord = {
  id: string;
  user_id: string;
  rating: number;
  comments: string | null;
  selected_tags: string[] | null;
  review_id: string | null;
  review_type: string | null;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
    plan: string;
  };
  linked_review?: {
    pr_title: string | null;
    pr_url: string | null;
    health_score: number | null;
  };
};

function AdminFeedbackPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");

  // Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      // 1. Fetch raw feedback list
      const { data: rawFeedback, error: fbErr } = await (supabase
        .from("user_feedback" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (fbErr) throw fbErr;
      if (!rawFeedback) {
        setRecords([]);
        return;
      }

      // 2. Fetch all profiles to map user metadata manually
      const { data: profilesList, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_url, plan");

      // 3. Fetch all reviews to map review data manually
      const { data: reviewsList, error: revErr } = await supabase
        .from("reviews")
        .select("id, pr_title, pr_url, health_score");

      // 4. Map records securely
      const mappedRecords: FeedbackRecord[] = (rawFeedback as any[]).map((fb) => {
        const matchedProfile = profilesList?.find((p) => p.id === fb.user_id);
        const matchedReview = reviewsList?.find((r) => r.id === fb.review_id);

        return {
          id: fb.id,
          user_id: fb.user_id,
          rating: fb.rating,
          comments: fb.comments,
          selected_tags: fb.selected_tags,
          review_id: fb.review_id,
          review_type: fb.review_type,
          created_at: fb.created_at,
          user_profile: matchedProfile ? {
            display_name: matchedProfile.display_name,
            email: matchedProfile.email,
            avatar_url: matchedProfile.avatar_url,
            plan: matchedProfile.plan || "free",
          } : undefined,
          linked_review: matchedReview ? {
            pr_title: matchedReview.pr_title,
            pr_url: matchedReview.pr_url,
            health_score: matchedReview.health_score,
          } : undefined,
        };
      });

      setRecords(mappedRecords);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load feedback records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  // Compute Metrics Statistics
  const stats = useMemo(() => {
    if (records.length === 0) return { total: 0, average: 0, accuracyRate: 0 };

    const total = records.length;
    const sum = records.reduce((acc, r) => acc + r.rating, 0);
    const average = parseFloat((sum / total).toFixed(1));

    // Calculate accurate scans percentage (feedback rated 4+ stars or having accurate tags)
    const accurateCount = records.filter(
      (r) => 
        r.rating >= 4 || 
        r.selected_tags?.includes("extremely_accurate") || 
        r.selected_tags?.includes("mostly_helpful")
    ).length;
    const accuracyRate = parseFloat(((accurateCount / total) * 100).toFixed(1));

    return { total, average, accuracyRate };
  }, [records]);

  // Apply Search & Filters
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch = 
        !searchQuery.trim() ||
        (r.comments || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.user_profile?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.user_profile?.display_name || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating = 
        selectedRating === "all" || 
        r.rating === parseInt(selectedRating, 10);

      const matchesTag = 
        selectedTagFilter === "all" || 
        r.selected_tags?.includes(selectedTagFilter);

      return matchesSearch && matchesRating && matchesTag;
    });
  }, [records, searchQuery, selectedRating, selectedTagFilter]);

  // Video controller handlers
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setVideoProgress(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setVideoDuration(videoRef.current.duration);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || videoDuration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    videoRef.current.currentTime = percentage * videoDuration;
  };

  const formatVideoTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-8 font-sans text-foreground">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Registry Panel
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">User Feedback & Ratings</h1>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
            Monitor real-time AI scanner accuracy assessments, user star scores, and diagnostic system recommendations.
          </p>
        </div>

        <button
          onClick={() => fetchFeedback()}
          className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-semibold hover:bg-bg-soft transition-all duration-200 cursor-pointer self-start"
        >
          <Activity className="h-3.5 w-3.5" />
          Refresh Registry
        </button>
      </div>

      {/* Statistics dashboard row */}
      {loading ? null : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Average Rating Card */}
          <div className="rounded-xl border border-border bg-bg-elev/40 p-5 flex flex-col justify-between relative overflow-hidden group shadow-lg">
            <div className="absolute inset-0 bg-primary/[0.01] pointer-events-none group-hover:bg-primary/[0.03] transition-all" />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Average Rating</span>
              <Star className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-4xl font-extrabold leading-none">{stats.average}</span>
              <div className="flex flex-col justify-end space-y-0.5 pb-1">
                <div className="flex gap-0.5 text-primary">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${s <= Math.round(stats.average) ? "fill-primary" : "opacity-35"}`} />
                  ))}
                </div>
                <span className="font-mono text-[8px] text-text-muted uppercase">From {stats.total} total reviews</span>
              </div>
            </div>
          </div>

          {/* Accuracy Score Card */}
          <div className="rounded-xl border border-border bg-bg-elev/40 p-5 flex flex-col justify-between relative overflow-hidden group shadow-lg">
            <div className="absolute inset-0 bg-primary/[0.01] pointer-events-none group-hover:bg-primary/[0.03] transition-all" />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Accuracy Satisfaction</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-extrabold leading-none text-primary">{stats.accuracyRate}%</span>
              <span className="text-[10px] text-text-muted font-mono pb-1 uppercase">Positive Scan Accuracy</span>
            </div>
          </div>

          {/* Total Submissions Card */}
          <div className="rounded-xl border border-border bg-bg-elev/40 p-5 flex flex-col justify-between relative overflow-hidden group shadow-lg">
            <div className="absolute inset-0 bg-primary/[0.01] pointer-events-none group-hover:bg-primary/[0.03] transition-all" />
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Total Submissions</span>
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-extrabold leading-none">{stats.total}</span>
              <span className="text-[10px] text-text-muted font-mono pb-1 uppercase">Saved In Database</span>
            </div>
          </div>
        </div>
      )}

      {/* Loader */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-4">
          <DevPulseLoader />
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary animate-pulse">
            Querying feedback records...
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Filtering Console Card */}
          <div className="rounded-xl border border-border bg-bg-elev/30 p-5 space-y-4 shadow-md">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search comments, emails, names..."
                  className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 pl-10 font-sans text-xs text-foreground placeholder:text-text-faint outline-none focus:border-primary/50 transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint" />
              </div>

              {/* Star Rating Select */}
              <div className="w-full lg:w-48">
                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 font-mono text-xs text-foreground outline-none focus:border-primary/50 transition-all"
                >
                  <option value="all">Filter Rating: All</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              {/* Sentiment Tag Select */}
              <div className="w-full lg:w-56">
                <select
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 font-mono text-xs text-foreground outline-none focus:border-primary/50 transition-all"
                >
                  <option value="all">Filter Tag: All</option>
                  <option value="extremely_accurate">Extremely Accurate</option>
                  <option value="mostly_helpful">Mostly Helpful</option>
                  <option value="false_positives">False Positives</option>
                  <option value="needs_improvement">Needs Work</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results table */}
          {filteredRecords.length === 0 ? (
            <div className="rounded-xl border border-border border-dashed py-16 text-center text-text-muted text-sm flex flex-col items-center justify-center gap-3">
              <MessageSquare className="h-8 w-8 text-text-faint" />
              <span>No feedback records found matching your filters.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="group relative rounded-xl border border-border bg-bg-elev/40 p-5 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(190,242,100,0.03)] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left Side: Profile & Ratings */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="h-10 w-10 shrink-0 rounded-full border border-border overflow-hidden bg-bg-soft flex items-center justify-center text-text-muted font-bold text-sm">
                        {rec.user_profile?.avatar_url ? (
                          <img src={rec.user_profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (rec.user_profile?.display_name || rec.user_profile?.email || "?")[0].toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {rec.user_profile?.display_name || "Anonymous User"}
                          </span>
                          <span className="rounded bg-primary/10 border border-primary/20 text-primary font-mono text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
                            {rec.user_profile?.plan || "free"}
                          </span>
                        </div>
                        <span className="block text-[10px] text-text-muted truncate font-mono mt-0.5">
                          {rec.user_profile?.email || "No email verified"}
                        </span>
                      </div>
                    </div>

                    {/* Stars and Tags */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex gap-0.5 text-primary">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= rec.rating ? "fill-primary" : "opacity-25"}`} />
                        ))}
                      </div>
                      
                      {rec.selected_tags && rec.selected_tags.map((tag) => {
                        const tagLabel = tag.replace(/_/g, " ").toUpperCase();
                        const isPositive = tag === "extremely_accurate" || tag === "mostly_helpful";
                        return (
                          <span
                            key={tag}
                            className={`rounded-md font-mono text-[8px] font-bold px-2 py-0.5 border uppercase tracking-wider ${
                              isPositive
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-orange-500/10 border-orange-500/20 text-orange-400"
                            }`}
                          >
                            {tagLabel}
                          </span>
                        );
                      })}
                    </div>

                    {/* Comments */}
                    {rec.comments && (
                      <p className="text-xs text-text-muted leading-relaxed font-sans italic pl-1.5 border-l border-border/80 max-w-2xl">
                        "{rec.comments}"
                      </p>
                    )}
                  </div>

                  {/* Right Side: Scan details & Actions */}
                  <div className="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-center gap-3 shrink-0 border-t md:border-t-0 border-border/40 pt-4 md:pt-0">
                    <div className="text-left md:text-right space-y-0.5">
                      <span className="font-mono text-[8px] uppercase tracking-wider text-text-faint flex items-center gap-1 md:justify-end">
                        <Clock className="h-3 w-3" />
                        {new Date(rec.created_at).toLocaleDateString()}
                      </span>
                      {rec.review_type && (
                        <span className="block font-mono text-[9px] text-text-muted uppercase">
                          Scan Source: {rec.review_type === "folder" ? "Folder Analysis" : "PR Code Audit"}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedRecord(rec);
                        setIsPlaying(true);
                      }}
                      className="rounded-lg bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 text-xs font-bold hover:bg-primary hover:text-primary-ink transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                    >
                      View Session
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Global Details Video Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans bg-black/75 dark:bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl animate-in zoom-in-95 duration-300 text-foreground grid grid-cols-1 lg:grid-cols-2">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedRecord(null);
                setIsPlaying(false);
              }}
              className="absolute right-4 top-4 z-[99999] rounded-lg border border-border bg-bg-soft p-1.5 text-text-muted hover:text-foreground transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Left Column: Full Details */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[90vh] lg:max-h-none border-b lg:border-b-0 lg:border-r border-border/80">
              
              {/* User details */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold tracking-widest text-primary font-mono uppercase flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Diagnostic Session Details
                </span>
                <div className="flex items-center gap-4 border-b border-border/60 pb-4">
                  <div className="h-12 w-12 rounded-full border border-border overflow-hidden bg-bg-soft flex items-center justify-center text-text-muted font-bold text-lg">
                    {selectedRecord.user_profile?.avatar_url ? (
                      <img src={selectedRecord.user_profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (selectedRecord.user_profile?.display_name || selectedRecord.user_profile?.email || "?")[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      {selectedRecord.user_profile?.display_name || "Anonymous User"}
                      <span className="rounded bg-primary/10 border border-primary/20 text-primary font-mono text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
                        {selectedRecord.user_profile?.plan || "free"}
                      </span>
                    </h3>
                    <span className="font-mono text-[10px] text-text-muted">{selectedRecord.user_profile?.email}</span>
                  </div>
                </div>
              </div>

              {/* Assessment Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-soft/40 border border-border p-3.5 rounded-xl">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">User Score</span>
                  <div className="flex items-center gap-1 text-primary mt-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= selectedRecord.rating ? "fill-primary" : "opacity-25"}`} />
                    ))}
                  </div>
                </div>
                <div className="bg-bg-soft/40 border border-border p-3.5 rounded-xl">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Submitted Date</span>
                  <div className="font-mono text-xs font-semibold mt-2.5 uppercase text-foreground/90 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {new Date(selectedRecord.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Sentiment tags */}
              {selectedRecord.selected_tags && selectedRecord.selected_tags.length > 0 && (
                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Selected sentiments</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.selected_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold font-mono border bg-bg-soft border-border text-text-muted uppercase tracking-wider"
                      >
                        {tag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Suggestions */}
              {selectedRecord.comments && (
                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Comments suggestions</label>
                  <div className="rounded-xl border border-border bg-bg-soft/30 p-4 font-sans text-xs text-foreground/90 leading-relaxed italic border-l-2 border-l-primary shadow-sm">
                    "{selectedRecord.comments}"
                  </div>
                </div>
              )}

              {/* Match Scan Details */}
              {selectedRecord.review_id && (
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-text-muted block">Linked Scan Audit</label>
                  <div className="rounded-xl border border-border bg-bg-soft/40 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-text-faint">Scan ID</span>
                      <span className="font-mono text-[10px] text-text-muted">{selectedRecord.review_id}</span>
                    </div>
                    {selectedRecord.linked_review?.pr_title ? (
                      <div className="space-y-1">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-text-faint">PR Title</span>
                        <div className="text-xs font-semibold text-foreground leading-snug">
                          {selectedRecord.linked_review.pr_title}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-text-faint italic">No detailed PR details linked.</div>
                    )}
                    {selectedRecord.linked_review?.pr_url && (
                      <a
                        href={selectedRecord.linked_review.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                      >
                        Open GitHub PR Source
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Custom Cyberpunk Walkthrough Video Player */}
            <div className="p-6 md:p-8 space-y-4 bg-bg-soft/20 flex flex-col justify-center max-h-[90vh] lg:max-h-none">
              
              <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2 font-mono text-[10px] text-text-muted">
                <span>DIAGNOSTIC PROCESSOR VIDEO PLAYER</span>
                <span className="text-primary font-bold">SESSION ACTIVE</span>
              </div>

              {/* Customizable Video Container */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-primary/30 bg-black shadow-2xl flex flex-col justify-end group">
                <video
                  ref={videoRef}
                  src="/intro.mp4"
                  className="w-full h-full object-cover pointer-events-none"
                  loop
                  muted={isMuted}
                  autoPlay={isPlaying}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                />

                {/* Cyberpunk Video Controls Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 space-y-3 opacity-90 transition-opacity duration-300 flex flex-col justify-end">
                  
                  {/* Progress Timeline Bar */}
                  <div className="space-y-1">
                    <div 
                      onClick={handleProgressBarClick}
                      className="h-1.5 w-full bg-bg-soft border border-border rounded-full cursor-pointer overflow-hidden relative"
                    >
                      <div 
                        className="h-full bg-primary relative rounded-full"
                        style={{ width: `${videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0}%` }}
                      >
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 bg-foreground border border-primary rounded-full" />
                      </div>
                    </div>
                    <div className="flex justify-between font-mono text-[9px] text-text-muted">
                      <span>{formatVideoTime(videoProgress)}</span>
                      <span>{formatVideoTime(videoDuration)}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePlayPause}
                        className="rounded bg-primary/20 border border-primary/30 p-1.5 text-primary hover:bg-primary hover:text-primary-ink transition-all cursor-pointer outline-none"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={handleToggleMute}
                        className="rounded bg-bg-soft border border-border p-1.5 text-text-muted hover:text-foreground transition-all cursor-pointer outline-none"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                    </div>

                    <span className="font-mono text-[8px] uppercase tracking-wider text-text-faint">
                      DevPulse Diagnostic Scan Demonstrator
                    </span>
                  </div>

                </div>
              </div>

              {/* Details explanation below player */}
              <div className="rounded-xl border border-border/80 bg-black/40 p-4 font-mono text-[10px] leading-relaxed text-emerald-400 space-y-1.5 shadow-inner">
                <div className="flex justify-between text-text-faint border-b border-border/20 pb-1 mb-2">
                  <span>DASHBOARD METRICS AUDIT REPORT</span>
                  <span>FEED ID: {selectedRecord.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div>&gt; Loaded linked scan metadata... <span className="text-emerald-300">SUCCESS</span></div>
                <div>&gt; Analysis completed in 6.4s at {new Date(selectedRecord.created_at).toLocaleTimeString()}.</div>
                <div>&gt; User rating registered: {selectedRecord.rating} / 5 Stars.</div>
                <div>&gt; Sentiment classification tags: [{selectedRecord.selected_tags?.join(", ") || ""}]</div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
