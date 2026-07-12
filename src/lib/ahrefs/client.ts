const AHREFS_BASE = "https://api.ahrefs.com/v3/site-explorer";

const LIST_LIMIT = 50;

type AhrefsMetricsResult = {
  domain_rating: number | null;
  url_rating: number | null;
  backlinks: number | null;
  refdomains: number | null;
  organic_keywords: number | null;
  organic_keywords_top3: number | null;
  organic_traffic: number | null;
  /** Estimated organic traffic value in USD cents */
  organic_cost: number | null;
  paid_keywords: number | null;
  paid_traffic: number | null;
  paid_pages: number | null;
  /** Estimated paid traffic cost in USD cents */
  paid_cost: number | null;
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
  is_spam: boolean | null;
  link_type: string | null;
  traffic: number | null;
  first_seen: string | null;
  last_seen: string | null;
};

type AhrefsRefdomainRow = {
  refdomain: string;
  domain_rating: number | null;
  links_to_target: number | null;
  dofollow_links: number | null;
  traffic_domain: number | null;
  is_spam: boolean | null;
  first_seen: string | null;
  last_seen: string | null;
};

type AhrefsOrganicKeywordRow = {
  keyword: string;
  best_position: number | null;
  volume: number | null;
  traffic: number | null;
  keyword_difficulty: number | null;
  ranking_url: string | null;
};

type AhrefsTopPageRow = {
  url: string;
  traffic: number | null;
  keywords: number | null;
  top_keyword: string | null;
  top_keyword_volume: number | null;
  referring_domains: number | null;
  url_rating: number | null;
  traffic_value: number | null;
};

export type AhrefsDomainPayload = {
  metrics: AhrefsMetricsResult;
  anchors: AhrefsAnchorRow[];
  backlinks: AhrefsBacklinkRow[];
  refdomains: AhrefsRefdomainRow[];
  organicKeywords: AhrefsOrganicKeywordRow[];
  topPages: AhrefsTopPageRow[];
};

function getToken(): string {
  const raw = process.env.AHREFS_API_TOKEN ?? "";
  const token = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .split(/\s+/)
    .filter(Boolean)[0];

  if (!token) {
    throw new Error(
      "AHREFS_API_TOKEN is not configured in Vercel environment variables",
    );
  }
  return token;
}

function candidateDates(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function toDate(value?: string | null): string | null {
  return value?.slice(0, 10) ?? null;
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
      metrics?: {
        org_keywords?: number;
        org_keywords_1_3?: number;
        org_traffic?: number;
        org_cost?: number | null;
        paid_keywords?: number;
        paid_traffic?: number;
        paid_pages?: number;
        paid_cost?: number | null;
      };
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
    organic_keywords_top3: organic.metrics?.org_keywords_1_3 ?? null,
    organic_traffic: organic.metrics?.org_traffic ?? null,
    organic_cost: organic.metrics?.org_cost ?? null,
    paid_keywords: organic.metrics?.paid_keywords ?? null,
    paid_traffic: organic.metrics?.paid_traffic ?? null,
    paid_pages: organic.metrics?.paid_pages ?? null,
    paid_cost: organic.metrics?.paid_cost ?? null,
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
    limit: LIST_LIMIT,
    order_by: "links_to_target:desc",
    select: "anchor,links_to_target,refdomains,first_seen,last_seen",
  });

  return (data.anchors ?? [])
    .filter((row) => row.anchor)
    .map((row) => ({
      anchor: row.anchor!,
      backlinks: row.links_to_target ?? null,
      refdomains: row.refdomains ?? null,
      first_seen: toDate(row.first_seen),
      last_seen: toDate(row.last_seen),
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
      is_spam?: boolean;
      link_type?: string;
      traffic?: number;
      first_seen?: string;
      last_seen?: string | null;
    }>;
  }>("/all-backlinks", {
    target,
    mode: "subdomains",
    history: "live",
    limit: LIST_LIMIT,
    order_by: "domain_rating_source:desc",
    select:
      "url_from,url_to,anchor,domain_rating_source,url_rating_source,is_dofollow,is_spam,link_type,traffic,first_seen,last_seen",
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
      is_spam: row.is_spam ?? null,
      link_type: row.link_type ?? null,
      traffic: row.traffic ?? null,
      first_seen: toDate(row.first_seen),
      last_seen: toDate(row.last_seen),
    }));
}

async function fetchRefdomains(target: string): Promise<AhrefsRefdomainRow[]> {
  const data = await ahrefsGet<{
    refdomains?: Array<{
      domain?: string;
      domain_rating?: number;
      links_to_target?: number;
      dofollow_links?: number;
      traffic_domain?: number;
      is_spam?: boolean;
      first_seen?: string;
      last_seen?: string | null;
    }>;
  }>("/refdomains", {
    target,
    mode: "subdomains",
    history: "live",
    limit: LIST_LIMIT,
    order_by: "domain_rating:desc",
    select:
      "domain,domain_rating,links_to_target,dofollow_links,traffic_domain,is_spam,first_seen,last_seen",
  });

  return (data.refdomains ?? [])
    .filter((row) => row.domain)
    .map((row) => ({
      refdomain: row.domain!,
      domain_rating: row.domain_rating ?? null,
      links_to_target: row.links_to_target ?? null,
      dofollow_links: row.dofollow_links ?? null,
      traffic_domain: row.traffic_domain ?? null,
      is_spam: row.is_spam ?? null,
      first_seen: toDate(row.first_seen),
      last_seen: toDate(row.last_seen),
    }));
}

async function fetchOrganicKeywords(
  target: string,
): Promise<AhrefsOrganicKeywordRow[]> {
  const data = await ahrefsGetWithDateFallback<{
    keywords?: Array<{
      keyword?: string | null;
      best_position?: number | null;
      volume?: number | null;
      sum_traffic?: number | null;
      keyword_difficulty?: number | null;
      best_position_url?: string | null;
    }>;
  }>("/organic-keywords", {
    target,
    mode: "subdomains",
    limit: LIST_LIMIT,
    order_by: "sum_traffic:desc",
    select:
      "keyword,best_position,volume,sum_traffic,keyword_difficulty,best_position_url",
  });

  return (data.keywords ?? [])
    .filter((row) => row.keyword)
    .map((row) => ({
      keyword: row.keyword!,
      best_position: row.best_position ?? null,
      volume: row.volume ?? null,
      traffic: row.sum_traffic ?? null,
      keyword_difficulty: row.keyword_difficulty ?? null,
      ranking_url: row.best_position_url ?? null,
    }));
}

async function fetchTopPages(target: string): Promise<AhrefsTopPageRow[]> {
  const data = await ahrefsGetWithDateFallback<{
    pages?: Array<{
      url?: string | null;
      sum_traffic?: number | null;
      keywords?: number | null;
      top_keyword?: string | null;
      top_keyword_volume?: number | null;
      referring_domains?: number | null;
      ur?: number | null;
      value?: number | null;
    }>;
  }>("/top-pages", {
    target,
    mode: "subdomains",
    limit: LIST_LIMIT,
    order_by: "sum_traffic:desc",
    select:
      "url,sum_traffic,keywords,top_keyword,top_keyword_volume,referring_domains,ur,value",
  });

  return (data.pages ?? [])
    .filter((row) => row.url)
    .map((row) => ({
      url: row.url!,
      traffic: row.sum_traffic ?? null,
      keywords: row.keywords ?? null,
      top_keyword: row.top_keyword ?? null,
      top_keyword_volume: row.top_keyword_volume ?? null,
      referring_domains: row.referring_domains ?? null,
      url_rating: row.ur ?? null,
      traffic_value: row.value ?? null,
    }));
}

export async function fetchAhrefsForDomain(
  hostname: string,
): Promise<AhrefsDomainPayload> {
  const target = hostname.replace(/^www\./, "").trim();
  if (!target) {
    throw new Error("Domain hostname is empty");
  }

  const metrics = await fetchMetrics(target);

  const [anchors, backlinks, refdomains, organicKeywords, topPages] =
    await Promise.all([
      fetchAnchors(target).catch((err) => {
        console.error("[ahrefs] anchors failed", target, err);
        return [] as AhrefsAnchorRow[];
      }),
      fetchBacklinks(target).catch((err) => {
        console.error("[ahrefs] backlinks failed", target, err);
        return [] as AhrefsBacklinkRow[];
      }),
      fetchRefdomains(target).catch((err) => {
        console.error("[ahrefs] refdomains failed", target, err);
        return [] as AhrefsRefdomainRow[];
      }),
      fetchOrganicKeywords(target).catch((err) => {
        console.error("[ahrefs] organic-keywords failed", target, err);
        return [] as AhrefsOrganicKeywordRow[];
      }),
      fetchTopPages(target).catch((err) => {
        console.error("[ahrefs] top-pages failed", target, err);
        return [] as AhrefsTopPageRow[];
      }),
    ]);

  return {
    metrics,
    anchors,
    backlinks,
    refdomains,
    organicKeywords,
    topPages,
  };
}
