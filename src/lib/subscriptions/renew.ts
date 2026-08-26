import type { BillingCycle } from "@/lib/types";

function startOfTodayUtc(today?: Date): Date {
  const now = today ?? new Date();
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

function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Last day of month for UTC year/month (month is 0-indexed). */
function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInUtcMonth(targetYear, normalizedMonth));
  return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay));
}

/**
 * Next renew date after marking renewed.
 * Base = later of current renews_at and today; then +1 month or +1 year.
 */
export function nextRenewalDate(
  renewsAt: string | null,
  billingCycle: BillingCycle,
  today?: Date,
): { date: string } | { error: string } {
  if (billingCycle === "one_time") {
    return {
      error: "One-time subscriptions have no renewal period",
    };
  }

  const todayUtc = startOfTodayUtc(today);
  const current = renewsAt ? parseDateOnly(renewsAt) : null;
  const base =
    current && current.getTime() > todayUtc.getTime() ? current : todayUtc;

  const next =
    billingCycle === "yearly"
      ? addCalendarMonths(base, 12)
      : addCalendarMonths(base, 1);

  return { date: formatDateOnly(next) };
}
