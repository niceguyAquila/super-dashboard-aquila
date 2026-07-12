"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getAdPlatforms(brandId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ad_platforms")
    .select("*")
    .eq("brand_id", brandId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAdPlatform(formData: FormData) {
  const brandId = String(formData.get("brandId") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!brandId || !name) {
    return { error: "Brand and platform name are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ad_platforms").insert({
    brand_id: brandId,
    name,
    is_active: true,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "A platform with that name already exists" };
    }
    return { error: error.message };
  }

  revalidatePath(`/${brandSlug}/ads`);
  return { ok: true };
}

export async function updateAdPlatform(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  const nameRaw = formData.get("name");
  const isActiveRaw = formData.get("isActive");

  if (!id) return { error: "Invalid platform" };

  const updates: { name?: string; is_active?: boolean } = {};
  if (nameRaw != null) {
    const name = String(nameRaw).trim();
    if (!name) return { error: "Platform name is required" };
    updates.name = name;
  }
  if (isActiveRaw != null) {
    updates.is_active = String(isActiveRaw) === "true";
  }
  if (Object.keys(updates).length === 0) {
    return { error: "Nothing to update" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ad_platforms")
    .update(updates)
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { error: "A platform with that name already exists" };
    }
    return { error: error.message };
  }

  revalidatePath(`/${brandSlug}/ads`);
  return { ok: true };
}

export async function deleteAdPlatform(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const brandSlug = String(formData.get("brandSlug") ?? "");
  if (!id) return { error: "Invalid platform" };

  const supabase = await createClient();
  const { error } = await supabase.from("ad_platforms").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/${brandSlug}/ads`);
  return { ok: true };
}
