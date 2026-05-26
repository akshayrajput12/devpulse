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
  const limitedFiles = params.files.slice(0, 60);

  await Promise.all(limitedFiles.map(async file => {
    try {
      const res = await fetch(`https://api.github.com/repos/${params.owner}/${params.repo}/contents/${file}`, {
        headers,
      });
      if (res.ok) filesContent[file] = await res.text();
    } catch {
      // Missing or binary files are skipped; the audit still proceeds with fetched text files.
    }
  }));

  return filesContent;
}

export function selectAuditFiles(tree: Array<{ path: string; type: string }>, requestedFiles?: string[]) {
  if (requestedFiles?.length) return requestedFiles.slice(0, 60);

  const priority = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".cpp", ".cs", ".json", ".md"];
  return tree
    .filter(item => item.type === "blob")
    .map(item => item.path)
    .sort((a, b) => {
      const pa = priority.indexOf(a.slice(a.lastIndexOf(".")));
      const pb = priority.indexOf(b.slice(b.lastIndexOf(".")));
      if (pa !== -1 && pb === -1) return -1;
      if (pa === -1 && pb !== -1) return 1;
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    })
    .slice(0, 60);
}
