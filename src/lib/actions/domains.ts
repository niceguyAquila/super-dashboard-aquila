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
