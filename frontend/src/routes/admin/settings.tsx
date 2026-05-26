import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getAdminMetrics, getAdminSettings, updateAdminSettings } from "./-admin.functions";
import { DevPulseLoader } from "@/components/DevPulseLoader";
import {
  AnimatedIconsStyles,
  ActivityIcon,
  GeminiIcon,
  OpenAIIcon,
  DualSystemIcon,
  ShieldIcon,
  CompassIcon,
  SettingsIcon,
} from "@/components/AnimatedIcons";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type Metrics = {
  usersCount: number;
  reviewsCount: number;
  failedCount: number;
  pendingQueueCount: number;
  avgScore: number;
};

function AdminSettings() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai" | "both">("both");
  const [parallelEnabled, setParallelEnabled] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const fetchSettingsAndMetrics = async () => {
    if (!session?.access_token) return;
    try {
      const [metricsRes, settingsRes] = await Promise.all([
        getAdminMetrics({ data: { access_token: session.access_token } }),
        getAdminSettings({ data: { access_token: session.access_token } }).catch((err) => {
          console.error("Failed to load AI settings:", err);
          return { ai_provider: "both", parallel_engine_enabled: true };
        }),
      ]);
      setMetrics(metricsRes.metrics);
      if (settingsRes && settingsRes.ai_provider) {
        setAiProvider(settingsRes.ai_provider as "gemini" | "openai" | "both");
      }
      if (settingsRes && settingsRes.parallel_engine_enabled !== undefined) {
        setParallelEnabled(settingsRes.parallel_engine_enabled);
      }
    } catch (e: any) {
      console.error("Failed to load settings data:", e);
      toast.error(e.message || "Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProvider = async (provider: "gemini" | "openai" | "both") => {
    if (!session?.access_token) return;
    setUpdatingSettings(true);
    try {
      const res = await updateAdminSettings({
        data: {
          access_token: session.access_token,
          ai_provider: provider,
        },
      });
      if (res && res.ok) {
        setAiProvider(provider);
        toast.success(`AI updated to ${provider.toUpperCase()}`);
      }
    } catch (e: any) {
      console.error("Failed to update AI provider:", e);
      toast.error(e.message || "Failed to update AI settings");
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleUpdateParallel = async (enabled: boolean) => {
    if (!session?.access_token) return;
    setUpdatingSettings(true);
    try {
      const res = await updateAdminSettings({
        data: {
          access_token: session.access_token,
          parallel_engine_enabled: enabled,
        },
      });
      if (res && res.ok) {
        setParallelEnabled(enabled);
        toast.success(`Speed Booster ${enabled ? "ON" : "OFF"}`);
      }
    } catch (e: any) {
      console.error("Failed to update parallel settings:", e);
      toast.error(e.message || "Failed to update scanner speed settings");
    } finally {
      setUpdatingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndMetrics();
  }, [session]);

  if (loading || !metrics) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <DevPulseLoader />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-sans">
      <AnimatedIconsStyles />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-medium tracking-tightest mt-1 text-foreground font-sans">AI Settings</h1>
        <p className="text-xs text-text-muted mt-1 leading-relaxed font-sans">
          Configure model options, batch processing parameters, system backup configurations, and active service statuses.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Controller Options */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Settings Section */}
          <div className="rounded-xl border border-border bg-bg-elev p-6 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary font-semibold">
                  <SettingsIcon className="h-3.5 w-3.5 text-primary" /> AI Settings
                </div>
                <h2 className="text-lg font-semibold tracking-tightest font-sans">Choose AI Model</h2>
                <p className="text-[11px] text-text-muted font-sans">
                  Pick which AI will check your code and reviews.
                </p>
              </div>
              <div>
                {updatingSettings && (
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-primary animate-pulse border border-primary/20 bg-primary/5 px-2.5 py-1 rounded-sm">
                    <RefreshCw className="h-3 w-3 animate-spin" /> SAVING AI SETTINGS...
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
              {/* Gemini Mode */}
              <button
                type="button"
                disabled={updatingSettings}
                onClick={() => handleUpdateProvider("gemini")}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  aiProvider === "gemini"
                    ? "border-primary bg-primary/5 shadow-[inset_0_1px_0_0_rgba(190,242,100,0.1)]"
                    : "border-border bg-bg-soft/40 hover:border-border-faint hover:bg-bg-soft/70"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`p-2 rounded-lg border ${
                    aiProvider === "gemini" ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-bg-elev text-text-muted"
                  }`}>
                    <GeminiIcon className="h-4 w-4" />
                  </span>
                  {aiProvider === "gemini" && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span> ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-semibold font-sans mt-4">Gemini Only</h3>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed font-sans">
                  Use Google Gemini to scan all code. Great for large projects.
                </p>
              </button>

              {/* OpenAI Mode */}
              <button
                type="button"
                disabled={updatingSettings}
                onClick={() => handleUpdateProvider("openai")}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  aiProvider === "openai"
                    ? "border-primary bg-primary/5 shadow-[inset_0_1px_0_0_rgba(190,242,100,0.1)]"
                    : "border-border bg-bg-soft/40 hover:border-border-faint hover:bg-bg-soft/70"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`p-2 rounded-lg border ${
                    aiProvider === "openai" ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-bg-elev text-text-muted"
                  }`}>
                    <OpenAIIcon className="h-4 w-4" />
                  </span>
                  {aiProvider === "openai" && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span> ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-semibold font-sans mt-4">OpenAI Only</h3>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed font-sans">
                  Use OpenAI to scan all code. Great for fast results.
                </p>
              </button>

              {/* Both Mode */}
              <button
                type="button"
                disabled={updatingSettings}
                onClick={() => handleUpdateProvider("both")}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 relative overflow-hidden cursor-pointer ${
                  aiProvider === "both"
                    ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(190,242,100,0.1)]"
                    : "border-border bg-bg-soft/40 hover:border-border-faint hover:bg-bg-soft/70"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`p-2 rounded-lg border ${
                    aiProvider === "both" ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-bg-elev text-text-muted"
                  }`}>
                    <DualSystemIcon className="h-4 w-4" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans text-[8px] uppercase font-semibold border border-primary/20 bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">
                      BACKUP READY
                    </span>
                    {aiProvider === "both" && (
                      <span className="font-mono text-[9px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span> ACTIVE
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-xs font-semibold font-sans mt-4">Backup Mode</h3>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed font-sans">
                  Use Gemini first, and automatically switch to OpenAI if Gemini is busy.
                </p>
              </button>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-border/60 my-6"></div>

            {/* Batch Scanner Slicing Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-bg-soft/20 hover:bg-bg-soft/40 transition-all duration-200">
              <div className="space-y-1 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold font-sans text-foreground">Fast Batch Scanner</h3>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border font-sans text-[8px] font-bold ${
                    parallelEnabled
                      ? "border-primary/20 bg-primary/10 text-primary animate-pulse"
                      : "border-border bg-bg-elev text-text-muted"
                  }`}>
                    {parallelEnabled ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed font-sans">
                  Splits large projects into groups of 10 files to scan them faster. If turned off, the whole project is scanned at once.
                </p>
                <div className="flex gap-4 mt-2 font-mono text-[9px] text-text-muted/80">
                  <span>• Group Size: <strong className="text-foreground">10 files</strong></span>
                  <span>• Skip Grouping: <strong className="text-foreground">Under 15 files</strong></span>
                </div>
              </div>

              {/* Custom Switch Toggle */}
              <button
                type="button"
                disabled={updatingSettings}
                onClick={() => handleUpdateParallel(!parallelEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  parallelEnabled ? "bg-primary" : "bg-bg-soft border-border"
                } ${updatingSettings ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="sr-only">Toggle Batch Scanner</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    parallelEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Backup Info */}
          <div className="rounded-xl border border-border bg-bg-soft/50 p-6 space-y-2 font-sans">
            <h4 className="font-sans text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldIcon className="h-4 w-4 text-primary" /> How Backup Mode Works
            </h4>
            <p className="text-[11px] text-text-muted leading-relaxed font-sans">
              Reviews are run quickly. If Gemini is busy, the backup AI (OpenAI) is automatically used so your review never gets stuck.
            </p>
          </div>

        </div>

        {/* Right 1 Column: Average Health & Active Services Status */}
        <div className="space-y-6 font-sans">
          
          {/* Average Health Score Widget */}
          <div className="rounded-xl border border-primary/25 bg-primary/2 p-6 flex flex-col items-center text-center gap-4 shadow-[inset_0_1px_0_0_rgba(190,242,100,0.05)]">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary font-semibold">
              <ActivityIcon className="h-4 w-4" /> Code Health
            </div>
            <div>
              <div className="text-5xl font-medium font-sans text-primary tracking-tightest drop-shadow-[0_0_12px_rgba(190,242,100,0.15)]">
                {metrics.avgScore}
              </div>
              <div className="font-sans text-[9px] uppercase tracking-widest text-text-muted mt-1.5">Average Score</div>
            </div>
            <div className="h-px w-full bg-border/60 my-2"></div>
            <p className="text-[11px] text-text-muted leading-relaxed font-sans">
              Across all projects, the average code health score is <span className="text-foreground font-semibold">{metrics.avgScore}/100</span>.
            </p>
          </div>

          {/* AI Engines Status Board */}
          <div className="rounded-xl border border-border bg-bg-elev p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
              <CompassIcon className="h-3.5 w-3.5" /> AI Status
            </h3>
            
            <div className="space-y-3">
              {/* Gemini Engine Block */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-bg-soft/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-md">
                    <GeminiIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground font-sans">Gemini</div>
                    <div className="font-sans text-[8px] text-text-muted mt-0.5">Main AI</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-primary/20 bg-primary/10 text-primary font-sans text-[8px] font-bold">
                    ONLINE
                  </span>
                </div>
              </div>

              {/* OpenAI Engine Block */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-bg-soft/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-md">
                    <OpenAIIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground font-sans">OpenAI</div>
                    <div className="font-sans text-[8px] text-text-muted mt-0.5">Backup AI</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-primary/20 bg-primary/10 text-primary font-sans text-[8px] font-bold">
                    ONLINE
                  </span>
                </div>
              </div>

              {/* Supabase Broker Block */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-bg-soft/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 border border-primary/20 text-primary rounded-md">
                    <ShieldIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground font-sans">Database</div>
                    <div className="font-sans text-[8px] text-text-muted mt-0.5">System database</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-border bg-bg-elev text-text-muted font-sans text-[8px] font-bold">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
