// Kept out of panel.ts, which needs the panel's DOM at import, so it can be
// unit-tested.

// Tracking parameters change between visits to the same posting, so they never
// tell two jobs apart.
// shortcut: a fixed list of common tracking keys; extend it when a site's own
// tracking key keeps a saved job from matching.
const TRACKING_KEY =
  /^(utm_|lever-)|^(gh_src|source|src|ref|referrer|trk|gclid|fbclid)$/i;

interface SavedApplication {
  id: string;
  jobUrl?: string;
}

const trimSlash = (path: string) => path.replace(/\/+$/, "");

/** How closely a saved job link names the tab's page: -1 for no match. */
function score(tab: URL, jobUrl: string): number {
  let job: URL;
  try {
    job = new URL(jobUrl);
  } catch {
    return -1;
  }
  if (tab.host !== job.host) return -1;
  const path = trimSlash(job.pathname);
  const tabPath = trimSlash(tab.pathname);
  if (tabPath !== path && !tabPath.startsWith(`${path}/`)) return -1;

  let shared = 0;
  for (const [key, value] of job.searchParams) {
    if (TRACKING_KEY.test(key) || !tab.searchParams.has(key)) continue;
    if (tab.searchParams.get(key) !== value) return -1;
    shared++;
  }
  // A careers site's home page names no job.
  if (!path && !shared) return -1;
  return path.length + shared;
}

/**
 * The application whose saved job link names the tab's page. Applications come
 * newest first, so the newest of several saved with one link wins. Different
 * links that match equally well leave the page ambiguous, so none is picked.
 */
export function matchApplication(
  tabUrl: string,
  applications: SavedApplication[],
): string | undefined {
  let tab: URL;
  try {
    tab = new URL(tabUrl);
  } catch {
    return undefined;
  }
  let best: SavedApplication | undefined;
  let bestScore = -1;
  let ambiguous = false;
  for (const application of applications) {
    if (!application.jobUrl) continue;
    const current = score(tab, application.jobUrl);
    if (current > bestScore) {
      best = application;
      bestScore = current;
      ambiguous = false;
    } else if (
      current !== -1 &&
      current === bestScore &&
      application.jobUrl !== best?.jobUrl
    ) {
      ambiguous = true;
    }
  }
  return ambiguous ? undefined : best?.id;
}
