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
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import type { FolderAnalysisResult } from "@/backend/ai/orchestrator";

type StatusType = "good" | "warning" | "critical" | "missing";

interface TreeItem {
  name: string;
  path: string;
  type: "dir" | "file";
  children?: TreeItem[];
  status?: StatusType;
  note?: string;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx", "js", "jsx"].includes(ext)) return <FileCode className="h-3.5 w-3.5 shrink-0 text-blue-400" />;
  if (ext === "json") return <FileJson className="h-3.5 w-3.5 shrink-0 text-yellow-400" />;
  if (["md", "txt"].includes(ext)) return <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />;
  if (["toml", "yaml", "yml", "env"].includes(ext)) return <FileCog className="h-3.5 w-3.5 shrink-0 text-purple-400" />;
  if (["css", "scss", "sass"].includes(ext)) return <File className="h-3.5 w-3.5 shrink-0 text-pink-400" />;
  return <File className="h-3.5 w-3.5 shrink-0 text-text-muted" />;
}

function StatusDot({ status }: { status?: StatusType }) {
  if (!status) return null;
  const map: Record<StatusType, ReactElement> = {
    good: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
    warning: <AlertTriangle className="h-3 w-3 text-yellow-400" />,
    critical: <XCircle className="h-3 w-3 text-red-400" />,
    missing: <Plus className="h-3 w-3 text-blue-400" />,
  };
  return map[status] ?? null;
}

function statusBg(status?: StatusType) {
  if (!status) return "";
  return {
    good: "bg-emerald-500/8 hover:bg-emerald-500/12",
    warning: "bg-yellow-500/8 hover:bg-yellow-500/12",
    critical: "bg-red-500/10 hover:bg-red-500/15",
    missing: "bg-blue-500/8 hover:bg-blue-500/12",
  }[status] ?? "";
}

function TreeNode({
  item,
  depth = 0,
  defaultOpen = true,
}: {
  item: TreeItem;
  depth?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen && depth < 2);
  const isDir = item.type === "dir";
  const hasChildren = isDir && (item.children?.length ?? 0) > 0;

  return (
    <div>
      <div
        className={`group flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors ${statusBg(item.status)}`}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
        onClick={() => isDir && hasChildren && setOpen(o => !o)}
      >
        {/* Expand chevron */}
        <span className="w-3.5 shrink-0 text-text-muted">
          {isDir && hasChildren ? (
            open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : null}
        </span>

        {/* Folder/file icon */}
        {isDir ? (
          open ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          )
        ) : (
          getFileIcon(item.name)
        )}

        {/* Name */}
        <span className="flex-1 truncate text-xs font-mono text-foreground/90 group-hover:text-foreground">
          {item.name}
          {isDir ? "/" : ""}
        </span>

        {/* Status indicator */}
        {item.status && (
          <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
            <StatusDot status={item.status} />
          </span>
        )}
        {item.status && item.note && (
          <span className="hidden shrink-0 max-w-[180px] truncate text-[10px] text-text-muted group-hover:block">
            {item.note}
          </span>
        )}
      </div>

      {isDir && open && item.children && (
        <div>
          {item.children.map(child => (
            <TreeNode key={child.path} item={child} depth={depth + 1} defaultOpen={defaultOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function flatToTree(
  items: Array<{ path: string; type: string }>,
  annotations: FolderAnalysisResult["folder_annotations"],
): TreeItem[] {
  const root: TreeItem[] = [];
  const map: Record<string, TreeItem> = {};

  // Sort: dirs first then files, alphabetically
  const sorted = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const item of sorted) {
    const parts = item.path.split("/");
    const name = parts[parts.length - 1];
    const annotation = annotations?.[item.path] ?? annotations?.[name];

    const node: TreeItem = {
      name,
      path: item.path,
      type: item.type === "tree" ? "dir" : "file",
      children: item.type === "tree" ? [] : undefined,
      status: annotation?.status,
      note: annotation?.note,
    };
    map[item.path] = node;

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      if (map[parentPath]) {
        map[parentPath].children = map[parentPath].children ?? [];
        map[parentPath].children!.push(node);
      } else {
        root.push(node);
      }
    }
  }

  return root;
}

// Parses ASCII tree string (from Gemini ideal_structure.tree) into TreeItem[]
function parseAsciiTree(treeText: string): TreeItem[] {
  const lines = treeText.split("\n").filter(l => l.trim());
  const root: TreeItem[] = [];
  const stack: Array<{ item: TreeItem; depth: number }> = [];

  for (const line of lines) {
    const stripped = line.replace(/[├└│─\s]/g, match => (match === " " ? " " : ""));
    const name = stripped.replace(/^[\s│├└─]+/, "").replace(/#.*$/, "").trim();
    if (!name || name === "...") continue;

    const isDir = name.endsWith("/") || !name.includes(".");
    const cleanName = name.replace(/\/$/, "");

    // Calculate depth by counting leading tree chars
    const leadingMatch = line.match(/^([\s│]*)[├└]/);
    const depth = leadingMatch ? Math.floor(leadingMatch[1].replace(/[^\s│]/g, "").length / 2) : 0;

    // Build path from stack
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parentPath = stack.length > 0 ? stack[stack.length - 1].item.path : "";
    const path = parentPath ? `${parentPath}/${cleanName}` : cleanName;

    const node: TreeItem = {
      name: cleanName,
      path,
      type: isDir ? "dir" : "file",
      children: isDir ? [] : undefined,
    };

    if (stack.length === 0) {
      root.push(node);
    } else {
      const parent = stack[stack.length - 1].item;
      parent.children = parent.children ?? [];
      parent.children.push(node);
    }

    if (isDir) {
      stack.push({ item: node, depth });
    }
  }

  return root;
}

// Current repo tree panel
export function CurrentFolderTree({
  items,
  annotations,
  label = "Current Structure",
}: {
  items: Array<{ path: string; type: string }>;
  annotations: FolderAnalysisResult["folder_annotations"];
  label?: string;
}) {
  const tree = flatToTree(items, annotations);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-3 text-[10px] text-text-muted">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" /> Good</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5 text-yellow-400" /> Warning</span>
          <span className="flex items-center gap-1"><XCircle className="h-2.5 w-2.5 text-red-400" /> Critical</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-lg border border-border bg-bg/60 p-2 text-sm font-mono">
        {tree.map(node => (
          <TreeNode key={node.path} item={node} defaultOpen={true} />
        ))}
        {tree.length === 0 && (
          <p className="p-4 text-center text-xs text-text-muted">No structure data</p>
        )}
      </div>
    </div>
  );
}

// Ideal production structure panel (parses ASCII from Gemini)
export function IdealFolderTree({
  treeText,
  label = "Production-Ready Structure",
}: {
  treeText: string;
  label?: string;
}) {
  const tree = parseAsciiTree(treeText);

  // If parse produces nothing or very little, render raw
  if (tree.length < 3) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-2">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex-1 overflow-auto rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">{treeText}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          Recommended
        </span>
      </div>
      <div className="flex-1 overflow-auto rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-sm font-mono">
        {tree.map(node => (
          <TreeNode key={node.path} item={node} defaultOpen={true} />
        ))}
      </div>
    </div>
  );
}
