import { notFound } from "next/navigation";
import { getBrandBySlug } from "@/lib/actions/brands";
import { getDomainsForBrand } from "@/lib/actions/domains";
import { DomainsInventory } from "@/components/domains/domains-inventory";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ brandSlug: string }>;
};

export default async function DomainsPage({ params }: PageProps) {
  const { brandSlug } = await params;

  if (!brandSlug?.trim()) notFound();

  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  let domains;
  try {
    domains = await getDomainsForBrand(brand.id);
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? err.message
        : "Failed to load domain inventory for this brand.",
    );
  }

  return <DomainsInventory brand={brand} domains={domains ?? []} />;
}
