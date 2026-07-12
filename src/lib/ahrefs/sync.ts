import { createServiceClient } from "@/lib/supabase/admin";
import { fetchAhrefsForDomain } from "@/lib/ahrefs/client";

export type SyncResult = {
  domainId: string;
  hostname: string;
  ok: boolean;
  error?: string;
};

async function replaceRows(
  table: string,
  domainId: string,
  rows: Record<string, unknown>[],
) {
  const supabase = createServiceClient();
  await supabase.from(table).delete().eq("domain_id", domainId);
  if (!rows.length) return;
  const { error } = await supabase.from(table).insert(rows as never);
  if (error) throw new Error(`${table}: ${error.message}`);
}

export async function syncDomainById(domainId: string): Promise<SyncResult> {
  const supabase = createServiceClient();

  const { data: domain, error } = await supabase
    .from("domains")
    .select("id, hostname")
    .eq("id", domainId)
    .single();

  if (error || !domain) {
    return {
      domainId,
      hostname: "unknown",
      ok: false,
      error: error?.message ?? "Domain not found",
    };
  }

  try {
    const payload = await fetchAhrefsForDomain(domain.hostname);
    const now = new Date().toISOString();

    const { error: metricsError } = await supabase
      .from("domain_ahrefs_metrics")
      .upsert({
        domain_id: domain.id,
        domain_rating: payload.metrics.domain_rating,
        url_rating: payload.metrics.url_rating,
        backlinks: payload.metrics.backlinks,
        refdomains: payload.metrics.refdomains,
        organic_keywords: payload.metrics.organic_keywords,
        organic_keywords_top3: payload.metrics.organic_keywords_top3,
        organic_traffic: payload.metrics.organic_traffic,
        organic_cost: payload.metrics.organic_cost,
        paid_keywords: payload.metrics.paid_keywords,
        paid_traffic: payload.metrics.paid_traffic,
        paid_pages: payload.metrics.paid_pages,
        paid_cost: payload.metrics.paid_cost,
        fetched_at: now,
      });

    if (metricsError) throw new Error(metricsError.message);

    await replaceRows(
      "domain_anchors",
      domain.id,
      payload.anchors.map((row) => ({
        domain_id: domain.id,
        anchor: row.anchor,
        backlinks: row.backlinks,
        refdomains: row.refdomains,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
      })),
    );

    await replaceRows(
      "domain_backlinks",
      domain.id,
      payload.backlinks.map((row) => ({
        domain_id: domain.id,
        url_from: row.url_from,
        url_to: row.url_to,
        anchor: row.anchor,
        domain_rating_source: row.domain_rating_source,
        url_rating_source: row.url_rating_source,
        is_dofollow: row.is_dofollow,
        is_spam: row.is_spam,
        link_type: row.link_type,
        traffic: row.traffic,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
      })),
    );

    await replaceRows(
      "domain_refdomains",
      domain.id,
      payload.refdomains.map((row) => ({
        domain_id: domain.id,
        refdomain: row.refdomain,
        domain_rating: row.domain_rating,
        links_to_target: row.links_to_target,
        dofollow_links: row.dofollow_links,
        traffic_domain: row.traffic_domain,
        is_spam: row.is_spam,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
      })),
    );

    await replaceRows(
      "domain_organic_keywords",
      domain.id,
      payload.organicKeywords.map((row) => ({
        domain_id: domain.id,
        keyword: row.keyword,
        best_position: row.best_position,
        volume: row.volume,
        traffic: row.traffic,
        keyword_difficulty: row.keyword_difficulty,
        ranking_url: row.ranking_url,
      })),
    );

    await replaceRows(
      "domain_top_pages",
      domain.id,
      payload.topPages.map((row) => ({
        domain_id: domain.id,
        url: row.url,
        traffic: row.traffic,
        keywords: row.keywords,
        top_keyword: row.top_keyword,
        top_keyword_volume: row.top_keyword_volume,
        referring_domains: row.referring_domains,
        url_rating: row.url_rating,
        traffic_value: row.traffic_value,
      })),
    );

    await supabase
      .from("domains")
      .update({
        ahrefs_last_synced_at: now,
        ahrefs_sync_error: null,
      })
      .eq("id", domain.id);

    return { domainId: domain.id, hostname: domain.hostname, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    console.error(`[ahrefs] sync failed for ${domain.hostname}:`, message);
    await supabase
      .from("domains")
      .update({ ahrefs_sync_error: message })
      .eq("id", domain.id);

    return {
      domainId: domain.id,
      hostname: domain.hostname,
      ok: false,
      error: message,
    };
  }
}

export async function syncDomains(options?: {
  brandId?: string;
  domainId?: string;
}): Promise<SyncResult[]> {
  const supabase = createServiceClient();

  if (options?.domainId) {
    return [await syncDomainById(options.domainId)];
  }

  let query = supabase.from("domains").select("id");
  if (options?.brandId) {
    query = query.eq("brand_id", options.brandId);
  }

  const { data: domains, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const results: SyncResult[] = [];
  for (const domain of domains ?? []) {
    results.push(await syncDomainById(domain.id));
    await new Promise((r) => setTimeout(r, 400));
  }
  return results;
}
