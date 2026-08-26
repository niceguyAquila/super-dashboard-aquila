import type { Subscription, SubscriptionSummary } from "@/lib/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RENEWAL_SOON_DAYS = 30;

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

export function monthlyCostOf(sub: Subscription): number {
  if (sub.cost == null || Number.isNaN(Number(sub.cost))) return 0;
  const cost = Number(sub.cost);
  if (sub.billing_cycle === "monthly") return cost;
  if (sub.billing_cycle === "yearly") return cost / 12;
  return 0;
}

export function summarizeSubscriptions(
  subscriptions: Subscription[],
): SubscriptionSummary {
  const today = startOfTodayUtc();
  const soonCutoff = new Date(today.getTime() + RENEWAL_SOON_DAYS * MS_PER_DAY);

  let monthlyFee = 0;
  let activeTools = 0;
  let activeServers = 0;
  let renewingSoon = 0;
  let pastDue = 0;

  for (const sub of subscriptions) {
    if (sub.status !== "active") continue;

    monthlyFee += monthlyCostOf(sub);
    if (sub.kind === "tool") activeTools += 1;
    else if (sub.kind === "server") activeServers += 1;

    if (!sub.renews_at) continue;
    const renewsAt = parseDateOnly(sub.renews_at);
    if (!renewsAt) continue;

    if (renewsAt < today) pastDue += 1;
    else if (renewsAt <= soonCutoff) renewingSoon += 1;
  }

  return {
    monthlyFee,
    activeTools,
    activeServers,
    totalActive: activeTools + activeServers,
    renewingSoon,
    pastDue,
  };
}

export function renewalUrgency(
  renewsAt: string | null,
  status: Subscription["status"],
): "past_due" | "soon" | null {
  if (status !== "active" || !renewsAt) return null;
  const date = parseDateOnly(renewsAt);
  if (!date) return null;
  const today = startOfTodayUtc();
  if (date < today) return "past_due";
  const soonCutoff = new Date(today.getTime() + RENEWAL_SOON_DAYS * MS_PER_DAY);
  if (date <= soonCutoff) return "soon";
  return null;
}
