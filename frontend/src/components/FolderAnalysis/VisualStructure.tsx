import { useState, type ReactElement } from "react";
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  FileCog,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { FolderAnalysisResult } from "@/backend/ai/orchestrator";

type Status = "good" | "warning" | "critical" | "missing";

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_STYLE: Record<Status, { border: string; bg: string; dot: string; text: string; badge: string }> = {
  good: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/8",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  },
  warning: {
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/8",
    dot: "bg-yellow-400",
    text: "text-yellow-400",
    badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  },
  critical: {
    border: "border-red-500/35",
    bg: "bg-red-500/8",
    dot: "bg-red-400",
    text: "text-red-400",
    badge: "bg-red-500/15 text-red-400 border-red-500/25",
  },
  missing: {
    border: "border-blue-500/30 border-dashed",
    bg: "bg-blue-500/5",
    dot: "bg-blue-400",
    text: "text-blue-400",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  },
};

const STATUS_ICON: Record<Status, ReactElement> = {
  good: <CheckCircle2 className="h-3 w-3" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  critical: <XCircle className="h-3 w-3" />,
  missing: <Plus className="h-3 w-3" />,
};

const STATUS_LABEL: Record<Status, string> = {
  good: "Good",
  warning: "Needs attention",
  critical: "Critical issue",
  missing: "Recommended",
};

function fileIcon(name: string): ReactElement {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  if (["ts", "tsx", "js", "jsx"].includes(ext))
    return <FileCode className="h-3 w-3 shrink-0 text-blue-400" />;
  if (ext === "json") return <FileJson className="h-3 w-3 shrink-0 text-yellow-400" />;
  if (["md", "txt"].includes(ext)) return <FileText className="h-3 w-3 shrink-0 text-gray-400" />;
  if (["toml", "yaml", "yml", "env"].includes(ext))
    return <FileCog className="h-3 w-3 shrink-0 text-purple-400" />;
  return <File className="h-3 w-3 shrink-0 text-text-muted" />;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FolderGroup {
  name: string;
  path: string;
  files: string[];
  subFolders: string[];
  status?: Status;
  note?: string;
  fileCount: number;
}

// ─── Build folder groups from flat GitHub tree ────────────────────────────────

export function buildFolderGroups(
  items: Array<{ path: string; type: string }>,
  annotations: FolderAnalysisResult["folder_annotations"],
): FolderGroup[] {
  // Group by top-level segment
  const groups: Map<string, FolderGroup> = new Map();

  for (const item of items) {
    const parts = item.path.split("/");
    const topLevel = parts[0];

    if (!groups.has(topLevel)) {
      const annotation = annotations?.[topLevel] ?? annotations?.[topLevel + "/"];
      groups.set(topLevel, {
        name: topLevel,
        path: topLevel,
        files: [],
        subFolders: [],
        status: annotation?.status,
        note: annotation?.note,
        fileCount: 0,
      });
    }

    const g = groups.get(topLevel)!;
    g.fileCount++;

    if (parts.length === 2 && item.type === "blob") {
      g.files.push(parts[1]);
    } else if (parts.length >= 2 && item.type === "tree") {
      const sub = parts.slice(1).join("/");
      if (!g.subFolders.includes(sub) && sub) g.subFolders.push(sub);
    }
  }

  // Root-level files (no parent folder)
  const rootFiles = items.filter(i => !i.path.includes("/") && i.type === "blob");
  if (rootFiles.length) {
    const annotation = annotations?.["root"] ?? annotations?.["."];
    groups.set("__root__", {
      name: "/ (root)",
      path: "",
      files: rootFiles.map(f => f.path),
      subFolders: [],
      status: annotation?.status,
      note: annotation?.note,
      fileCount: rootFiles.length,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.path === "__root__") return -1;
    if (b.path === "__root__") return 1;
    return a.name.localeCompare(b.name);
  });
}

// ─── Folder Card ─────────────────────────────────────────────────────────────

function FolderCard({ group, showAll = false }: { group: FolderGroup; showAll?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const status: Status = group.status ?? "good";
  const style = STATUS_STYLE[status];
  const MAX_FILES = 5;
  const displayFiles = expanded ? group.files : group.files.slice(0, MAX_FILES);
  const hasMore = group.files.length > MAX_FILES && !expanded;

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden transition-all duration-200 hover:shadow-sm`}>
      {/* Card header */}
      <div
        className="flex cursor-pointer items-center gap-2.5 px-3.5 py-3"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-amber-400" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-amber-400" />
        )}
        <span className="flex-1 truncate text-sm font-semibold text-foreground font-mono">
          {group.name}/
        </span>

        {/* Status badge */}
        <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.badge}`}>
          {STATUS_ICON[status]}
          {STATUS_LABEL[status]}
        </span>

        {/* File count */}
        <span className="text-[10px] font-mono text-text-muted">
          {group.fileCount}f
        </span>

        <span className="text-text-muted">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </div>

      {/* Note */}
      {group.note && (
        <div className={`border-t border-border/30 px-3.5 py-1.5`}>
          <p className={`text-[11px] ${style.text} leading-relaxed`}>{group.note}</p>
        </div>
      )}

      {/* Files */}
      {(expanded || showAll) && (
        <div className="border-t border-border/20 px-3.5 py-2.5">
          {/* Sub-folders */}
          {group.subFolders.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {group.subFolders.slice(0, 8).map(sf => (
                <span key={sf} className="flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-400">
                  <Folder className="h-2.5 w-2.5" /> {sf}/
                </span>
              ))}
              {group.subFolders.length > 8 && (
                <span className="text-[10px] text-text-muted">+{group.subFolders.length - 8} more</span>
              )}
            </div>
          )}

          {/* Direct files */}
          {displayFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayFiles.map(f => (
                <span key={f} className="flex items-center gap-1 rounded bg-bg/50 border border-border/30 px-1.5 py-0.5 text-[10px] font-mono text-foreground/70">
                  {fileIcon(f)} {f}
                </span>
              ))}
              {hasMore && (
                <button
                  className="rounded border border-border/30 px-1.5 py-0.5 text-[10px] text-text-muted hover:text-foreground"
                  onClick={e => { e.stopPropagation(); setExpanded(true); }}
                >
                  +{group.files.length - MAX_FILES} more
                </button>
              )}
            </div>
          )}

          {displayFiles.length === 0 && group.subFolders.length === 0 && (
            <p className="text-[10px] text-text-muted italic">Empty directory</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── "Missing" card for recommended folders not yet present ──────────────────

function MissingFolderCard({ name, note }: { name: string; note: string }) {
  const style = STATUS_STYLE.missing;
  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} px-3.5 py-3`}>
      <div className="flex items-center gap-2.5">
        <Plus className="h-4 w-4 shrink-0 text-blue-400" />
        <span className="flex-1 text-sm font-semibold font-mono text-blue-400">{name}/</span>
        <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.badge}`}>
          <Plus className="h-3 w-3" /> Add this
        </span>
      </div>
      {note && <p className="mt-1.5 text-[11px] text-blue-300/70 leading-relaxed">{note}</p>}
    </div>
  );
}

// ─── Current structure panel ─────────────────────────────────────────────────

export function CurrentStructurePanel({
  items,
  annotations,
}: {
  items: Array<{ path: string; type: string }>;
  annotations: FolderAnalysisResult["folder_annotations"];
}) {
  const groups = buildFolderGroups(items, annotations);
  const criticalGroups = groups.filter(g => g.status === "critical");
  const warningGroups = groups.filter(g => g.status === "warning");
  const goodGroups = groups.filter(g => !g.status || g.status === "good");

  const orderedGroups = [...criticalGroups, ...warningGroups, ...goodGroups];

  // Extract "missing" annotations — paths that don't exist in the actual tree
  const existingPaths = new Set(groups.map(g => g.name));
  const missingAnnotations = Object.entries(annotations ?? {})
    .filter(([path, ann]) => ann.status === "missing" && !existingPaths.has(path.replace("/", "")))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {criticalGroups.length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/25 px-2.5 py-1 text-[11px] font-medium text-red-400">
            <XCircle className="h-3 w-3" /> {criticalGroups.length} critical
          </span>
        )}
        {warningGroups.length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/25 px-2.5 py-1 text-[11px] font-medium text-yellow-400">
            <AlertTriangle className="h-3 w-3" /> {warningGroups.length} warning
          </span>
        )}
        {goodGroups.length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> {goodGroups.length} good
          </span>
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {orderedGroups.map(g => (
          <FolderCard key={g.path} group={g} />
        ))}
        {missingAnnotations.map(([path, ann]) => (
          <MissingFolderCard key={path} name={path} note={ann.note} />
        ))}
      </div>
    </div>
  );
}

// ─── Ideal structure panel — parse Gemini ASCII tree ─────────────────────────

function parseIdealGroups(treeText: string): FolderGroup[] {
  const groups: Map<string, FolderGroup> = new Map();
  let currentFolder = "";

  for (const raw of treeText.split("\n")) {
    // Strip tree chars and inline comments
    const line = raw.replace(/[├└│─]/g, "").replace(/#.*$/, "").trim();
    if (!line || line === "...") continue;

    const isDir = line.endsWith("/");
    const depth = Math.max(0, Math.floor((raw.search(/\S/) || 0) / 2));
    const name = line.replace(/\/$/, "");

    if (depth === 0 || depth === 1) {
      if (isDir) {
        if (!groups.has(name)) {
          groups.set(name, {
            name,
            path: name,
            files: [],
            subFolders: [],
            status: "good",
            fileCount: 0,
          });
        }
        currentFolder = name;
      } else {
        // Root-level file
        const g = groups.get("__root__") ?? {
          name: "/ (root)",
          path: "",
          files: [],
          subFolders: [],
          status: "good",
          fileCount: 0,
        };
        g.files.push(name);
        g.fileCount++;
        groups.set("__root__", g);
      }
    } else if (depth >= 2 && currentFolder) {
      const g = groups.get(currentFolder);
      if (!g) continue;
      if (isDir) {
        g.subFolders.push(name);
      } else {
        g.files.push(name);
        g.fileCount++;
      }
    }
  }

  return Array.from(groups.values());
}

export function IdealStructurePanel({ treeText }: { treeText: string }) {
  const groups = parseIdealGroups(treeText);

  if (groups.length < 2) {
    // Fallback: raw tree text in a styled pre
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5 overflow-auto">
        <pre className="text-[12px] font-mono text-foreground/80 whitespace-pre leading-relaxed">{treeText}</pre>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {groups.map(g => (
        <FolderCard key={g.path} group={g} showAll={false} />
      ))}
    </div>
  );
}

// ─── Tech stack visual chips ──────────────────────────────────────────────────

const TECH_COLORS: Record<string, string> = {
  react: "bg-blue-500/10 border-blue-500/25 text-blue-400",
  typescript: "bg-blue-600/10 border-blue-600/25 text-blue-300",
  javascript: "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
  supabase: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  postgresql: "bg-blue-700/10 border-blue-700/25 text-blue-300",
  tailwind: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
  vite: "bg-purple-500/10 border-purple-500/25 text-purple-400",
  vercel: "bg-foreground/10 border-border text-foreground/70",
  cloudflare: "bg-orange-500/10 border-orange-500/25 text-orange-400",
  nextjs: "bg-foreground/10 border-border text-foreground/70",
  node: "bg-green-500/10 border-green-500/25 text-green-400",
  prisma: "bg-indigo-500/10 border-indigo-500/25 text-indigo-400",
  drizzle: "bg-amber-500/10 border-amber-500/25 text-amber-400",
  gemini: "bg-blue-500/10 border-blue-500/25 text-blue-400",
  tanstack: "bg-red-500/10 border-red-500/25 text-red-400",
  framer: "bg-pink-500/10 border-pink-500/25 text-pink-400",
};

const TECH_EMOJI: Record<string, string> = {
  react: "⚛️",
  typescript: "🔷",
  javascript: "🟡",
  supabase: "🟢",
  postgresql: "🐘",
  tailwind: "💨",
  vite: "⚡",
  vercel: "▲",
  cloudflare: "🌐",
  nextjs: "▲",
  node: "🟩",
  prisma: "◆",
  drizzle: "💧",
  gemini: "✨",
  tanstack: "🔴",
  framer: "🎭",
};

export function TechStackBadges({ detected }: { detected: string }) {
  // Parse comma-separated or parenthesized tech names
  const raw = detected
    .split(/[,+]/)
    .map(t => t.replace(/\(.*?\)/g, "").trim())
    .filter(Boolean);

  return (
    <div className="flex flex-wrap gap-2">
      {raw.map(tech => {
        const key = tech.toLowerCase().replace(/[^a-z]/g, "");
        const colorKey = Object.keys(TECH_COLORS).find(k => key.includes(k)) ?? "";
        const colorClass = TECH_COLORS[colorKey] ?? "bg-bg-elev border-border text-text-muted";
        const emoji = TECH_EMOJI[colorKey] ?? "🔧";

        return (
          <span
            key={tech}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-transform hover:-translate-y-px ${colorClass}`}
          >
            <span>{emoji}</span>
            {tech}
          </span>
        );
      })}
    </div>
  );
}
