"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function upsertAdEntry(formData: FormData) {
  const brandId = String(formData.get("brandId") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const platformId = String(formData.get("platformId") ?? "");
  const entryDate = String(formData.get("entryDate") ?? "");
  const spend = Number(formData.get("spend") ?? 0);
  const registrations = Number(formData.get("registrations") ?? 0);
  const deposits = Number(formData.get("deposits") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const id = String(formData.get("id") ?? "");

  if (!brandId || !entryDate || !platformId) {
    return { error: "Brand, platform, and date are required" };
  }

  const supabase = await createClient();

  const { data: platform, error: platformError } = await supabase
    .from("ad_platforms")
    .select("id, brand_id, is_active")
    .eq("id", platformId)
    .maybeSingle();

  if (platformError) return { error: platformError.message };
  if (!platform || platform.brand_id !== brandId) {
    return { error: "Platform not found for this brand" };
  }

  if (id) {
    const { error } = await supabase
      .from("ad_entries")
      .update({
        platform_id: platformId,
        entry_date: entryDate,
        spend,
        registrations,
        deposits,
        notes,
      })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    if (!platform.is_active) {
      return { error: "Cannot add entries for an inactive platform" };
    }
    const { error } = await supabase.from("ad_entries").upsert(
      {
        brand_id: brandId,
        platform_id: platformId,
        entry_date: entryDate,
        spend,
        registrations,
        deposits,
        notes,
      },
      { onConflict: "platform_id,entry_date" },
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/${brandSlug}/ads`);
  return { ok: true };
}

export async function deleteAdEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  if (!id) return { error: "Invalid entry" };

  const supabase = await createClient();
  const { error } = await supabase.from("ad_entries").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/ads`);
  return { ok: true };
}

export async function getAdEntries(
  brandId: string,
  from?: string,
  to?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("ad_entries")
    .select("*, ad_platforms(name, is_active)")
    .eq("brand_id", brandId)
    .order("entry_date", { ascending: false });

  if (from) query = query.gte("entry_date", from);
  if (to) query = query.lte("entry_date", to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
