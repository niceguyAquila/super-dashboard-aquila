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
  const token = process.env.AHREFS_API_TOKEN;
  if (!token) {
    throw new Error("AHREFS_API_TOKEN is not configured");
  }
  return token;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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
    throw new Error(`Ahrefs ${path} failed (${res.status}): ${body.slice(0, 400)}`);
  }

  return res.json() as Promise<T>;
}

type OverviewResponse = {
  metrics?: {
    domain_rating?: number;
    url_rating?: number;
    org_keywords?: number;
    org_traffic?: number;
  };
};

type BacklinksStatsResponse = {
  metrics?: {
    live?: number;
    live_refdomains?: number;
  };
};

async function fetchMetrics(target: string): Promise<AhrefsMetricsResult> {
  const date = todayIsoDate();

  const overviewPromise = ahrefsGet<OverviewResponse>("/overview", {
    target,
    date,
    mode: "domain",
    select: "domain_rating,url_rating,org_keywords,org_traffic",
  }).catch((): OverviewResponse => ({ metrics: undefined }));

  const backlinksStatsPromise = ahrefsGet<BacklinksStatsResponse>(
    "/backlinks-stats",
    {
      target,
      date,
      mode: "domain",
    },
  );

  const [overview, backlinksStats] = await Promise.all([
    overviewPromise,
    backlinksStatsPromise,
  ]);

  return {
    domain_rating: overview.metrics?.domain_rating ?? null,
    url_rating: overview.metrics?.url_rating ?? null,
    backlinks: backlinksStats.metrics?.live ?? null,
    refdomains: backlinksStats.metrics?.live_refdomains ?? null,
    organic_keywords: overview.metrics?.org_keywords ?? null,
    organic_traffic: overview.metrics?.org_traffic ?? null,
  };
}

async function fetchAnchors(target: string): Promise<AhrefsAnchorRow[]> {
  const data = await ahrefsGet<{
    anchors?: Array<{
      anchor?: string;
      links_to_target?: number;
      refdomains?: number;
      first_seen?: string;
      last_seen?: string;
    }>;
  }>("/anchors", {
    target,
    mode: "domain",
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
      first_seen: row.first_seen ?? null,
      last_seen: row.last_seen ?? null,
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
      last_seen?: string;
    }>;
  }>("/all-backlinks", {
    target,
    mode: "domain",
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
      first_seen: row.first_seen ?? null,
      last_seen: row.last_seen ?? null,
    }));
}

export async function fetchAhrefsForDomain(
  hostname: string,
): Promise<AhrefsDomainPayload> {
  const target = hostname.replace(/^www\./, "");
  const [metrics, anchors, backlinks] = await Promise.all([
    fetchMetrics(target),
    fetchAnchors(target),
    fetchBacklinks(target),
  ]);

  return { metrics, anchors, backlinks };
}
