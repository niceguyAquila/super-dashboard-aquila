import { notFound } from "next/navigation";
import { getBrandBySlug } from "@/lib/actions/brands";
import { getAdEntries } from "@/lib/actions/ads";
import { AdsDashboard } from "@/components/ads/ads-dashboard";

type PageProps = {
  params: Promise<{ brandSlug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function AdsPage({ params, searchParams }: PageProps) {
  const { brandSlug } = await params;
  const { from, to } = await searchParams;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const entries = await getAdEntries(brand.id, from, to);

  return (
    <AdsDashboard
      brand={brand}
      entries={entries}
      initialFrom={from}
      initialTo={to}
    />
  );
}
