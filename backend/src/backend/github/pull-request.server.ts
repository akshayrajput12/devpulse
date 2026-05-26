export function parsePrUrl(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: Number.parseInt(match[3], 10) };
}

export function parseRepoUrl(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)(?:[/?#]|$)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function fetchPr(owner: string, repo: string, num: number, token?: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "devpulse",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // 1. Fetch Pull Request metadata ledger first
  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}`, { headers });
  if (!metaRes.ok) {
    throw new Error(`GitHub PR fetch failed (${metaRes.status})`);
  }
  const metaData = await metaRes.json();

  let diffText = "";

  // 2. Multi-stage resilient diff fetch
  try {
    // Try standard diff Accept header
    const diffRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}`, {
      headers: { 
        ...headers, 
        Accept: "application/vnd.github.diff" 
      },
    });

    if (diffRes.ok) {
      diffText = await diffRes.text();
    } else {
      console.warn(`[GitHub fetchPr] Primary Accept header diff fetch failed with status ${diffRes.status}. Trying secondary v3 fallback...`);
      // Try v3 Accept header fallback
      const diffResV3 = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}`, {
        headers: { 
          ...headers, 
          Accept: "application/vnd.github.v3.diff" 
        },
      });
      if (diffResV3.ok) {
        diffText = await diffResV3.text();
      } else {
        console.warn(`[GitHub fetchPr] Secondary diff fetch failed with status ${diffResV3.status}. Executing robust aggregated patches aggregation...`);
        // Size limit or Accept header reject, fallback to paginated files patch aggregation
        diffText = await fetchAggregatedPrDiff(owner, repo, num, headers);
      }
    }
  } catch (err: any) {
    console.error("[GitHub fetchPr] Direct diff fetch crashed. Initializing files fallback...", err.message);
    diffText = await fetchAggregatedPrDiff(owner, repo, num, headers);
  }

  return {
    meta: metaData,
    diff: diffText.slice(0, 60_000),
  };
}

// Resilient aggregated files diff fallback method
async function fetchAggregatedPrDiff(owner: string, repo: string, num: number, headers: Record<string, string>): Promise<string> {
  try {
    const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${num}/files?per_page=100`, { headers });
    if (!filesRes.ok) {
      throw new Error(`GitHub PR files list fetch failed (${filesRes.status})`);
    }
    const files = await filesRes.json();
    if (!Array.isArray(files)) {
      return "";
    }
    const reconstructedDiff = files
      .map((file: any) => {
        const header = `diff --git a/${file.filename} b/${file.filename}\n` +
          `--- a/${file.filename}\n` +
          `+++ b/${file.filename}\n`;
        return header + (file.patch || `/* Binary file or empty patch for ${file.status} file */`);
      })
      .join("\n\n");
    return reconstructedDiff;
  } catch (err: any) {
    console.error("[GitHub fetchPr] Fallback aggregated diff failed:", err.message);
    throw new Error(`GitHub PR diff fetch failed (406) - and fallback list files failed: ${err.message}`);
  }
}
