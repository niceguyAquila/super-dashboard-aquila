import { notFound } from "next/navigation";
import { getBrandBySlug } from "@/lib/actions/brands";
import { getAdEntries } from "@/lib/actions/ads";
import { getAdPlatforms } from "@/lib/actions/ad-platforms";
import { AdsDashboard } from "@/components/ads/ads-dashboard";

type PageProps = {
  params: Promise<{ brandSlug: string }>;
  searchParams: Promise<{ from?: string; to?: string; platform?: string }>;
};

export default async function AdsPage({ params, searchParams }: PageProps) {
  const { brandSlug } = await params;
  const { from, to, platform } = await searchParams;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const [platforms, entries] = await Promise.all([
    getAdPlatforms(brand.id),
    getAdEntries(brand.id, from, to, platform || undefined),
  ]);

  return (
    <AdsDashboard
      brand={brand}
      platforms={platforms}
      entries={entries}
      initialFrom={from}
      initialTo={to}
      initialPlatformId={platform}
    />
  );
}
