"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function normalizeUrl(url: string) {
  let normalized = url.replace(/^<|>$/g, "").trim();
  if (!normalized) return "";
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

export async function getSocialSignals(brandId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_social_signals")
    .select("*")
    .eq("brand_id", brandId)
    .order("label");

  if (error) {
    console.error("[social] getSocialSignals failed:", error.message);
    throw new Error(`Failed to load social signals: ${error.message}`);
  }
  return data ?? [];
}

export async function addSocialSignal(formData: FormData) {
  const brandId = String(formData.get("brandId") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const socialLinks = String(formData.get("socialLinks") ?? "").trim();
  const url = normalizeUrl(String(formData.get("url") ?? ""));

  if (!brandId || !label || !socialLinks || !url) {
    return { error: "Label, Social Links, and URL are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("brand_social_signals").insert({
    brand_id: brandId,
    label,
    social_links: socialLinks,
    url,
  });

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/social`);
  return { ok: true };
}

export async function bulkImportSocialSignals(formData: FormData) {
  const brandId = String(formData.get("brandId") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const raw = String(formData.get("bulkText") ?? "");

  if (!brandId) return { error: "Invalid brand" };

  const rows = parseSocialSignalBulk(raw);
  if (rows.length === 0) {
    return {
      error:
        "No valid rows found. Use one per line: Label,Social Links,URL or Label | Social Links | URL.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("brand_social_signals").insert(
    rows.map((row) => ({
      brand_id: brandId,
      label: row.label,
      social_links: row.socialLinks,
      url: row.url,
    })),
  );

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/social`);
  return { ok: true, imported: rows.length };
}

function parseSocialSignalBulk(
  raw: string,
): Array<{ label: string; socialLinks: string; url: string }> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const rows: Array<{ label: string; socialLinks: string; url: string }> = [];

  for (const line of lines) {
    let parts: string[] = [];

    if (line.includes("|")) {
      parts = line.split("|").map((p) => p.trim());
    } else if (line.includes("\t")) {
      parts = line.split("\t").map((p) => p.trim());
    } else if (line.includes(",")) {
      parts = line.split(",").map((p) => p.trim());
    } else {
      continue;
    }

    if (parts.length < 3) continue;

    const label = parts[0] ?? "";
    const socialLinks = parts[1] ?? "";
    const url = normalizeUrl(parts.slice(2).join(","));

    if (!label || !socialLinks || !url) continue;
    rows.push({ label, socialLinks, url });
  }

  return rows;
}

export async function deleteSocialSignal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  if (!id) return { error: "Invalid signal" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_social_signals")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/social`);
  return { ok: true };
}

export async function bulkDeleteSocialSignals(formData: FormData) {
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const rawIds = String(formData.get("ids") ?? "");
  const ids = rawIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) return { error: "No signals selected" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_social_signals")
    .delete()
    .in("id", ids);

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/social`);
  return { ok: true, deleted: ids.length };
}

export async function updateSocialSignal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const socialLinks = String(formData.get("socialLinks") ?? "").trim();
  const url = normalizeUrl(String(formData.get("url") ?? ""));

  if (!id || !label || !socialLinks || !url) {
    return { error: "Label, Social Links, and URL are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_social_signals")
    .update({ label, social_links: socialLinks, url })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/social`);
  return { ok: true };
}
