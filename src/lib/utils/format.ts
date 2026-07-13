export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

/** Normalize a landing page URL; empty → null. Invalid → throws. */
export function normalizeLandingPageUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname || !url.hostname.includes(".")) {
      throw new Error("Invalid landing page URL");
    }
    return url.toString();
  } catch {
    throw new Error("Invalid landing page URL");
  }
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Ahrefs traffic value / cost fields are returned in USD cents. */
export function formatAhrefsCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  return formatCurrency(cents / 100);
}

export function computeCpr(spend: number, registrations: number): number | null {
  if (!registrations) return null;
  return spend / registrations;
}

export function formatCpr(spend: number, registrations: number): string {
  const cpr = computeCpr(spend, registrations);
  if (cpr == null) return "—";
  return formatCurrency(cpr);
}
