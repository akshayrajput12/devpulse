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
import { RefreshCw, Sliders, Plus, Trash2, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

  // High-Capacity Queue & Rotating API Keys States
  const [queueConcurrency, setQueueConcurrency] = useState<number>(4);
  const [globalRpmLimit, setGlobalRpmLimit] = useState<number>(100);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyProvider, setNewKeyProvider] = useState<"gemini" | "openai">("gemini");
  const [newKeyContent, setNewKeyContent] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  
  const [savingQueueConfig, setSavingQueueConfig] = useState(false);
  const [savingNewKey, setSavingNewKey] = useState(false);

  const fetchSettingsAndMetrics = async () => {
    if (!session?.access_token) return;
    try {
      const [metricsRes, settingsRes, dbSettingsRes, dbKeysRes] = await Promise.all([
        getAdminMetrics({ data: { access_token: session.access_token } }),
        getAdminSettings({ data: { access_token: session.access_token } }).catch((err) => {
          console.error("Failed to load AI settings:", err);
          return { ai_provider: "both", parallel_engine_enabled: true };
        }),
        (supabase.from("system_settings" as any) as any).select("*"),
        (supabase.from("system_ai_keys" as any) as any).select("*").order("created_at", { ascending: false }),
      ]);
      setMetrics(metricsRes.metrics);
      if (settingsRes && settingsRes.ai_provider) {
        setAiProvider(settingsRes.ai_provider as "gemini" | "openai" | "both");
      }
      if (settingsRes && settingsRes.parallel_engine_enabled !== undefined) {
        setParallelEnabled(settingsRes.parallel_engine_enabled);
      }
      // Populate dynamic DB configurations
      if (dbSettingsRes.data) {
        const settingsList = dbSettingsRes.data as any[];
        const concurrencyVal = settingsList.find(x => x.key === "queue_concurrency")?.value;
        const rpmVal = settingsList.find(x => x.key === "global_rpm_limit")?.value;
        if (concurrencyVal) setQueueConcurrency(parseInt(concurrencyVal, 10) || 4);
        if (rpmVal) setGlobalRpmLimit(parseInt(rpmVal, 10) || 100);
      }
      // Populate active rotating key pool
      if (dbKeysRes.data) {
        setApiKeys(dbKeysRes.data);
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

  const handleSaveQueueConfig = async () => {
    setSavingQueueConfig(true);
    try {
      const { error: err1 } = await (supabase.from("system_settings" as any) as any)
        .upsert({ key: "queue_concurrency", value: String(queueConcurrency), updated_at: new Date().toISOString() } as any);
        
      const { error: err2 } = await (supabase.from("system_settings" as any) as any)
        .upsert({ key: "global_rpm_limit", value: String(globalRpmLimit), updated_at: new Date().toISOString() } as any);

      if (err1 || err2) throw new Error(err1?.message || err2?.message || "Failed to save configurations");
      toast.success("High-capacity queue configurations saved successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save queue settings");
    } finally {
      setSavingQueueConfig(false);
    }
  };

  const handleToggleKey = async (id: string, is_active: boolean) => {
    try {
      const { error } = await (supabase.from("system_ai_keys" as any) as any)
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active } : k));
      toast.success(`Key status updated to ${is_active ? "ACTIVE" : "INACTIVE"}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update key status");
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key from the rotation pool?")) return;
    try {
      const { error } = await (supabase.from("system_ai_keys" as any) as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast.success("API key deleted from pool");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete API key");
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyContent.trim()) {
      toast.error("Please provide API Key contents");
      return;
    }
    setSavingNewKey(true);
    try {
      const label = newKeyLabel.trim() || `${newKeyProvider.toUpperCase()} Key - ${new Date().toLocaleDateString()}`;
      const { data, error } = await (supabase.from("system_ai_keys" as any) as any)
        .insert({
          provider: newKeyProvider,
          api_key_encrypted: newKeyContent.trim(),
          label,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setApiKeys(prev => [data, ...prev]);
      setNewKeyContent("");
      setNewKeyLabel("");
      toast.success("New API key added to the rotating execution pool!");
    } catch (e: any) {
      toast.error(e.message || "Failed to register API key");
    } finally {
      setSavingNewKey(false);
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

          {/* Dynamic Queue Concurrency & API Key Pool Manager */}
          <div className="rounded-xl border border-border bg-bg-elev p-6 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary font-semibold">
                  <Sliders className="h-3.5 w-3.5 text-primary" /> Production Scale Queue Settings
                </div>
                <h2 className="text-lg font-semibold tracking-tightest font-sans">High-Capacity Scaling Configs</h2>
                <p className="text-[11px] text-text-muted font-sans">
                  Manage worker concurrency limits and dynamic API Key round-robin quotas in real-time.
                </p>
              </div>
              <button
                onClick={handleSaveQueueConfig}
                disabled={savingQueueConfig}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-mono font-bold text-primary transition-all duration-200 hover:bg-primary/25 cursor-pointer disabled:opacity-50"
              >
                {savingQueueConfig ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {savingQueueConfig ? "Saving..." : "Save Production Config"}
              </button>
            </div>

            {/* Slider & RPM controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-border bg-bg-soft/20">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Concurrency per Instance:</span>
                  <span className="text-primary font-mono bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{queueConcurrency} parallel scans</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={queueConcurrency}
                  onChange={(e) => setQueueConcurrency(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-bg-soft rounded-lg appearance-none cursor-pointer accent-primary border border-border"
                />
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Controls how many PR scans each backend container instance handles simultaneously.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Global API RPM Limit:</span>
                  <span className="text-primary font-mono bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{globalRpmLimit} RPM</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={globalRpmLimit}
                  onChange={(e) => setGlobalRpmLimit(parseInt(e.target.value, 10) || 10)}
                  className="w-full rounded-lg border border-border bg-bg-soft px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary/50"
                />
                <p className="text-[10px] text-text-muted leading-relaxed">
                  The rolling 60-second limit pool across all server replicas to prevent AI rate limiting.
                </p>
              </div>
            </div>

            {/* Dynamic rotating API Key Registry */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Rotating AI API Key Pool</h3>
              </div>

              {/* Input Form */}
              <form onSubmit={handleCreateKey} className="grid grid-cols-1 sm:grid-cols-[100px_1fr_1.5fr_auto] gap-3 items-end p-4 rounded-xl border border-border bg-bg-soft/20">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Provider</label>
                  <select
                    value={newKeyProvider}
                    onChange={(e) => setNewKeyProvider(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                  >
                    <option value="gemini">Gemini</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Gemini Key Account 1"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-xs text-foreground placeholder:text-text-faint outline-none focus:border-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted">API Key string</label>
                  <input
                    type="password"
                    placeholder="Paste credentials key..."
                    value={newKeyContent}
                    onChange={(e) => setNewKeyContent(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-xs text-foreground placeholder:text-text-faint outline-none focus:border-primary/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingNewKey}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Register Key
                </button>
              </form>

              {/* Keys List */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-6 text-text-faint font-mono text-[11px] border border-dashed border-border rounded-xl">
                    No custom keys registered. System is falling back to server environment variables.
                  </div>
                ) : (
                  apiKeys.map(k => (
                    <div key={k.id} className="p-3.5 rounded-lg border border-border bg-bg-soft/40 flex items-center justify-between hover:bg-bg-soft/60 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-sm border font-mono text-[9px] uppercase font-bold ${
                          k.provider === "gemini" ? "border-primary/20 bg-primary/5 text-primary" : "border-amber-400/20 bg-amber-400/5 text-amber-400"
                        }`}>
                          {k.provider}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-foreground">{k.label}</div>
                          <div className="font-mono text-[9px] text-text-muted mt-0.5">Key: ••••••••••••••••{k.api_key_encrypted.slice(-4)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Status Toggle Switch */}
                        <button
                          onClick={() => handleToggleKey(k.id, !k.is_active)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            k.is_active ? "bg-primary" : "bg-bg-soft border-border"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                              k.is_active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(k.id)}
                          className="rounded p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/5 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
