import { notFound } from "next/navigation";
import { getBrandBySlug, getBrands } from "@/lib/actions/brands";
import { getDomainsForBrand } from "@/lib/actions/domains";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { DomainsInventory } from "@/components/domains/domains-inventory";

type PageProps = {
  params: Promise<{ brandSlug: string }>;
};

export default async function DomainsPage({ params }: PageProps) {
  const { brandSlug } = await params;
  const [brands, brand, profile] = await Promise.all([
    getBrands(),
    getBrandBySlug(brandSlug),
    getCurrentProfile(),
  ]);

  if (!brand) notFound();

  const domains = await getDomainsForBrand(brand.id);

  return (
    <AppShell brands={brands} activeBrand={brand} profile={profile}>
      <DomainsInventory brand={brand} domains={domains} />
    </AppShell>
  );
}
