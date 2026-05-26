import { useState, type ReactElement } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  FileCog,
  FileImage,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Lock,
} from "lucide-react";
import type { FolderAnalysisResult } from "@/backend/ai/orchestrator";

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = "good" | "warning" | "critical" | "missing" | "new";

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
  status?: Status;
  note?: string;
  isNew?: boolean;     // for ideal tree: brand-new recommended folder
  isRemoved?: boolean; // for diff view: to-be-removed
}

// ─── File type → icon ────────────────────────────────────────────────────────

function fileIcon(name: string, small = false): ReactElement {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  const cls = small ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0";
  if (["ts", "tsx"].includes(ext)) return <FileCode className={`${cls} text-blue-400`} />;
  if (["js", "jsx", "mjs"].includes(ext)) return <FileCode className={`${cls} text-yellow-400`} />;
  if (ext === "json") return <FileJson className={`${cls} text-yellow-300`} />;
  if (["md", "txt", "mdx"].includes(ext)) return <FileText className={`${cls} text-gray-400`} />;
  if (["toml", "yaml", "yml"].includes(ext)) return <FileCog className={`${cls} text-purple-400`} />;
  if (ext === "env" || name.startsWith(".env")) return <Lock className={`${cls} text-red-400`} />;
  if (["css", "scss", "sass"].includes(ext)) return <File className={`${cls} text-pink-400`} />;
  if (["sql"].includes(ext)) return <File className={`${cls} text-amber-400`} />;
  if (["png", "jpg", "jpeg", "svg", "webp", "ico"].includes(ext))
    return <FileImage className={`${cls} text-green-400`} />;
  return <File className={`${cls} text-text-muted/60`} />;
}

// ─── Status config ────────────────────────────────────────────────────────────

type StatusConf = { icon: ReactElement; label: string; dot: string; row: string; badge: string };

const STATUS: Record<Status, StatusConf> = {
  good: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: "Good",
    dot: "bg-emerald-400",
    row: "hover:bg-emerald-500/5",
    badge: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
  },
  warning: {
    icon: <AlertTriangle className="h-3 w-3" />,
    label: "Needs attention",
    dot: "bg-yellow-400",
    row: "bg-yellow-500/4 hover:bg-yellow-500/8",
    badge: "bg-yellow-500/12 text-yellow-400 border-yellow-500/25",
  },
  critical: {
    icon: <XCircle className="h-3 w-3" />,
    label: "Critical issue",
    dot: "bg-red-400",
    row: "bg-red-500/5 hover:bg-red-500/10",
    badge: "bg-red-500/12 text-red-400 border-red-500/25",
  },
  missing: {
    icon: <Plus className="h-3 w-3" />,
    label: "Missing — add this",
    dot: "bg-blue-400",
    row: "bg-blue-500/4 hover:bg-blue-500/8",
    badge: "bg-blue-500/12 text-blue-400 border-blue-500/25",
  },
  new: {
    icon: <Plus className="h-3 w-3" />,
    label: "Recommended addition",
    dot: "bg-emerald-400",
    row: "bg-emerald-500/4 hover:bg-emerald-500/8",
    badge: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25",
  },
};

// ─── Build nested tree from flat GitHub items ─────────────────────────────────

export function buildTree(
  items: Array<{ path: string; type: string }>,
  annotations: FolderAnalysisResult["folder_annotations"] = {},
): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Sort: dirs first, then alphabetical within same parent
  const sorted = [...items].sort((a, b) => {
    const aDirDepth = a.path.split("/").length * (a.type === "tree" ? -100 : 0);
    const bDirDepth = b.path.split("/").length * (b.type === "tree" ? -100 : 0);
    if (aDirDepth !== bDirDepth) return aDirDepth - bDirDepth;
    return a.path.localeCompare(b.path);
  });

  for (const item of sorted) {
    const parts = item.path.split("/");
    const name = parts[parts.length - 1];
    const isDir = item.type === "tree";

    const ann =
      annotations[item.path] ??
      annotations[item.path + "/"] ??
      annotations[name] ??
      annotations[name + "/"];

    const node: TreeNode = {
      name,
      path: item.path,
      isDir,
      children: isDir ? [] : undefined,
      status: ann?.status as Status | undefined,
      note: ann?.note,
    };

    map.set(item.path, node);

    if (parts.length === 1) {
      roots.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = map.get(parentPath);
      if (parent?.children) {
        parent.children.push(node);
      } else {
        roots.push(node); // orphan → add to root
      }
    }
  }

  return roots;
}

// ─── Parse Gemini ASCII tree → TreeNode[] ────────────────────────────────────

export function parseIdealTree(treeText: string): TreeNode[] {
  const roots: TreeNode[] = [];
  const stack: Array<{ node: TreeNode; depth: number }> = [];

  for (const raw of treeText.split("\n")) {
    // Remove inline comments and strip tree drawing chars
    const noComment = raw.replace(/#.*$/, "");
    const name = noComment.replace(/[├└│─\s]+/g, " ").trim();
    if (!name || name === "..." || name === "." || name === "..") continue;

    // Compute depth from leading whitespace/tree-chars before actual content
    const leadPos = raw.search(/[^\s│├└─]/);
    if (leadPos < 0) continue;
    const depth = Math.max(0, Math.floor(leadPos / 2));

    const cleanName = name.replace(/\/$/, "").trim();
    if (!cleanName) continue;

    const isDir = name.endsWith("/") || (!cleanName.includes(".") && !cleanName.startsWith("."));

    // Build path from stack
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parentPath = stack.length > 0 ? stack[stack.length - 1].node.path : "";
    const path = parentPath ? `${parentPath}/${cleanName}` : cleanName;

    // Extract note from inline comments
    const commentMatch = raw.match(/#\s*(.*)$/);
    const note = commentMatch ? commentMatch[1].trim() : undefined;

    const node: TreeNode = {
      name: cleanName,
      path,
      isDir,
      children: isDir ? [] : undefined,
      status: "new",
      isNew: true,
      note,
    };

    if (stack.length === 0) {
      roots.push(node);
    } else {
      const parent = stack[stack.length - 1].node;
      parent.children = parent.children ?? [];
      parent.children.push(node);
    }

    if (isDir) {
      stack.push({ node, depth });
    }
  }

  return roots;
}

// ─── Single tree row ──────────────────────────────────────────────────────────

function TreeRow({
  node,
  depth,
  isLast,
  parentLines,   // which ancestor depths still have a continuation line
  defaultOpen,
  showStatus,
}: {
  node: TreeNode;
  depth: number;
  isLast: boolean;
  parentLines: boolean[];
  defaultOpen: boolean;
  showStatus: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 2);
  const hasChildren = node.isDir && (node.children?.length ?? 0) > 0;
  const s = node.status ? STATUS[node.status] : null;

  const rowClass = `
    group relative flex items-center gap-0.5 rounded-md px-2 py-1 transition-all border-l-2
    ${node.isRemoved ? "opacity-35 line-through" : ""}
    ${node.status === "critical"
      ? "bg-red-500/5 hover:bg-red-500/10 border-red-400/40 text-red-300"
      : node.status === "warning"
      ? "bg-yellow-500/5 hover:bg-yellow-500/10 border-yellow-400/40 text-yellow-300"
      : node.status === "missing"
      ? "bg-blue-500/5 hover:bg-blue-500/10 border-blue-400/40 text-blue-300"
      : node.isNew
      ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-400/40 text-emerald-400"
      : "bg-transparent hover:bg-bg-soft/80 border-transparent hover:border-primary/50 text-foreground"
    }
  `.trim().replace(/\s+/g, ' ');

  return (
    <>
      {/* Row */}
      <div
        className={rowClass}
        style={{ minHeight: 28 }}
      >
        {/* Indent guide lines */}
        {Array.from({ length: depth }).map((_, i) => (
          <span
            key={i}
            className="relative flex h-6 w-5 shrink-0 items-center justify-center"
          >
            {parentLines[i] && (
              <span
                className="absolute left-[9px] top-0 h-full w-px bg-border/40"
                style={{ bottom: i === depth - 1 ? "50%" : 0 }}
              />
            )}
            {i === depth - 1 && (
              <span className="absolute left-[9px] top-1/2 h-px w-3 bg-border/40" />
            )}
          </span>
        ))}

        {/* Expand toggle */}
        <span
          className="flex h-6 w-5 shrink-0 cursor-pointer items-center justify-center text-text-muted transition-transform hover:text-foreground"
          onClick={() => hasChildren && setOpen(o => !o)}
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : null}
        </span>

        {/* Icon */}
        <span className="mr-1.5 flex items-center">
          {node.isDir ? (
            open ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
            )
          ) : (
            fileIcon(node.name)
          )}
        </span>

        {/* Name */}
        <span
          className={`flex-1 truncate text-[12.5px] font-mono leading-6 ${
            node.isDir ? "font-semibold text-foreground" : "text-foreground/80"
          } ${
            node.status === "critical"
              ? "text-red-300"
              : node.status === "warning"
              ? "text-yellow-300"
              : node.isNew
              ? "text-emerald-400"
              : ""
          }`}
        >
          {node.name}
          {node.isDir ? "/" : ""}
          {node.isNew && !node.note && (
            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 opacity-70">
              new
            </span>
          )}
        </span>

        {/* Status badge (on hover or always for non-good) */}
        {showStatus && s && node.status && node.status !== "good" && (
          <span
            className={`ml-2 mr-2 flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${s.badge}`}
            title={node.note}
          >
            {s.icon}
            {s.label}
          </span>
        )}
        {showStatus && s && node.status === "good" && (
          <span className={`ml-2 mr-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${s.badge}`}>
            {s.icon}
          </span>
        )}

        {/* Status dot (always visible shorthand) */}
        {showStatus && s && (
          <span className={`mr-2 h-1.5 w-1.5 shrink-0 rounded-full ${s.dot} ${node.status === "good" ? "opacity-0 group-hover:opacity-40" : "opacity-70"} transition-opacity`} />
        )}
      </div>

      {/* Explanation of folder works */}
      {node.note && (
        <div
          className="flex items-start gap-1.5 pb-1.5 pt-0.5 text-[11px] font-sans text-text-muted/80 leading-normal"
          style={{ paddingLeft: depth * 20 + 40 }}
        >
          <span className="text-primary/60 shrink-0 font-mono select-none">↳</span>
          <span className="bg-bg-soft/75 px-2 py-0.5 rounded border border-border/40 backdrop-blur-sm shadow-sm inline-block max-w-[90%] break-words">
            {node.note}
          </span>
        </div>
      )}

      {/* Children */}
      {node.isDir && open && node.children && (
        <div>
          {node.children.map((child, i) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              isLast={i === node.children!.length - 1}
              parentLines={[...parentLines, !isLast]}
              defaultOpen={defaultOpen}
              showStatus={showStatus}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Full tree panel ──────────────────────────────────────────────────────────

interface DirectoryTreeProps {
  nodes: TreeNode[];
  showStatus?: boolean;
  defaultOpen?: boolean;
  label?: string;
  sublabel?: string;
  badge?: ReactElement;
  borderClass?: string;
  bgClass?: string;
}

export function DirectoryTree({
  nodes,
  showStatus = true,
  defaultOpen = false,
  label,
  sublabel,
  badge,
  borderClass = "border-border",
  bgClass = "bg-bg/60",
}: DirectoryTreeProps) {
  const [globalOpen, setGlobalOpen] = useState(false);

  const critCount = countStatus(nodes, "critical");
  const warnCount = countStatus(nodes, "warning");
  const newCount = countNew(nodes);

  return (
    <div className={`flex flex-col rounded-2xl border ${borderClass} ${bgClass} overflow-hidden h-full`}>
      {/* Panel header */}
      {label && (
        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Folder className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-foreground">{label}</span>
            {badge}
          </div>
          <div className="flex items-center gap-3">
            {/* Status summary chips */}
            {critCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-[10px] font-bold text-red-400">
                <XCircle className="h-2.5 w-2.5" /> {critCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/25 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                <AlertTriangle className="h-2.5 w-2.5" /> {warnCount}
              </span>
            )}
            {newCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <Plus className="h-2.5 w-2.5" /> {newCount} new
              </span>
            )}
            {sublabel && (
              <span className="text-[10px] text-text-muted">{sublabel}</span>
            )}
            <button
              onClick={() => setGlobalOpen(o => !o)}
              className="text-[10px] text-text-muted hover:text-foreground transition-colors"
            >
              {globalOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>
        </div>
      )}

      {/* Tree content */}
      <div className="flex-1 overflow-auto p-2 font-mono">
        {nodes.length === 0 && (
          <p className="py-8 text-center text-xs text-text-muted">No structure data</p>
        )}
        {nodes.map((node, i) => (
          <TreeRow
            key={node.path}
            node={node}
            depth={0}
            isLast={i === nodes.length - 1}
            parentLines={[]}
            defaultOpen={globalOpen || defaultOpen}
            showStatus={showStatus}
          />
        ))}
      </div>

      {/* Legend */}
      {showStatus && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/30 px-4 py-2">
          {(
            [
              ["critical", "Critical"],
              ["warning", "Warning"],
              ["missing", "Missing"],
              ["good", "Good"],
            ] as const
          ).map(([st, lbl]) => (
            <span key={st} className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS[st].dot}`} />
              {lbl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countStatus(nodes: TreeNode[], status: Status): number {
  let n = 0;
  for (const node of nodes) {
    if (node.status === status) n++;
    if (node.children) n += countStatus(node.children, status);
  }
  return n;
}

function countNew(nodes: TreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.isNew) n++;
    if (node.children) n += countNew(node.children);
  }
  return n;
}
