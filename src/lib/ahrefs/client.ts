const AHREFS_BASE = "https://api.ahrefs.com/v3/site-explorer";

const BACKLINK_LIMIT = 50;
const ANCHOR_LIMIT = 50;

type AhrefsMetricsResult = {
  domain_rating: number | null;
  url_rating: number | null;
  backlinks: number | null;
  refdomains: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
};

type AhrefsAnchorRow = {
  anchor: string;
  backlinks: number | null;
  refdomains: number | null;
  first_seen: string | null;
  last_seen: string | null;
};

type AhrefsBacklinkRow = {
  url_from: string;
  url_to: string | null;
  anchor: string | null;
  domain_rating_source: number | null;
  url_rating_source: number | null;
  is_dofollow: boolean | null;
  first_seen: string | null;
  last_seen: string | null;
};

export type AhrefsDomainPayload = {
  metrics: AhrefsMetricsResult;
  anchors: AhrefsAnchorRow[];
  backlinks: AhrefsBacklinkRow[];
};

function getToken(): string {
  const token = process.env.AHREFS_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "AHREFS_API_TOKEN is not configured in Vercel environment variables",
    );
  }
  return token;
}

/** Ahrefs often has no snapshot for "today" — try recent dates. */
function candidateDates(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function ahrefsGet<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${AHREFS_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Ahrefs ${path} failed (${res.status}): ${body.slice(0, 500)}`,
    );
  }

  return res.json() as Promise<T>;
}

/** Retry date-based endpoints across recent days until one succeeds. */
async function ahrefsGetWithDateFallback<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  let lastError: Error | null = null;
  for (const date of candidateDates()) {
    try {
      return await ahrefsGet<T>(path, { ...params, date });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Try older date if Ahrefs has no data for this day
      if (
        lastError.message.includes("(400)") ||
        lastError.message.includes("(404)")
      ) {
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error(`Ahrefs ${path} failed for all candidate dates`);
}

async function fetchMetrics(target: string): Promise<AhrefsMetricsResult> {
  const base = { target, mode: "subdomains" as const };

  const [domainRating, backlinksStats, organic] = await Promise.all([
    ahrefsGetWithDateFallback<{
      domain_rating?: { domain_rating?: number };
    }>("/domain-rating", base).catch((err) => {
      console.error("[ahrefs] domain-rating failed", err);
      return { domain_rating: undefined };
    }),
    ahrefsGetWithDateFallback<{
      metrics?: { live?: number; live_refdomains?: number };
    }>("/backlinks-stats", base),
    ahrefsGetWithDateFallback<{
      metrics?: { org_keywords?: number; org_traffic?: number };
    }>("/metrics", base).catch((err) => {
      console.error("[ahrefs] metrics failed", err);
      return { metrics: undefined };
    }),
  ]);

  return {
    domain_rating: domainRating.domain_rating?.domain_rating ?? null,
    url_rating: null,
    backlinks: backlinksStats.metrics?.live ?? null,
    refdomains: backlinksStats.metrics?.live_refdomains ?? null,
    organic_keywords: organic.metrics?.org_keywords ?? null,
    organic_traffic: organic.metrics?.org_traffic ?? null,
  };
}

async function fetchAnchors(target: string): Promise<AhrefsAnchorRow[]> {
  const data = await ahrefsGet<{
    anchors?: Array<{
      anchor?: string;
      links_to_target?: number;
      refdomains?: number;
      first_seen?: string;
      last_seen?: string | null;
    }>;
  }>("/anchors", {
    target,
    mode: "subdomains",
    history: "live",
    limit: ANCHOR_LIMIT,
    order_by: "links_to_target:desc",
    select: "anchor,links_to_target,refdomains,first_seen,last_seen",
  });

  return (data.anchors ?? [])
    .filter((row) => row.anchor)
    .map((row) => ({
      anchor: row.anchor!,
      backlinks: row.links_to_target ?? null,
      refdomains: row.refdomains ?? null,
      first_seen: row.first_seen?.slice(0, 10) ?? null,
      last_seen: row.last_seen?.slice(0, 10) ?? null,
    }));
}

async function fetchBacklinks(target: string): Promise<AhrefsBacklinkRow[]> {
  const data = await ahrefsGet<{
    backlinks?: Array<{
      url_from?: string;
      url_to?: string;
      anchor?: string;
      domain_rating_source?: number;
      url_rating_source?: number;
      is_dofollow?: boolean;
      first_seen?: string;
      last_seen?: string | null;
    }>;
  }>("/all-backlinks", {
    target,
    mode: "subdomains",
    history: "live",
    limit: BACKLINK_LIMIT,
    order_by: "domain_rating_source:desc",
    select:
      "url_from,url_to,anchor,domain_rating_source,url_rating_source,is_dofollow,first_seen,last_seen",
  });

  return (data.backlinks ?? [])
    .filter((row) => row.url_from)
    .map((row) => ({
      url_from: row.url_from!,
      url_to: row.url_to ?? null,
      anchor: row.anchor ?? null,
      domain_rating_source: row.domain_rating_source ?? null,
      url_rating_source: row.url_rating_source ?? null,
      is_dofollow: row.is_dofollow ?? null,
      first_seen: row.first_seen?.slice(0, 10) ?? null,
      last_seen: row.last_seen?.slice(0, 10) ?? null,
    }));
}

export async function fetchAhrefsForDomain(
  hostname: string,
): Promise<AhrefsDomainPayload> {
  const target = hostname.replace(/^www\./, "").trim();
  if (!target) {
    throw new Error("Domain hostname is empty");
  }

  // Metrics first (required). Anchors/backlinks are best-effort so one
  // expensive endpoint failure doesn't wipe the whole sync.
  const metrics = await fetchMetrics(target);

  const [anchors, backlinks] = await Promise.all([
    fetchAnchors(target).catch((err) => {
      console.error("[ahrefs] anchors failed", target, err);
      return [] as AhrefsAnchorRow[];
    }),
    fetchBacklinks(target).catch((err) => {
      console.error("[ahrefs] backlinks failed", target, err);
      return [] as AhrefsBacklinkRow[];
    }),
  ]);

  return { metrics, anchors, backlinks };
}
