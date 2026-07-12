import { notFound } from "next/navigation";
import { getBrandBySlug, getBrands } from "@/lib/actions/brands";
import { getDomainsForBrand } from "@/lib/actions/domains";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { DomainsInventory } from "@/components/domains/domains-inventory";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ brandSlug: string }>;
};

export default async function DomainsPage({ params }: PageProps) {
  const { brandSlug } = await params;

  if (!brandSlug?.trim()) notFound();

  const [brands, brand, profile] = await Promise.all([
    getBrands(),
    getBrandBySlug(brandSlug),
    getCurrentProfile(),
  ]);

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

  return (
    <AppShell brands={brands} activeBrand={brand} profile={profile}>
      <DomainsInventory brand={brand} domains={domains ?? []} />
    </AppShell>
  );
}
