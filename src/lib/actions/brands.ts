"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/format";

export async function createBrand(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Brand name is required" };
  }

  const supabase = await createClient();
  let slug = slugify(name);
  if (!slug) slug = `brand-${Date.now()}`;

  // Ensure unique slug
  const { data: existing } = await supabase
    .from("brands")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({ name, slug })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/settings/brands");
  return { data };
}

export async function updateBrand(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Invalid brand" };

  const supabase = await createClient();
  const { error } = await supabase.from("brands").update({ name }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/settings/brands");
  return { ok: true };
}

export async function deleteBrand(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Invalid brand" };

  const supabase = await createClient();
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/settings/brands");
  return { ok: true };
}

export async function getBrands() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBrandBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
