"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  BillingCycle,
  SubscriptionKind,
  SubscriptionStatus,
} from "@/lib/types";

const KINDS = new Set<SubscriptionKind>(["tool", "server"]);
const CYCLES = new Set<BillingCycle>(["monthly", "yearly", "one_time"]);
const STATUSES = new Set<SubscriptionStatus>([
  "active",
  "cancelled",
  "expired",
]);

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalNumber(raw: string): number | null | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return { error: "Cost must be a valid number" };
  return n;
}

function parseSubscriptionFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" as const };

  const kind = String(formData.get("kind") ?? "") as SubscriptionKind;
  if (!KINDS.has(kind)) return { error: "Kind must be tool or server" as const };

  const billingCycle = String(
    formData.get("billing_cycle") ?? "monthly",
  ) as BillingCycle;
  if (!CYCLES.has(billingCycle)) {
    return { error: "Invalid billing cycle" as const };
  }

  const status = String(
    formData.get("status") ?? "active",
  ) as SubscriptionStatus;
  if (!STATUSES.has(status)) return { error: "Invalid status" as const };

  const costResult = parseOptionalNumber(String(formData.get("cost") ?? ""));
  if (costResult && typeof costResult === "object" && "error" in costResult) {
    return costResult;
  }

  const currency =
    emptyToNull(String(formData.get("currency") ?? "")) ?? "USD";

  let loginUrl = emptyToNull(String(formData.get("login_url") ?? ""));
  if (loginUrl) {
    const withProtocol = /^https?:\/\//i.test(loginUrl)
      ? loginUrl
      : `https://${loginUrl}`;
    try {
      loginUrl = new URL(withProtocol).toString();
    } catch {
      return { error: "Invalid login URL" as const };
    }
  }

  return {
    name,
    kind,
    vendor: emptyToNull(String(formData.get("vendor") ?? "")),
    cost: costResult as number | null,
    currency,
    billing_cycle: billingCycle,
    started_at: emptyToNull(String(formData.get("started_at") ?? "")),
    renews_at: emptyToNull(String(formData.get("renews_at") ?? "")),
    status,
    login_url: loginUrl,
    notes: emptyToNull(String(formData.get("notes") ?? "")),
  };
}

export async function getSubscriptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("renews_at", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSubscription(formData: FormData) {
  const parsed = parseSubscriptionFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert(parsed)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/settings/subscriptions");
  return { data };
}

export async function updateSubscription(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Invalid subscription" };

  const parsed = parseSubscriptionFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update(parsed)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings/subscriptions");
  return { ok: true };
}

export async function deleteSubscription(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Invalid subscription" };

  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings/subscriptions");
  return { ok: true };
}
