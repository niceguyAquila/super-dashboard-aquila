import { notFound } from "next/navigation";
import { getBrandBySlug, getBrands } from "@/lib/actions/brands";
import { getAdEntries } from "@/lib/actions/ads";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { AdsDashboard } from "@/components/ads/ads-dashboard";

type PageProps = {
  params: Promise<{ brandSlug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function AdsPage({ params, searchParams }: PageProps) {
  const { brandSlug } = await params;
  const { from, to } = await searchParams;
  const [brands, brand, profile] = await Promise.all([
    getBrands(),
    getBrandBySlug(brandSlug),
    getCurrentProfile(),
  ]);

  if (!brand) notFound();

  const entries = await getAdEntries(brand.id, from, to);

  return (
    <AppShell brands={brands} activeBrand={brand} profile={profile}>
      <AdsDashboard
        brand={brand}
        entries={entries}
        initialFrom={from}
        initialTo={to}
      />
    </AppShell>
  );
}
