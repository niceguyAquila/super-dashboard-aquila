import { createServiceClient } from "@/lib/supabase/admin";
import { fetchAhrefsForDomain } from "@/lib/ahrefs/client";

export type SyncResult = {
  domainId: string;
  hostname: string;
  ok: boolean;
  error?: string;
};

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
        organic_traffic: payload.metrics.organic_traffic,
        fetched_at: now,
      });

    if (metricsError) throw new Error(metricsError.message);

    await supabase.from("domain_anchors").delete().eq("domain_id", domain.id);
    if (payload.anchors.length) {
      const { error: anchorsError } = await supabase.from("domain_anchors").insert(
        payload.anchors.map((row) => ({
          domain_id: domain.id,
          anchor: row.anchor,
          backlinks: row.backlinks,
          refdomains: row.refdomains,
          first_seen: row.first_seen,
          last_seen: row.last_seen,
        })),
      );
      if (anchorsError) throw new Error(anchorsError.message);
    }

    await supabase.from("domain_backlinks").delete().eq("domain_id", domain.id);
    if (payload.backlinks.length) {
      const { error: backlinksError } = await supabase
        .from("domain_backlinks")
        .insert(
          payload.backlinks.map((row) => ({
            domain_id: domain.id,
            url_from: row.url_from,
            url_to: row.url_to,
            anchor: row.anchor,
            domain_rating_source: row.domain_rating_source,
            url_rating_source: row.url_rating_source,
            is_dofollow: row.is_dofollow,
            first_seen: row.first_seen,
            last_seen: row.last_seen,
          })),
        );
      if (backlinksError) throw new Error(backlinksError.message);
    }

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
    // Small delay to be gentle on Ahrefs rate limits
    await new Promise((r) => setTimeout(r, 400));
  }
  return results;
}
