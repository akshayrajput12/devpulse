const REPO_NOISE_PATTERNS = [
  /(^|\/)node_modules\//i,
  /(^|\/)\.git\//i,
  /(^|\/)(dist|build|out|\.next|\.nuxt|\.svelte-kit|\.vercel|coverage|__pycache__|\.venv|venv|target|vendor)\//i,
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|poetry\.lock|Cargo\.lock|composer\.lock|Gemfile\.lock)$/i,
  /\.(png|jpe?g|gif|svg|ico|webp|avif|pdf|zip|gz|tar|7z|rar|mp4|mp3|wav|mov|woff2?|eot|ttf|otf|exe|dll|so|dylib|bin|map|min\.js|min\.css|docx?|xlsx?|pptx?)$/i,
];

export function isRepoNoisePath(path: string): boolean {
  return REPO_NOISE_PATTERNS.some(pat => pat.test(path));
}

export async function fetchRepoTree(owner: string, repo: string, token?: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "devpulse",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, { headers });
  if (!res.ok) {
    res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`, { headers });
  }
  if (!res.ok) {
    // Try fetching default branch name from repo metadata
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (metaRes.ok) {
      const meta: any = await metaRes.json();
      if (meta?.default_branch && meta.default_branch !== "main" && meta.default_branch !== "master") {
        res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`,
          { headers },
        );
      }
    }
  }
  if (!res.ok) {
    res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
    if (!res.ok) throw new Error(`Could not fetch repository tree: ${res.statusText}`);
    const contents = await res.json();
    return {
      tree: contents.map((item: any) => ({
        path: item.path,
        type: item.type === "dir" ? "tree" : "blob",
        size: item.size || 0,
      })),
    };
  }

  return res.json();
}

export async function fetchRepoFiles(params: {
  owner: string;
  repo: string;
  files: string[];
  token?: string | null;
}) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
    "User-Agent": "devpulse",
  };
  if (params.token) headers.Authorization = `Bearer ${params.token}`;

  const filesContent: Record<string, string> = {};
  const limitedFiles = params.files.filter(f => !isRepoNoisePath(f)).slice(0, 80);

  // Bounded batch fetching (10 at a time) to avoid GitHub secondary rate limits
  const batchSize = 10;
  for (let i = 0; i < limitedFiles.length; i += batchSize) {
    const batch = limitedFiles.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async file => {
        try {
          const encodedPath = file
            .split("/")
            .map(seg => encodeURIComponent(seg))
            .join("/");
          const res = await fetch(
            `https://api.github.com/repos/${params.owner}/${params.repo}/contents/${encodedPath}`,
            { headers },
          );
          if (res.ok) {
            const text = await res.text();
            if (text && !text.includes("\u0000")) {
              filesContent[file] = text;
            }
          }
        } catch {
          // Missing or binary files are skipped; the audit proceeds with fetched text files.
        }
      }),
    );
  }

  return filesContent;
}

export function selectAuditFiles(tree: Array<{ path: string; type: string }>, requestedFiles?: string[]) {
  if (requestedFiles?.length) {
    return requestedFiles.filter(f => !isRepoNoisePath(f)).slice(0, 80);
  }

  const priority = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".cs",
    ".cpp",
    ".sql",
    ".prisma",
    ".graphql",
    ".json",
    ".yaml",
    ".yml",
  ];

  return tree
    .filter(item => item.type === "blob" && !isRepoNoisePath(item.path))
    .map(item => item.path)
    .sort((a, b) => {
      const extA = a.includes(".") ? a.slice(a.lastIndexOf(".")).toLowerCase() : "";
      const extB = b.includes(".") ? b.slice(b.lastIndexOf(".")).toLowerCase() : "";
      const pa = priority.indexOf(extA);
      const pb = priority.indexOf(extB);
      if (pa !== -1 && pb === -1) return -1;
      if (pa === -1 && pb !== -1) return 1;
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    })
    .slice(0, 80);
}
