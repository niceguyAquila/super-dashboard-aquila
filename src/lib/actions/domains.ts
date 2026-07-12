"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeHostname } from "@/lib/utils/format";

export async function createDomain(formData: FormData) {
  const brandId = String(formData.get("brandId") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const hostname = normalizeHostname(String(formData.get("hostname") ?? ""));
  const title = String(formData.get("title") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!brandId || !hostname) {
    return { error: "Brand and hostname are required" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("domains")
    .insert({ brand_id: brandId, hostname, title, notes })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/domains`);
  return { data };
}

export async function updateDomain(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const hostnameRaw = formData.get("hostname");
  const hostname =
    hostnameRaw != null
      ? normalizeHostname(String(hostnameRaw))
      : undefined;

  if (!id) return { error: "Invalid domain" };

  const supabase = await createClient();
  const payload: Record<string, string | null> = { title, notes };
  if (hostname) payload.hostname = hostname;

  const { error } = await supabase.from("domains").update(payload).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/domains`);
  revalidatePath(`/${brandSlug}/domains/${id}`);
  return { ok: true };
}

export async function deleteDomain(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  if (!id) return { error: "Invalid domain" };

  const supabase = await createClient();
  const { error } = await supabase.from("domains").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/domains`);
  return { ok: true };
}

export async function addSocialSignal(formData: FormData) {
  const domainId = String(formData.get("domainId") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  if (!domainId || !label || !url) {
    return { error: "Label and URL are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("domain_social_signals").insert({
    domain_id: domainId,
    label,
    url,
  });

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/domains/${domainId}`);
  revalidatePath(`/${brandSlug}/domains`);
  return { ok: true };
}

export async function bulkImportSocialSignals(formData: FormData) {
  const domainId = String(formData.get("domainId") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const raw = String(formData.get("bulkText") ?? "");

  if (!domainId) return { error: "Invalid domain" };

  const rows = parseSocialSignalBulk(raw);
  if (rows.length === 0) {
    return {
      error:
        "No valid rows found. Use one per line: Label,URL or Label | URL or just a URL.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("domain_social_signals").insert(
    rows.map((row) => ({
      domain_id: domainId,
      label: row.label,
      url: row.url,
    })),
  );

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/domains/${domainId}`);
  revalidatePath(`/${brandSlug}/domains`);
  return { ok: true, imported: rows.length };
}

function parseSocialSignalBulk(
  raw: string,
): Array<{ label: string; url: string }> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const rows: Array<{ label: string; url: string }> = [];

  for (const line of lines) {
    let label = "";
    let url = "";

    if (line.includes("|")) {
      const [left, ...rest] = line.split("|");
      label = left.trim();
      url = rest.join("|").trim();
    } else if (line.includes(",")) {
      const idx = line.indexOf(",");
      label = line.slice(0, idx).trim();
      url = line.slice(idx + 1).trim();
    } else if (line.includes("\t")) {
      const [left, ...rest] = line.split("\t");
      label = left.trim();
      url = rest.join("\t").trim();
    } else if (/^https?:\/\//i.test(line)) {
      url = line;
      try {
        const host = new URL(line).hostname.replace(/^www\./, "");
        label = host.split(".")[0] || "Link";
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } catch {
        label = "Link";
      }
    } else {
      continue;
    }

    url = url.replace(/^<|>$/g, "").trim();
    if (!label || !url) continue;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    rows.push({ label, url });
  }

  return rows;
}

export async function deleteSocialSignal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const domainId = String(formData.get("domainId") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  if (!id) return { error: "Invalid signal" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("domain_social_signals")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/domains/${domainId}`);
  revalidatePath(`/${brandSlug}/domains`);
  return { ok: true };
}

export async function getDomainsForBrand(brandId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("domains")
    .select(
      `
      *,
      domain_ahrefs_metrics (*),
      domain_social_signals (id)
    `,
    )
    .eq("brand_id", brandId)
    .order("hostname");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDomainDetail(domainId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("domains")
    .select(
      `
      *,
      domain_ahrefs_metrics (*),
      domain_social_signals (*),
      domain_anchors (*),
      domain_backlinks (*)
    `,
    )
    .eq("id", domainId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
