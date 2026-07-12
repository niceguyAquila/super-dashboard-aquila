import { notFound } from "next/navigation";
import { getBrandBySlug } from "@/lib/actions/brands";
import { getSocialSignals } from "@/lib/actions/social";
import { SocialInventory } from "@/components/social/social-inventory";

type PageProps = {
  params: Promise<{ brandSlug: string }>;
};

export default async function SocialPage({ params }: PageProps) {
  const { brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const signals = await getSocialSignals(brand.id);

  return <SocialInventory brand={brand} signals={signals} />;
}
