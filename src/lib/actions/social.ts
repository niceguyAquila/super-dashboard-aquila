"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  const url = String(formData.get("url") ?? "").trim();

  if (!brandId || !label || !url) {
    return { error: "Label and URL are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("brand_social_signals").insert({
    brand_id: brandId,
    label,
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
        "No valid rows found. Use one per line: Label,URL or Label | URL or just a URL.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("brand_social_signals").insert(
    rows.map((row) => ({
      brand_id: brandId,
      label: row.label,
      url: row.url,
    })),
  );

  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/social`);
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
