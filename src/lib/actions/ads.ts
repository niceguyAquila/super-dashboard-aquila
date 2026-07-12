"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function upsertAdEntry(formData: FormData) {
  const brandId = String(formData.get("brandId") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const entryDate = String(formData.get("entryDate") ?? "");
  const spend = Number(formData.get("spend") ?? 0);
  const registrations = Number(formData.get("registrations") ?? 0);
  const deposits = Number(formData.get("deposits") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const id = String(formData.get("id") ?? "");

  if (!brandId || !entryDate) {
    return { error: "Brand and date are required" };
  }

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase
      .from("ad_entries")
      .update({
        entry_date: entryDate,
        spend,
        registrations,
        deposits,
        notes,
      })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("ad_entries").upsert(
      {
        brand_id: brandId,
        entry_date: entryDate,
        spend,
        registrations,
        deposits,
        notes,
      },
      { onConflict: "brand_id,entry_date" },
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
    .select("*")
    .eq("brand_id", brandId)
    .order("entry_date", { ascending: false });

  if (from) query = query.gte("entry_date", from);
  if (to) query = query.lte("entry_date", to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
